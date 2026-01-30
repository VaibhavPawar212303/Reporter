// src/app/api/automation/build/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../../../db';
import { automationBuilds, projects } from '../../../../../../db/schema';


export async function POST(req: Request) {
  try {
    // Verify API key for external calls
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.AUTOMATION_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, environment, type } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id parameter' }, { status: 400 });
    }

    // Get project to find organizationId
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, Number(project_id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create the build
    const result = await db.insert(automationBuilds).values({
      projectId: Number(project_id),
      organizationId: project.organizationId,
      environment: environment || 'dev',
      status: 'running',
      type: type || 'playwright',
    });

    const insertedId = (result as any).lastInsertId;

    console.log(`[PIPELINE] New Build Initialized: ID #${insertedId} for Project #${project_id}`);

    return NextResponse.json({
      success: true,
      buildId: insertedId,
      projectId: project_id,
      organizationId: project.organizationId,
    });

  } catch (error: any) {
    console.error('CRITICAL_DB_ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Pipeline Error', details: error.message },
      { status: 500 }
    );
  }
}