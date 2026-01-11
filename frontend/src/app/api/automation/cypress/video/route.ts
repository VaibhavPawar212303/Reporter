import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../../db';
import { testResults } from '../../../../../../db/schema';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, video_url } = body;

    if (!build_id || !spec_file || !video_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      // 1. Find the specific spec row for this build
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, Number(build_id)),
          eq(testResults.specFile, spec_file)
        ),
      });

      if (!existingRecord) {
        console.error(`⚠️ Spec not found for video update: ${spec_file}`);
        return NextResponse.json({ error: "Spec record not found" }, { status: 404 });
      }

      // 2. Map the existing tests array and inject the video URL into every test
      const testsArray = (existingRecord.tests as any[]) || [];
      const updatedTests = testsArray.map((test: any) => ({
        ...test,
        video_url: video_url, // Apply the spec-level video to all individual tests
      }));

      // 3. Update the database
      await tx.update(testResults)
        .set({ tests: updatedTests })
        .where(eq(testResults.id, existingRecord.id));

      console.log(`✅ Cypress Video mapped to ${updatedTests.length} tests in ${spec_file}`);
      return NextResponse.json({ success: true });
    });

  } catch (error: any) {
    console.error("❌ CYPRESS VIDEO API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}