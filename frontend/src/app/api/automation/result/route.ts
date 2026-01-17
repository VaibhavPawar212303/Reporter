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
    status: stepEvent.status || 'RUNNING',
    duration_ms: stepEvent.duration_ms || 0,
    error: stepEvent.error ? cleanText(stepEvent.error) : undefined,
    timestamp: stepEvent.timestamp || new Date().toISOString(),
  };

  // Find existing step or add new one
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

  // Limit logs to prevent unbounded growth (keep last 1000)
  if (test.logs.length >= 1000) {
    test.logs = test.logs.slice(-900);
  }

  if (logData.logs && Array.isArray(logData.logs)) {
    // Bulk logs
    test.logs.push(...logData.logs.map((log: string) => formatLogEntry(log)));
  } else if (logData.log_chunk) {
    // Single log chunk
    test.logs.push(formatLogEntry(logData.log_chunk, logData.log_level || 'INFO'));
  }

  return test;
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

    // Convert build_id to number if it's a string
    const build_id = typeof body.build_id === 'string' 
      ? parseInt(body.build_id, 10) 
      : body.build_id;
    
    const { spec_file, test_entry, type } = body;

    return await db.transaction(async (tx) => {
      // 1. Get or create test result record
      let existing = await tx.query.testResults.findFirst({
        where: and(
          eq(testResults.buildId, build_id),
          eq(testResults.specFile, spec_file)
        )
      });

      let tests = existing ? (existing.tests as any[]) : [];

      // 2. Find or create test entry
      const testKey = `${test_entry?.title || 'unknown'}::${test_entry?.project || 'default'}`;
      let testIdx = tests.findIndex(
        (t: any) => t.title === test_entry?.title && t.project === test_entry?.project
      );

      // If test doesn't exist, create it
      if (testIdx === -1 && test_entry) {
        tests.push({
          title: test_entry.title,
          project: test_entry.project,
          status: 'RUNNING',
          logs: [],
          steps: [],
          created_at: new Date().toISOString(),
        });
        testIdx = tests.length - 1;
      }

      if (testIdx !== -1) {
        let test = tests[testIdx];

        // 3. Handle different event types
        if (type === 'step') {
          // Real-time step tracking
          test = handleStepEvent(test, body);
        } else if (type === 'log') {
          // Log accumulation
          test = handleLogEvent(test, body);
        } else {
          // Complete test result (final update)
          test = {
            ...test,
            ...test_entry,
            status: test_entry.status || test.status,
            duration_ms: test_entry.duration_ms || 0,
            logs: test_entry.logs
              ? test_entry.logs.map((log: string) => formatLogEntry(log))
              : test.logs || [],
            steps: test_entry.steps || test.steps || [],
            video_url: test_entry.video_url,
            error: test_entry.error ? {
              message: cleanText(test_entry.error.message),
              stack: cleanText(test_entry.error.stack),
            } : undefined,
            case_codes: test_entry.case_codes || ["N/A"],
            run_number: test_entry.run_number || 1,
            updated_at: new Date().toISOString(),
          };
        }

        tests[testIdx] = test;
      }

      // 4. Atomic upsert to database
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

      // 5. Calculate and update spec summary (optional - skip if automationBuilds not needed)
      try {
        const totalTests = tests.length;
        const passedTests = tests.filter((t: any) => t.status === 'PASSED').length;
        const failedTests = tests.filter((t: any) => t.status === 'FAILED').length;
        const totalDuration = tests.reduce((sum: number, t: any) => sum + (t.duration_ms || 0), 0);

        // Update build record with summary (if table exists)
        await tx.update(automationBuilds)
          .set({
            stats: JSON.stringify({
              total_tests: totalTests,
              passed: passedTests,
              failed: failedTests,
              total_duration_ms: totalDuration,
              last_updated: new Date().toISOString(),
            }) as any,
          } as any)
          .where(eq(automationBuilds.id, build_id as any));
      } catch (e) {
        // Skip if automationBuilds update fails
        console.warn('⚠️ Could not update build stats');
      }

      return NextResponse.json({
        success: true,
        data: {
          build_id: String(build_id),
          spec_file,
          test_count: tests.length,
          passed: tests.filter((t: any) => t.status === 'PASSED').length,
          failed: tests.filter((t: any) => t.status === 'FAILED').length,
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

    if (!build_id_param) {
      return NextResponse.json(
        { error: 'Missing build_id' },
        { status: 400 }
      );
    }

    // Convert build_id to number
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

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });

  } catch (error: any) {
    console.error('❌ Test result GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}