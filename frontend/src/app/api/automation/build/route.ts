import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, projects } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.AUTOMATION_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      console.error(`❌ Unauthorized build attempt detected`);
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    // 🟢 Added session_id as an optional parameter
    const { project_id, environment, type, session_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id parameter' }, { status: 400 });
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, Number(project_id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 🟢 PARALLEL HANDSHAKE LOGIC
    // If a session_id is provided, check if a build already exists for this session
    if (session_id) {
      const existingBuild = await db.query.automationBuilds.findFirst({
        where: and(
          eq(automationBuilds.projectId, Number(project_id)),
          eq(automationBuilds.sessionId, session_id),
          eq(automationBuilds.status, 'running')
        ),
      });

      if (existingBuild) {
        console.log(`[PIPELINE] Existing Session Linked: ID #${existingBuild.id} for Session ${session_id}`);
        return NextResponse.json({
          success: true,
          buildId: existingBuild.id,
          projectId: project_id,
          organizationId: project.organizationId,
          isExisting: true // Signal that we are merging into an existing run
        });
      }
    }

    // CREATE NEW BUILD (If no session match found or no session_id provided)
    const result = await db.insert(automationBuilds).values({
      projectId: Number(project_id),
      organizationId: project.organizationId,
      sessionId: session_id || null, // Store session_id for future instance handshakes
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
    console.error('CRITICAL_PIPELINE_ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Pipeline Error', details: error.message },
      { status: 500 }
    );
  }
}