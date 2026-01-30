import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, projects } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, environment, type, session_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 });
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, Number(project_id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    /**
     * 🟢 STEP 1: PARALLEL SESSION CHECK
     * If session_id exists, we check the DB first.
     * We look for ANY build with this session, not just 'running', 
     * to prevent duplicates if status changes.
     */
    if (session_id) {
      const existingBuild = await db.query.automationBuilds.findFirst({
        where: and(
          eq(automationBuilds.projectId, Number(project_id)),
          eq(automationBuilds.sessionId, session_id)
        ),
      });

      if (existingBuild) {
        console.log(`[PIPELINE] Parallel Match: Session ${session_id} -> Build #${existingBuild.id}`);
        return NextResponse.json({
          success: true,
          buildId: existingBuild.id,
          projectId: project_id,
          organizationId: project.organizationId,
        });
      }
    }

    /**
     * 🟢 STEP 2: ATOMIC CREATION
     * If we reach here, it means no session was found OR it's a local run.
     * We use onDuplicateKeyUpdate as a safety "lock".
     */
    const insertValues = {
      projectId: Number(project_id),
      organizationId: project.organizationId,
      sessionId: session_id || null,
      environment: environment || 'dev',
      status: 'running',
      type: type || 'playwright',
    };

    const result = await db.insert(automationBuilds)
      .values(insertValues)
      .onDuplicateKeyUpdate({
        set: { status: 'running' } // This prevents the crash if another worker won the race 1ms ago
      });

    // 🟢 STEP 3: RESOLVE ID
    // result.lastInsertId works for the winner. 
    // For losers of the race, we fetch the existing one.
    let finalBuildId = (result as any).lastInsertId;

    if (!finalBuildId && session_id) {
      const fallback = await db.query.automationBuilds.findFirst({
        where: and(
          eq(automationBuilds.projectId, Number(project_id)),
          eq(automationBuilds.sessionId, session_id)
        ),
      });
      finalBuildId = fallback?.id;
    }

    console.log(`[PIPELINE] Handshake Complete: Build #${finalBuildId}`);

    return NextResponse.json({
      success: true,
      buildId: finalBuildId,
      projectId: project_id,
      organizationId: project.organizationId,
    });

  } catch (error: any) {
    console.error('CRITICAL_PIPELINE_ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}