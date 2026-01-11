import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { automationBuilds, testResults } from '../../../../../db/schema';
import { db } from '../../../../../db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, test_entry, video_url, is_video_update } = body;

    // 1. Verify the Build exists
    const buildExists = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!buildExists) {
      return NextResponse.json({ error: `Build ID ${build_id} not found.` }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      // 2. Find the existing spec row for this build
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      // --- SCENARIO A: VIDEO UPDATE (From after:spec) ---
      if (is_video_update) {
        if (!existingRecord) return NextResponse.json({ error: "Spec not found" }, { status: 404 });

        const testsArray = (existingRecord.tests as any[]) || [];
        const updatedWithVideo = testsArray.map((t: any) => ({
          ...t,
          video_url: video_url // Apply the single Cypress video to all tests in this spec
        }));

        await tx.update(testResults)
          .set({ tests: updatedWithVideo })
          .where(eq(testResults.id, existingRecord.id));

        return NextResponse.json({ success: true, message: "Spec video synced" });
      }

      // --- SCENARIO B: STANDARD TEST RESULT (From afterEach) ---
      let updatedTests = (existingRecord?.tests as any[]) || [];
      const testIndex = updatedTests.findIndex((t: any) => t.title === test_entry.title);

      if (testIndex !== -1) {
        // Update existing test object
        updatedTests[testIndex] = {
          ...updatedTests[testIndex],
          ...test_entry,
          // Preserve video_url if it was already set by a previous run or partial update
          video_url: test_entry.video_url || updatedTests[testIndex].video_url || null,
        };
      } else {
        // Add new test object
        updatedTests.push({
          ...test_entry,
          project: 'Cypress'
        });
      }

      // 3. Atomic Upsert back to the database
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
    console.error("❌ CYPRESS API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}