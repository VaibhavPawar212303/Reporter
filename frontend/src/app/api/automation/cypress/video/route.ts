// src/app/api/automation/cypress/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../../db';
import { testResults } from '../../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 1. ADDED: project_id from request body
    const { build_id, spec_file, video_url, project_id } = body;

    if (!build_id || !spec_file || !video_url || !project_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, Number(build_id)),
          eq(testResults.specFile, spec_file),
          // 2. ADDED: projectId filter to match new schema logic
          eq(testResults.projectId, Number(project_id))
        ),
      });

      if (!existingRecord) {
        return NextResponse.json({ error: "Spec record not found" }, { status: 404 });
      }

      const testsArray = Array.isArray(existingRecord.tests) 
        ? existingRecord.tests 
        : [];

      const updatedTests = testsArray.map((test: any) => ({
        ...test,
        video_url: video_url, 
      }));

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