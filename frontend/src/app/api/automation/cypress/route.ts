// src/app/api/automation/result/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../../db';
import { automationBuilds, organizationMembers, testResults } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { build_id, spec_file, test_entry } = body;

    if (!build_id || !spec_file || !test_entry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Verify Build exists AND belongs to user's organization
    const build = await db.query.automationBuilds.findFirst({
      where: and(
        eq(automationBuilds.id, build_id),
        eq(automationBuilds.organizationId, membership.organizationId)
      ),
    });

    if (!build) {
      return NextResponse.json({ error: 'Build not found or access denied' }, { status: 404 });
    }

    const projectId = build.projectId;
    const organizationId = build.organizationId;

    return await db.transaction(async (tx) => {
      // Find existing spec record for this build
      const existingRecord = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        ),
      });

      let updatedTests = existingRecord ? (existingRecord.tests as any[]) : [];

      // Find if this specific test exists in the JSON array
      const testIndex = updatedTests.findIndex((t: any) =>
        t.title === test_entry.title &&
        t.project === test_entry.project &&
        t.run_number === test_entry.run_number
      );

      if (testIndex !== -1) {
        updatedTests[testIndex] = {
          ...updatedTests[testIndex],
          ...test_entry,
          logs: [...(updatedTests[testIndex].logs || []), ...(test_entry.logs || [])],
        };
      } else {
        updatedTests.push(test_entry);
      }

      // Atomic Upsert with organizationId
      await tx
        .insert(testResults)
        .values({
          buildId: build_id,
          projectId: projectId,
          organizationId: organizationId,
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
    console.error('❌ AUTOMATION RESULT API ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get test results for authenticated user's organization
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildId = searchParams.get('build_id');
    const projectId = searchParams.get('project_id');

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Build query conditions
    const conditions = [eq(testResults.organizationId, membership.organizationId)];

    if (buildId) {
      conditions.push(eq(testResults.buildId, Number(buildId)));
    }

    if (projectId) {
      conditions.push(eq(testResults.projectId, Number(projectId)));
    }

    // Fetch results
    const results = await db.query.testResults.findMany({
      where: and(...conditions),
      with: {
        build: true,
        project: true,
      },
      orderBy: (results, { desc }) => [desc(results.executedAt)],
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('❌ GET RESULTS ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}