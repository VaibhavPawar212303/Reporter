import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm'; // Added sql
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

    /**
     * 🟢 ATOMIC GET-OR-CREATE LOGIC
     * Using the database Unique Index as a lock to prevent race conditions.
     */
    if (session_id) {
      // 1. Attempt Atomic Insert. If (projectId + sessionId) exists, perform a No-Op Update.
      await db.insert(automationBuilds)
        .values({
          projectId: Number(project_id),
          organizationId: project.organizationId,
          sessionId: session_id,
          environment: environment || 'dev',
          status: 'running',
          type: type || 'playwright',
        })
        .onDuplicateKeyUpdate({
          set: { status: 'running' } // No-op: just ensures the query succeeds if record exists
        });

      // 2. Fetch the ID (Guaranteed to be unique due to DB constraint)
      const build = await db.query.automationBuilds.findFirst({
        where: and(
          eq(automationBuilds.projectId, Number(project_id)),
          eq(automationBuilds.sessionId, session_id),
          eq(automationBuilds.status, 'running')
        ),
      });

      if (build) {
        console.log(`[PIPELINE] Session Handshake: ID #${build.id} for Session ${session_id}`);
        return NextResponse.json({
          success: true,
          buildId: build.id,
          projectId: project_id,
          organizationId: project.organizationId,
        });
      }
    }

    // FALLBACK: Standard Insert for local runs (no session_id provided)
    const result = await db.insert(automationBuilds).values({
      projectId: Number(project_id),
      organizationId: project.organizationId,
      sessionId: session_id || null,
      environment: environment || 'dev',
      status: 'running',
      type: type || 'playwright',
    });

    const insertedId = (result as any).lastInsertId;
    console.log(`[PIPELINE] New Build Initialized: ID #${insertedId}`);

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