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

    // 2. Improved Utility to clean terminal color codes (ANSI)
    const cleanText = (text: string) => 
      text?.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') || '';
    
    if (test_entry.error) test_entry.error = cleanText(test_entry.error);
    const sanitizedLog = log_chunk ? cleanText(log_chunk) : null;

    // 3. Start Transaction: Critical for 4+ parallel workers
    return await db.transaction(async (tx) => {
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];
      
      /**
       * 🔥 UNIQUE IDENTIFICATION FIX:
       * To track each individual execution (including retries), we find the test using:
       * 1. Title
       * 2. Project (Browser)
       * 3. Run Number (Attempt 1, 2, 3...)
       */
      const testIndex = updatedTests.findIndex((t) => 
        t.title === test_entry.title && 
        t.project === test_entry.project &&
        Number(t.run_number) === Number(test_entry.run_number)
      );

      if (testIndex !== -1) {
        // --- UPDATE EXISTING ATTEMPT ---
        const existingTest = updatedTests[testIndex];
        const currentLogs = Array.isArray(existingTest.logs) ? existingTest.logs : [];
        
        updatedTests[testIndex] = {
          ...existingTest, 
          ...test_entry,   
          
          // 🔥 PROTECTION: Video persistence
          video_url: test_entry.video_url || existingTest.video_url || null,
          
          // 🔥 PROTECTION: Maintain the same run number
          run_number: test_entry.run_number || existingTest.run_number || 1,

          // 🔥 ATOMIC LOG APPENDING: 
          // Always append new chunks to the correct worker's run history
          logs: sanitizedLog 
            ? [...currentLogs, sanitizedLog] 
            : currentLogs
        };
      } else {
        // --- INSERT NEW ATTEMPT ---
        // This triggers when a new worker starts a test OR when a retry (Run 2/3) starts
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