// src/app/api/automation/result/route.ts
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';


const DEBUG_MODE = true;

/* -------------------- HELPER FUNCTIONS -------------------- */

const debugLog = (section: string, data: any) => {
  if (!DEBUG_MODE) return;
};

const cleanText = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

const normalizeStatus = (status: string): string => {
  if (!status) return 'UNKNOWN';
  const upper = status.toUpperCase();
  return ['PASSED', 'FAILED', 'SKIPPED', 'RUNNING'].includes(upper) ? upper : upper;
};

const validatePayload = (body: any): { valid: boolean; error?: string } => {
  if (!body.build_id) return { valid: false, error: 'Missing build_id' };
  if (!body.spec_file) return { valid: false, error: 'Missing spec_file' };
  if (!body.test_entry && !body.type) return { valid: false, error: 'Missing test_entry or type' };
  return { valid: true };
};

const getUniqueTestKey = (test_entry: any): string => {
  return `${test_entry?.project || 'default'}::${test_entry?.title || 'unknown'}`;
};

/* -------------------- MUTEX LOCK -------------------- */

const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (locks.has(key)) {
    await locks.get(key);
  }

  let resolve: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  locks.set(key, promise);

  try {
    return await fn();
  } finally {
    locks.delete(key);
    resolve!();
  }
}

/* -------------------- POST HANDLER -------------------- */

export async function POST(req: Request) {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.AUTOMATION_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      console.error(`❌ [${requestId}] Invalid API key`);
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();

    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const build_id = typeof body.build_id === 'string' ? parseInt(body.build_id, 10) : body.build_id;
    const { spec_file, test_entry, unique_test_key } = body;
    const testUniqueKey = unique_test_key || getUniqueTestKey(test_entry);
    const isFinal = test_entry?.is_final === true;

    // Get build to find organizationId and projectId
    const build = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, build_id),
    });

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    const lockKey = `${build_id}:${spec_file}`;

    debugLog(`INCOMING [${requestId}]`, {
      build_id,
      spec_file,
      testUniqueKey,
      isFinal,
      status: test_entry?.status,
      organizationId: build.organizationId,
    });

    return await withLock(lockKey, async () => {
      return await db.transaction(async (tx) => {
        // Get existing record
        const existing = await tx.query.testResults.findFirst({
          where: and(
            eq(testResults.buildId, build_id),
            eq(testResults.specFile, spec_file)
          ),
        });

        let tests: any[] = existing ? [...(existing.tests as any[])] : [];

        debugLog(`EXISTING TESTS [${requestId}]`, {
          count: tests.length,
          keys: tests.map((t) => `${t.project}::${t.title}`),
        });

        // Find test by unique key
        let testIdx = tests.findIndex((t: any) => {
          const key = `${t.project || 'default'}::${t.title || 'unknown'}`;
          return key === testUniqueKey;
        });

        const existingTest = testIdx !== -1 ? tests[testIdx] : null;
        const existingIsFinal = existingTest?.is_final === true;

        // Skip if existing is final and incoming is not
        if (existingIsFinal && !isFinal) {
          debugLog(`SKIPPED [${requestId}]`, { reason: 'Final exists', testUniqueKey });
          return NextResponse.json({
            success: true,
            skipped: true,
            reason: 'Final result already exists',
            data: { build_id: String(build_id), spec_file, test_key: testUniqueKey },
          });
        }

        // Create or update test
        if (testIdx === -1 && test_entry) {
          tests.push({
            title: test_entry.title,
            project: test_entry.project,
            unique_key: testUniqueKey,
            status: 'RUNNING',
            is_final: false,
            logs: [],
            steps: [],
            created_at: new Date().toISOString(),
          });
          testIdx = tests.length - 1;
          debugLog(`CREATED [${requestId}]`, { testUniqueKey, index: testIdx });
        }

        if (testIdx !== -1 && test_entry) {
          const normalizedStatus = normalizeStatus(test_entry.status);

          tests[testIdx] = {
            ...tests[testIdx],
            ...test_entry,
            unique_key: testUniqueKey,
            status: normalizedStatus,
            is_final: isFinal,
            duration_ms: test_entry.duration_ms || 0,
            duration_seconds: test_entry.duration_seconds || '0',
            steps: test_entry.steps || tests[testIdx].steps || [],
            attachments: test_entry.attachments || tests[testIdx].attachments,
            error: test_entry.error
              ? {
                  message: cleanText(test_entry.error.message),
                  stack: cleanText(test_entry.error.stack),
                  location: test_entry.error.location,
                }
              : tests[testIdx].error,
            case_codes: test_entry.case_codes || ['N/A'],
            run_number: test_entry.run_number || 1,
            retry_count: test_entry.retry_count || 0,
            is_flaky: test_entry.is_flaky || false,
            step_summary: test_entry.step_summary,
            metadata: test_entry.metadata,
            updated_at: new Date().toISOString(),
          };

          debugLog(`UPDATED [${requestId}]`, {
            testUniqueKey,
            status: normalizedStatus,
            is_final: isFinal,
          });
        }

        debugLog(`SAVING [${requestId}]`, {
          totalTests: tests.length,
          tests: tests.map((t) => ({
            key: t.unique_key || `${t.project}::${t.title}`,
            status: t.status,
            is_final: t.is_final,
          })),
        });

        // Save to database
        if (existing) {
          await tx
            .update(testResults)
            .set({ tests: tests as any })
            .where(and(eq(testResults.buildId, build_id), eq(testResults.specFile, spec_file)));
        } else {
          await tx.insert(testResults).values({
            buildId: build_id as any,
            projectId: build.projectId,
            organizationId: build.organizationId,
            specFile: spec_file,
            tests: tests as any,
          });
        }

        // Calculate stats
        const finalTests = tests.filter((t: any) => t.is_final === true);
        const stats = {
          total_tests: tests.length,
          final_tests: finalTests.length,
          passed: finalTests.filter((t: any) => t.status === 'PASSED').length,
          failed: finalTests.filter((t: any) => t.status === 'FAILED').length,
          running: tests.filter((t: any) => !t.is_final).length,
        };

        debugLog(`STATS [${requestId}]`, stats);

        return NextResponse.json({
          success: true,
          requestId,
          data: {
            build_id: String(build_id),
            spec_file,
            test_key: testUniqueKey,
            is_final: isFinal,
            test_count: tests.length,
            final_count: finalTests.length,
            passed: stats.passed,
            failed: stats.failed,
          },
        });
      });
    });
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Internal server error', requestId }, { status: 500 });
  }
}

/* -------------------- GET HANDLER -------------------- */

export async function GET(req: Request) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.AUTOMATION_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const build_id_param = searchParams.get('build_id');
    const project_id_param = searchParams.get('project_id');
    const only_final = searchParams.get('only_final') === 'true';
    const debug = searchParams.get('debug') === 'true';

    if (!build_id_param && !project_id_param) {
      return NextResponse.json({ error: 'Missing build_id or project_id' }, { status: 400 });
    }

    // Build query conditions
    const conditions = [];

    if (build_id_param) {
      const build_id = parseInt(build_id_param, 10);
      if (isNaN(build_id)) {
        return NextResponse.json({ error: 'Invalid build_id' }, { status: 400 });
      }
      conditions.push(eq(testResults.buildId, build_id));
    }

    if (project_id_param) {
      const project_id = parseInt(project_id_param, 10);
      if (isNaN(project_id)) {
        return NextResponse.json({ error: 'Invalid project_id' }, { status: 400 });
      }
      conditions.push(eq(testResults.projectId, project_id));
    }

    const results = await db.query.testResults.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (results, { desc }) => [desc(results.executedAt)],
    });

    // Flatten and deduplicate
    const allTestsMap = new Map<string, any>();

    results.forEach((r: any) => {
      (r.tests as any[])?.forEach((t: any) => {
        const key = t.unique_key || `${t.project}::${t.title}`;
        const existing = allTestsMap.get(key);

        if (!existing || (t.is_final && !existing.is_final)) {
          allTestsMap.set(key, { ...t, unique_key: key });
        }
      });
    });

    let allTests = Array.from(allTestsMap.values());

    if (only_final) {
      allTests = allTests.filter((t) => t.is_final === true);
    }

    const summary = {
      total: allTests.length,
      final: allTests.filter((t) => t.is_final).length,
      passed: allTests.filter((t) => t.is_final && t.status === 'PASSED').length,
      failed: allTests.filter((t) => t.is_final && t.status === 'FAILED').length,
      running: allTests.filter((t) => !t.is_final).length,
    };

    return NextResponse.json({
      success: true,
      data: results,
      tests: allTests,
      count: allTests.length,
      summary,
      ...(debug && {
        debug: {
          raw: allTests.map((t) => ({
            key: t.unique_key,
            status: t.status,
            is_final: t.is_final,
          })),
        },
      }),
    });
  } catch (error: any) {
    console.error('❌ GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}