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
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];
      
      const testIndex = updatedTests.findIndex((t) => 
        t.title === test_entry.title && 
        t.project === test_entry.project
      );

      if (testIndex !== -1) {
        // --- UPDATE EXISTING TEST ---
        const existingTest = updatedTests[testIndex];
        
        updatedTests[testIndex] = {
          ...existingTest,
          ...test_entry, 
          
          // 🔥 FIX: Persist Video URL
          // If the incoming test_entry has a null video_url, but the DB already has one, 
          // we KEEP the existing one. This prevents logs from overwriting video links.
          video_url: test_entry.video_url || existingTest.video_url || null,
          
          // 🔥 FIX: Persist Run Number
          run_number: test_entry.run_number || existingTest.run_number || 1,

          // Append logs
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

      // 4. Atomic Upsert
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