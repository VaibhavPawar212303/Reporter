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
      return NextResponse.json(
        { error: `Build ID ${build_id} not found.` }, 
        { status: 400 }
      );
    }

    // 2. Utility to clean terminal color codes (ANSI)
    // ✅ FIXED: Only cleans strings, safely handles any input
    const cleanText = (text: any): string => {
      if (!text) return '';
      if (typeof text !== 'string') return String(text);
      
      return text.replace(
        /[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, 
        ''
      );
    };

    // 3. ✅ FIXED: Properly sanitize test_entry fields
    if (test_entry) {
      // Clean individual string fields in test_entry
      if (test_entry.title) test_entry.title = cleanText(test_entry.title);
      if (test_entry.file) test_entry.file = cleanText(test_entry.file);
      if (test_entry.project) test_entry.project = cleanText(test_entry.project);
      
      // ✅ CRITICAL FIX: Handle error object properly
      if (test_entry.error && typeof test_entry.error === 'object') {
        test_entry.error = {
          message: cleanText(test_entry.error.message),
          stack: cleanText(test_entry.error.stack),
          location: test_entry.error.location // Keep location as-is
        };
      } else if (test_entry.error) {
        // If error is somehow a string, clean it
        test_entry.error = cleanText(test_entry.error);
      }

      // ✅ Handle attachments if present
      if (test_entry.attachments) {
        if (test_entry.attachments.paths) {
          test_entry.attachments.paths = {
            video: cleanText(test_entry.attachments.paths.video),
            screenshot: cleanText(test_entry.attachments.paths.screenshot),
            trace: cleanText(test_entry.attachments.paths.trace)
          };
        }
      }

      // ✅ Handle steps if present
      if (Array.isArray(test_entry.steps)) {
        //@ts-ignore
        test_entry.steps = test_entry.steps.map(step => ({
          ...step,
          title: cleanText(step.title),
          category: cleanText(step.category),
          status: cleanText(step.status)
        }));
      }
    }

    // Clean log chunk
    const sanitizedLog = log_chunk ? cleanText(log_chunk) : null;

    // 4. Start Transaction: Critical for 4+ parallel workers
    return await db.transaction(async (tx) => {
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];
      
      /**
       * 🔥 UNIQUE IDENTIFICATION:
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

      // 5. Atomic Upsert back to the database
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

      console.log(`✅ Test recorded successfully for Build ${build_id}, Spec ${spec_file}`);
      return NextResponse.json({ 
        success: true,
        message: 'Test result recorded'
      });
    });

  } catch (error: any) {
    console.error("❌ API TRANSACTION ERROR:", error.message);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}