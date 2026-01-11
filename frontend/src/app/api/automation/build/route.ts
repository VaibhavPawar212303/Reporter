
import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { automationBuilds } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { environment, type } = body; // 🔥 Extract type

    const [newBuild] = await db.insert(automationBuilds).values({
      environment: environment || 'dev',
      status: 'running',
      type: type || 'unknown', // 🔥 Save type
    }).returning({
      insertedId: automationBuilds.id
    });

    return NextResponse.json({ buildId: newBuild.insertedId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}