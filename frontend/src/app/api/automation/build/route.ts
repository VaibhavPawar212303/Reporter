// src/app/api/automation/build/route.ts
import { NextResponse } from 'next/server';
import { automationBuilds } from '../../../../../db/schema';
import { db } from '../../../../../db';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    /**
     * project_id: required to link the build to the correct Project Card
     * environment: dev/staging/production
     * type: cypress/playwright
     */
    const { project_id, environment, type } = body;

    // Basic validation for the new required field
    if (!project_id) {
      return NextResponse.json({ error: "Missing project_id parameter" }, { status: 400 });
    }

    const result = await db.insert(automationBuilds).values({
      projectId: Number(project_id), // Ensure it's a number for the DB
      environment: environment || 'dev',
      status: 'running',
      type: type || 'cypress',
    });

    /**
     * Updated logic per instructions:
     * 1. No [0] index used
     * 2. Using lastInsertId to capture the new Build ID
     */
    const insertedId = (result as any).lastInsertId;

    console.log(`[PIPELINE] New Build Initialized: ID #${insertedId} for Project #${project_id}`);

    return NextResponse.json({ 
      success: true,
      buildId: insertedId 
    });

  } catch (error: any) {
    console.error("CRITICAL_DB_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Pipeline Error", details: error.message }, 
      { status: 500 }
    );
  }
}