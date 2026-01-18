import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';

/**
 * ANSI Color Code Removal
 */
const cleanText = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text
    .replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .trim();
};

/**
 * Normalize status to uppercase for consistency
 */
const normalizeStatus = (status: string): string => {
  if (!status) return 'UNKNOWN';
  const upper = status.toUpperCase();
  if (['PASSED', 'FAILED', 'SKIPPED', 'RUNNING'].includes(upper)) {
    return upper;
  }
  return upper;
};

/**
 * Validates required fields
 */
const validatePayload = (body: any): { valid: boolean; error?: string } => {
  if (!body.build_id) return { valid: false, error: 'Missing build_id' };
  if (!body.spec_file) return { valid: false, error: 'Missing spec_file' };
  if (!body.test_entry && !body.type) return { valid: false, error: 'Missing test_entry or type' };
  return { valid: true };
};

/**
 * Format log entry with timestamp
 */
const formatLogEntry = (message: string, level: string = 'INFO'): string => {
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] ${level}: ${cleanText(message)}`;
};

/**
 * Handle live step events (real-time tracking)
 */
const handleStepEvent = (test: any, stepEvent: any): any => {
  if (!test.steps) test.steps = [];

  const step = {
    step_number: stepEvent.step_number || test.steps.length + 1,
    command: stepEvent.command || 'unknown',
    status: normalizeStatus(stepEvent.status || 'RUNNING'),
    duration_ms: stepEvent.duration_ms || 0,
    error: stepEvent.error ? cleanText(stepEvent.error) : undefined,
    timestamp: stepEvent.timestamp || new Date().toISOString(),
  };

  const existingIdx = test.steps.findIndex(
    (s: any) => s.step_number === step.step_number
  );

  if (existingIdx !== -1) {
    test.steps[existingIdx] = { ...test.steps[existingIdx], ...step };
  } else {
    test.steps.push(step);
  }

  return test;
};

/**
 * Handle log events (accumulate logs)
 */
const handleLogEvent = (test: any, logData: any): any => {
  if (!test.logs) test.logs = [];

  if (test.logs.length >= 1000) {
    test.logs = test.logs.slice(-900);
  }

  if (logData.logs && Array.isArray(logData.logs)) {
    test.logs.push(...logData.logs.map((log: string) => formatLogEntry(log)));
  } else if (logData.log_chunk) {
    test.logs.push(formatLogEntry(logData.log_chunk, logData.log_level || 'INFO'));
  }

  return test;
};

/**
 * 🔥 Generate unique key for a test (project::title)
 */
const getUniqueTestKey = (test_entry: any): string => {
  const project = test_entry?.project || 'default';
  const title = test_entry?.title || 'unknown';
  return `${project}::${title}`;
};

/**
 * Main API Handler
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const build_id = typeof body.build_id === 'string' 
      ? parseInt(body.build_id, 10) 
      : body.build_id;
    
    const { spec_file, test_entry, type, unique_test_key } = body;
    
    // 🔥 Get the unique key from payload or generate it
    const testUniqueKey = unique_test_key || getUniqueTestKey(test_entry);
    
    // 🔥 Check if this is a final result
    const isFinal = test_entry?.is_final === true;
    
    console.log(`📥 [API] Received: ${testUniqueKey}, is_final: ${isFinal}, status: ${test_entry?.status}`);

    return await db.transaction(async (tx) => {
      // 1. Get existing test results for this build + spec_file
      let existing = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        )
      });

      let tests = existing ? (existing.tests as any[]) : [];

      // 🔥 2. Find test by unique_test_key (project::title), NOT just title
      let testIdx = tests.findIndex((t: any) => {
        const existingKey = `${t.project || 'default'}::${t.title || 'unknown'}`;
        return existingKey === testUniqueKey;
      });

      // 🔥 3. Check if existing test already has a final result
      const existingTest = testIdx !== -1 ? tests[testIdx] : null;
      const existingIsFinal = existingTest?.is_final === true;

      // 🔥 4. CRITICAL: If existing is final, only allow update if incoming is also final
      if (existingIsFinal && !isFinal) {
        console.log(`⏭️  [API] Skipping non-final update for ${testUniqueKey} - final already exists`);
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Final result already exists',
          data: {
            build_id: String(build_id),
            spec_file,
            test_key: testUniqueKey,
          }
        });
      }

      // 5. If test doesn't exist, create it
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
        console.log(`➕ [API] Created new test entry: ${testUniqueKey}`);
      }

      if (testIdx !== -1) {
        let test = tests[testIdx];

        // 6. Handle different event types
        if (type === 'step') {
          test = handleStepEvent(test, body);
        } else if (type === 'log') {
          test = handleLogEvent(test, body);
        } else {
          // 🔥 Complete test result update
          const normalizedStatus = normalizeStatus(test_entry.status);
          
          test = {
            ...test,
            ...test_entry,
            unique_key: testUniqueKey,
            status: normalizedStatus,
            is_final: isFinal, // 🔥 Preserve the is_final flag
            duration_ms: test_entry.duration_ms || 0,
            duration_seconds: test_entry.duration_seconds || '0',
            logs: test_entry.logs
              ? test_entry.logs.map((log: string) => formatLogEntry(log))
              : test.logs || [],
            steps: test_entry.steps || test.steps || [],
            attachments: test_entry.attachments || test.attachments,
            error: test_entry.error ? {
              message: cleanText(test_entry.error.message),
              stack: cleanText(test_entry.error.stack),
              location: test_entry.error.location,
            } : undefined,
            case_codes: test_entry.case_codes || ["N/A"],
            run_number: test_entry.run_number || 1,
            retry_count: test_entry.retry_count || 0,
            is_flaky: test_entry.is_flaky || false,
            step_summary: test_entry.step_summary,
            metadata: test_entry.metadata,
            updated_at: new Date().toISOString(),
          };
          
          console.log(`✏️  [API] Updated test: ${testUniqueKey} -> ${normalizedStatus} (is_final: ${isFinal})`);
        }

        tests[testIdx] = test;
      }

      // 7. Atomic upsert to database
      await tx.insert(testResults)
        .values({
          buildId: build_id as any,
          specFile: spec_file,
          tests: tests as any,
        })
        .onDuplicateKeyUpdate({
          set: {
            tests: tests as any,
          }
        });

      // 8. Calculate and update build summary
      try {
        // 🔥 Only count tests with is_final: true for accurate stats
        const finalTests = tests.filter((t: any) => t.is_final === true);
        const totalTests = tests.length;
        const passedTests = finalTests.filter((t: any) => 
          t.status === 'PASSED' || t.status === 'passed'
        ).length;
        const failedTests = finalTests.filter((t: any) => 
          t.status === 'FAILED' || t.status === 'failed'
        ).length;
        const runningTests = tests.filter((t: any) => 
          t.status === 'RUNNING' || t.status === 'running' || !t.is_final
        ).length;
        const totalDuration = tests.reduce((sum: number, t: any) => sum + (t.duration_ms || 0), 0);

        await tx.update(automationBuilds)
          .set({
            stats: JSON.stringify({
              total_tests: totalTests,
              final_tests: finalTests.length,
              passed: passedTests,
              failed: failedTests,
              running: runningTests,
              total_duration_ms: totalDuration,
              last_updated: new Date().toISOString(),
            }) as any,
          } as any)
          .where(eq(automationBuilds.id, build_id as any));
          
        console.log(`📊 [API] Build ${build_id} stats: ${totalTests} total, ${finalTests.length} final, ${passedTests} passed, ${failedTests} failed`);
      } catch (e) {
        console.warn('⚠️ Could not update build stats:', e);
      }

      return NextResponse.json({
        success: true,
        data: {
          build_id: String(build_id),
          spec_file,
          test_key: testUniqueKey,
          is_final: isFinal,
          test_count: tests.length,
          final_count: tests.filter((t: any) => t.is_final).length,
          passed: tests.filter((t: any) => ['PASSED', 'passed'].includes(t.status) && t.is_final).length,
          failed: tests.filter((t: any) => ['FAILED', 'failed'].includes(t.status) && t.is_final).length,
        }
      });

    });

  } catch (error: any) {
    console.error('❌ Test result API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - Retrieve test results by build
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const build_id_param = searchParams.get('build_id');
    const spec_file = searchParams.get('spec_file');
    const only_final = searchParams.get('only_final') === 'true';

    if (!build_id_param) {
      return NextResponse.json(
        { error: 'Missing build_id' },
        { status: 400 }
      );
    }

    const build_id = parseInt(build_id_param, 10);
    if (isNaN(build_id)) {
      return NextResponse.json(
        { error: 'build_id must be a valid number' },
        { status: 400 }
      );
    }

    const where = spec_file
      ? and(eq(testResults.buildId, build_id), eq(testResults.specFile, spec_file))
      : eq(testResults.buildId, build_id);

    const results = await db.query.testResults.findMany({ where });

    // 🔥 Optionally filter to only final results
    let processedResults = results;
    if (only_final) {
      processedResults = results.map((r: any) => ({
        ...r,
        tests: (r.tests as any[]).filter((t: any) => t.is_final === true)
      }));
    }

    return NextResponse.json({
      success: true,
      data: processedResults,
      count: processedResults.reduce((sum: number, r: any) => sum + (r.tests?.length || 0), 0),
    });

  } catch (error: any) {
    console.error('❌ Test result GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}