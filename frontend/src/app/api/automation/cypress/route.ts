import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults, projects } from '../../../../../db/schema';

const DEBUG_MODE = true;

/* -------------------- HELPER FUNCTIONS -------------------- */

const debugLog = (section: string, data: any) => {
  if (!DEBUG_MODE) return;
};

const cleanAnsi = (text: any): string => {
  if (!text || typeof text !== 'string') return String(text || '');
  return text.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

const normalizeStatus = (status: string): string => {
  const s = status?.toUpperCase();
  if (['PASSED', 'SUCCESS'].includes(s)) return 'PASSED';
  if (['FAILED', 'ERROR'].includes(s)) return 'FAILED';
  if (['PENDING', 'SKIPPED'].includes(s)) return 'SKIPPED';
  return 'RUNNING';
};

/* -------------------- CONCURRENCY LOCK -------------------- */
// Prevents race conditions when multiple tests in the same spec update the JSON array simultaneously
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (locks.has(key)) await locks.get(key);
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  locks.set(key, promise);
  try { return await fn(); } 
  finally { locks.delete(key); resolve!(); }
}

/* -------------------- POST HANDLER -------------------- */

export async function POST(req: Request) {
  try {
    // 1. API Key Authentication
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { build_id, spec_file, test_entry, project_id } = body;

    if (!build_id || !spec_file || !test_entry) {
      return NextResponse.json({ error: 'Missing pipeline data' }, { status: 400 });
    }

    // 2. Fetch Build and Project Context (for OrgID)
    const build = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, Number(build_id)),
    });

    if (!build) return NextResponse.json({ error: 'Build Object not found' }, { status: 404 });

    const lockKey = `${build_id}:${spec_file}`;

    return await withLock(lockKey, async () => {
      return await db.transaction(async (tx) => {
        
        // 3. Find existing Spec row
        const existing = await tx.query.testResults.findFirst({
          where: and(
            eq(testResults.buildId, Number(build_id)),
            eq(testResults.specFile, spec_file)
          ),
        });

        let tests: any[] = existing ? [...(existing.tests as any[])] : [];

        // 4. Update Logic (Cypress specific unique key: Title + Run Number)
        const testUniqueKey = `${test_entry.project || 'default'}::${test_entry.title}`;
        const testIdx = tests.findIndex((t: any) => 
          (t.unique_key === testUniqueKey || (t.title === test_entry.title && t.project === test_entry.project)) &&
          t.run_number === test_entry.run_number
        );

        const normalizedEntry = {
          ...test_entry,
          unique_key: testUniqueKey,
          status: normalizeStatus(test_entry.status),
          error: test_entry.error ? {
            message: cleanAnsi(test_entry.error.message),
            stack: cleanAnsi(test_entry.error.stack)
          } : null,
          updated_at: new Date().toISOString()
        };

        if (testIdx !== -1) {
          // Merge logs if they exist to prevent overwriting stream
          const existingLogs = tests[testIdx].logs || [];
          const newLogs = test_entry.logs || [];
          normalizedEntry.logs = [...existingLogs, ...newLogs];
          tests[testIdx] = normalizedEntry;
        } else {
          tests.push({ ...normalizedEntry, created_at: new Date().toISOString() });
        }

        // 5. Atomic Upsert
        if (existing) {
          await tx.update(testResults)
            .set({ tests: tests as any, executedAt: new Date() })
            .where(eq(testResults.id, existing.id));
        } else {
          await tx.insert(testResults).values({
            buildId: Number(build_id),
            projectId: build.projectId,
            organizationId: build.organizationId,
            specFile: spec_file,
            tests: tests as any,
            executedAt: new Date()
          });
        }

        return NextResponse.json({ 
          success: true, 
          spec: spec_file,
          test_count: tests.length 
        });
      });
    });

  } catch (error: any) {
    console.error("❌ CYPRESS API CRASH:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* -------------------- GET HANDLER -------------------- */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const buildId = searchParams.get('build_id');

    if (!buildId) return NextResponse.json({ error: 'build_id required' }, { status: 400 });

    const results = await db.query.testResults.findMany({
      where: eq(testResults.buildId, Number(buildId)),
      orderBy: (t, { desc }) => [desc(t.executedAt)]
    });

    // Calculate Summary
    let total = 0, passed = 0, failed = 0;
    results.forEach(r => {
      (r.tests as any[]).forEach(t => {
        total++;
        if (t.status === 'PASSED') passed++;
        if (t.status === 'FAILED') failed++;
      });
    });

    return NextResponse.json({
      success: true,
      build_id: buildId,
      summary: { total, passed, failed, pass_rate: total > 0 ? Math.round((passed/total)*100) : 0 },
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}