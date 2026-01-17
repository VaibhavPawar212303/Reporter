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

    // TiDB Serverless supports transactions via the Drizzle driver
    return await db.transaction(async (tx) => {
      
      // 1. Find the specific spec row
      // Ensure 'testResults' is included in your drizzle(client, { schema }) init
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, Number(build_id)),
          eq(testResults.specFile, spec_file)
        ),
      });

      if (!existingRecord) {
        return NextResponse.json({ error: "Spec record not found" }, { status: 404 });
      }

      // 2. Handle JSON data safely
      // In MySQL/TiDB, JSON columns are returned as objects/arrays already
      const testsArray = Array.isArray(existingRecord.tests) 
        ? existingRecord.tests 
        : [];

      const updatedTests = testsArray.map((test: any) => ({
        ...test,
        video_url: video_url, 
      }));

      // 3. Update the database
      // No .returning() here (MySQL doesn't support it)
      await tx.update(testResults)
        .set({ tests: updatedTests })
        .where(eq(testResults.id, existingRecord.id));

      return NextResponse.json({ 
        success: true, 
        updatedTestsCount: updatedTests.length 
      });
    });

  } catch (error: any) {
    console.error("❌ CYPRESS VIDEO API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}