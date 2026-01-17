// src/app/api/.../route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../../../db'; 
import { automationBuilds } from '../../../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { environment, type } = body;

    const result = await db.insert(automationBuilds).values({
      environment: environment || 'dev',
      status: 'running',
      type: type || 'unknown',
    });

    // 1. Remove the [0]
    // 2. Use 'lastInsertId' instead of 'insertId'
    const insertedId = result.lastInsertId;

    return NextResponse.json({ buildId: insertedId });
  } catch (error: any) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}