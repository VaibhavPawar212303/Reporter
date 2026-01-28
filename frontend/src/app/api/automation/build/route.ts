// src/app/api/automation/build/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, organizationMembers, projects } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, environment, type } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id parameter' }, { status: 400 });
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Verify project belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, Number(project_id)),
        eq(projects.organizationId, membership.organizationId)
      ),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Create the build
    const result = await db.insert(automationBuilds).values({
      projectId: Number(project_id),
      organizationId: membership.organizationId,
      triggeredById: userId,
      environment: environment || 'dev',
      status: 'running',
      type: type || 'cypress',
    });

    const insertedId = (result as any).lastInsertId;

    console.log(`[PIPELINE] New Build Initialized: ID #${insertedId} for Project #${project_id} by User #${userId}`);

    return NextResponse.json({
      success: true,
      buildId: insertedId,
      projectId: project_id,
      organizationId: membership.organizationId,
    });

  } catch (error: any) {
    console.error('CRITICAL_DB_ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Pipeline Error', details: error.message },
      { status: 500 }
    );
  }
}

// Get builds for the authenticated user's organization
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Build query conditions
    const conditions = [eq(automationBuilds.organizationId, membership.organizationId)];

    if (projectId) {
      conditions.push(eq(automationBuilds.projectId, Number(projectId)));
    }

    // Fetch builds
    const builds = await db.query.automationBuilds.findMany({
      where: and(...conditions),
      with: {
        project: true,
        triggeredBy: true,
      },
      orderBy: (builds, { desc }) => [desc(builds.createdAt)],
    });

    return NextResponse.json(builds);

  } catch (error: any) {
    console.error('CRITICAL_DB_ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}