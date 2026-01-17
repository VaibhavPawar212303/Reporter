import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';


// 1. ANSI Cleaning Utility
const cleanText = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text.replace(
    /[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, 
    ''
  );
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, test_entry, log_chunk, video_url, is_video_update } = body;

    // 2. Verify Build ID
    const buildExists = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!buildExists) {
      return NextResponse.json({ error: `Build ${build_id} not found.` }, { status: 400 });
    }

    // 3. Clean and Sanitize Inputs
    if (test_entry) {
      test_entry.title = cleanText(test_entry.title);
      test_entry.project = cleanText(test_entry.project);
      if (test_entry.error) {
        test_entry.error.message = cleanText(test_entry.error.message);
        test_entry.error.stack = cleanText(test_entry.error.stack);
      }
    }
    const sanitizedLog = log_chunk ? cleanText(log_chunk) : null;

    // 4. Atomic Transaction for Parallel Workers
    return await db.transaction(async (tx) => {
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];

      // SCENARIO A: Video Update (Spec level)
      if (is_video_update) {
        if (!existingRecord) return NextResponse.json({ error: "Spec not found" }, { status: 404 });
        updatedTests = updatedTests.map((t) => ({ ...t, video_url }));
      } 
      
      // SCENARIO B: Individual Test Result or Log Chunk
      else if (test_entry) {
        const testIndex = updatedTests.findIndex((t) => 
          t.title === test_entry.title && 
          t.project === test_entry.project &&
          Number(t.run_number) === Number(test_entry.run_number)
        );

        if (testIndex !== -1) {
          const existingTest = updatedTests[testIndex];
          const currentLogs = Array.isArray(existingTest.logs) ? existingTest.logs : [];
          
          updatedTests[testIndex] = {
            ...existingTest,
            ...test_entry,
            video_url: test_entry.video_url || existingTest.video_url || null,
            logs: sanitizedLog ? [...currentLogs, sanitizedLog] : currentLogs
          };
        } else {
          updatedTests.push({
            ...test_entry,
            logs: sanitizedLog ? [sanitizedLog] : []
          });
        }
      }

      // 5. ATOMIC UPSERT (TiDB Dialect)
      await tx.insert(testResults)
        .values({
          buildId: build_id,
          specFile: spec_file,
          tests: updatedTests,
          executedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: { tests: updatedTests },
        });

      return NextResponse.json({ success: true });
    });

  } catch (error: any) {
    console.error("❌ TiDB API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}