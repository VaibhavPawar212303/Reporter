// src/app/api/automation/result/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { build_id, spec_file, test_entry } = body;

    if (!build_id || !spec_file || !test_entry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify Build exists
    const build = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    return await db.transaction(async (tx) => {
      // 2. Find existing spec record for this build
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];

      // 3. Find if this specific test (Title + Project + Run) exists in the JSON array
      const testIndex = updatedTests.findIndex((t: any) =>
        t.title === test_entry.title &&
        t.project === test_entry.project &&
        t.run_number === test_entry.run_number
      );

      if (testIndex !== -1) {
        // Update existing test entry (merging logs and status)
        updatedTests[testIndex] = {
          ...updatedTests[testIndex],
          ...test_entry,
          logs: [...(updatedTests[testIndex].logs || []), ...(test_entry.logs || [])]
        };
      } else {
        // Add new test entry
        updatedTests.push(test_entry);
      }

      // 4. TiDB Atomic Upsert
      await tx.insert(testResults).values({
        buildId: build_id,   // Use buildId (camelCase)
        specFile: spec_file, // Use specFile (camelCase)
        tests: updatedTests,
        executedAt: new Date(),
      })
        .onDuplicateKeyUpdate({
          set: { tests: updatedTests },
        });

      return NextResponse.json({ success: true });
    });
  } catch (error: any) {
    console.error("❌ PLAYWRIGHT API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}