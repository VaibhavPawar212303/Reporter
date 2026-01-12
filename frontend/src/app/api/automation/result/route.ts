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

    /**
     * 2. Improved Utility to clean terminal color codes (ANSI)
     * Handles standard colors, extended colors, and formatting codes
     */
    const cleanText = (text: string) => 
      text?.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') || '';
    
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
        
        // Extract existing logs to ensure we don't overwrite them with test_entry.logs
        const currentLogs = Array.isArray(existingTest.logs) ? existingTest.logs : [];
        
        updatedTests[testIndex] = {
          ...existingTest, 
          ...test_entry,   
          
          // PROTECTION: Keep existing video URL if the update is just a log/status change
          video_url: test_entry.video_url || existingTest.video_url || null,
          
          // PROTECTION: Maintain the run/retry number
          run_number: test_entry.run_number || existingTest.run_number || 1,

          // 🔥 ATOMIC LOG APPENDING: 
          // 1. We take existing logs.
          // 2. If a new log_chunk is provided, we add it.
          // 3. We ignore test_entry.logs if it's an empty array (common in start events).
          logs: sanitizedLog 
            ? [...currentLogs, sanitizedLog] 
            : currentLogs
        };
      } else {
        // --- INSERT NEW TEST ---
        updatedTests.push({
          ...test_entry,
          logs: sanitizedLog ? [sanitizedLog] : (test_entry.logs || [])
        });
      }

      // 4. Atomic Upsert back to the database
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