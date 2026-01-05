import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, test_entry, log_chunk } = body;

    // 1. Verify the Build exists
    const buildExists = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!buildExists) {
      return NextResponse.json({ error: `Build ID ${build_id} not found.` }, { status: 400 });
    }

    // 2. Clean ANSI colors from errors and logs
    const cleanText = (text: string) => text?.replace(/\u001b\[\d+m/g, '') || '';
    
    if (test_entry.error) test_entry.error = cleanText(test_entry.error);
    const sanitizedLog = log_chunk ? cleanText(log_chunk) : null;

    // 3. Use a Transaction to handle concurrency (4+ workers) safely
    return await db.transaction(async (tx) => {
      // Find the existing spec row
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];
      
      // 🔥 FIX: Find the test using BOTH Title and Project
      // This prevents Chromium tests from overwriting Firefox tests with the same name
      const testIndex = updatedTests.findIndex((t) => 
        t.title === test_entry.title && 
        t.project === test_entry.project
      );

      if (testIndex !== -1) {
        // --- UPDATE EXISTING TEST ---
        const existingTest = updatedTests[testIndex];
        
        updatedTests[testIndex] = {
          ...existingTest,
          ...test_entry, // Updates status, duration, error, video_url, etc.
          // Append logs if a log_chunk was sent
          logs: sanitizedLog 
            ? [...(existingTest.logs || []), sanitizedLog] 
            : (existingTest.logs || [])
        };
      } else {
        // --- INSERT NEW TEST ---
        updatedTests.push({
          ...test_entry,
          logs: sanitizedLog ? [sanitizedLog] : []
        });
      }

      // 4. Atomic Upsert back to the database
      // The onConflictDoUpdate relies on the unique(build_id, spec_file) constraint in your schema
      await tx.insert(testResults)
        .values({
          buildId: build_id,
          specFile: spec_file,
          tests: updatedTests,
        })
        .onConflictDoUpdate({
          target: [testResults.buildId, testResults.specFile],
          set: { tests: updatedTests },
        });

      return NextResponse.json({ success: true });
    });

  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}