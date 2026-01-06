import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, test_entry, log_chunk } = body;

    // 1. Verify the Build exists (Foreign Key Check)
    const buildExists = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!buildExists) {
      console.error(`❌ Build ID ${build_id} not found in Database.`);
      return NextResponse.json({ error: `Build ID ${build_id} not found.` }, { status: 400 });
    }

    // 2. Utility to clean terminal color codes (ANSI)
    const cleanText = (text: string) => text?.replace(/\u001b\[\d+m/g, '') || '';
    
    // Sanitize incoming error and log chunk
    if (test_entry.error) test_entry.error = cleanText(test_entry.error);
    const sanitizedLog = log_chunk ? cleanText(log_chunk) : null;

    // 3. Start Transaction: Critical for multiple parallel workers
    return await db.transaction(async (tx) => {
      // Find the row for this specific Spec file in this Build
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];
      
      // Identify the specific test using BOTH Title and Project
      const testIndex = updatedTests.findIndex((t) => 
        t.title === test_entry.title && 
        t.project === test_entry.project
      );

      if (testIndex !== -1) {
        // --- UPDATE EXISTING TEST ---
        const existingTest = updatedTests[testIndex];
        
        updatedTests[testIndex] = {
          ...existingTest, // Preserve existing data (like early logs)
          ...test_entry,   // Apply new data (status, duration, error)
          
          // 🔥 PROTECTION: Keep the video URL if it was already saved
          // This prevents a late log update from overwriting a valid URL with null
          video_url: test_entry.video_url || existingTest.video_url || null,
          
          // 🔥 PROTECTION: Maintain the run/retry number
          run_number: test_entry.run_number || existingTest.run_number || 1,

          // 🔥 PROTECTION: Append logs safely
          logs: sanitizedLog 
            ? [...(existingTest.logs || []), sanitizedLog] 
            : (existingTest.logs || [])
        };
      } else {
        // --- INSERT NEW TEST ---
        // Initialize the test object in the array for the first time
        updatedTests.push({
          ...test_entry,
          logs: sanitizedLog ? [sanitizedLog] : []
        });
      }

      // 4. Atomic Upsert
      // This uses the unique constraint on (build_id, spec_file)
      await tx.insert(testResults)
        .values({
          buildId: build_id,
          specFile: spec_file,
          tests: updatedTests,
          executedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [testResults.buildId, testResults.specFile],
          set: { tests: updatedTests },
        });

      return NextResponse.json({ success: true });
    });

  } catch (error: any) {
    console.error("❌ API TRANSACTION ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}