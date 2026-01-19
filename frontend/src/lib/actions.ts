"use server"

import { desc, eq, inArray } from 'drizzle-orm';
import { automationBuilds, testCases, testResults } from '../../db/schema';
import { revalidatePath } from "next/cache";
import { db } from '../../db';


export async function uploadMasterTestCases(data: any[]) {
  try {
    for (const item of data) {
      const code = item["Case code"] || item.caseCode;
      const title = item["Title"] || item.title;

      if (!code || !title) continue;

      await db.insert(testCases)
        .values({
          caseCode: String(code),
          caseKey: String(item["Case API Key"] || item["Case Key"] || ''),
          moduleName: String(item["ModuleName"] || item["Module Name"] || ''),
          testSuite: String(item["Test Suite"] || ''),
          title: String(title),
          description: String(item["Description"] || ''),
          precondition: String(item["Precondition"] || ''),
          steps: String(item["Steps"] || ''),
          expectedResult: String(item["ExpectedResult"] || ''),
          type: String(item["Type"] || ''),
          priority: String(item["Priorities"] || item.priority || 'medium'),
          mode: String(item["Mode"] || 'Automation'),
          loggedUser: String(item["Logged User"] || `${item.FirstName || ''} ${item.LastName || ''}`.trim()),
          tags: String(item["Tags"] || ''),
        })
        .onDuplicateKeyUpdate({
          set: {
            title: String(title),
            moduleName: String(item["ModuleName"] || item["Module Name"] || ''),
            steps: String(item["Steps"] || ''),
            expectedResult: String(item["ExpectedResult"] || ''),
            priority: String(item["Priorities"] || item.priority || 'medium'),
            updatedAt: new Date()
          }
        });
    }
    revalidatePath('/test-cases');
    revalidatePath('/');
    return { success: true };
  } catch (e: any) {
    console.error("❌ TiDB Insert Error:", e);
    return { error: e.message };
  }
}

export async function updateTestCase(id: number, data: any) {
  try {
    const { id: _, createdAt, updatedAt, ...updateData } = data;

    await db.update(testCases)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(testCases.id, id));

    revalidatePath('/test-cases');
    return { success: true };
  } catch (error: any) {
    console.error("❌ Update Error:", error);
    return { error: error.message };
  }
}

export async function getDashboardStats() {
  try {
    // Fetch builds and cases separately
    const allBuilds = await db.query.automationBuilds.findMany();
    const allMasterCases = await db.query.testCases.findMany();

    // If you specifically need the count of results per build, 
    // you can fetch testResults separately or use a standard join.
    return {
      totalBuilds: allBuilds.length,
      totalRequirements: allMasterCases.length,
      builds: allBuilds,
      masterCases: allMasterCases
    };
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return { totalBuilds: 0, totalRequirements: 0, builds: [], masterCases: [] };
  }
}

export async function getBuildHistory() {
  return await db.select({
    id: automationBuilds.id,
    status: automationBuilds.status,
    environment: automationBuilds.environment,
    createdAt: automationBuilds.createdAt,
    type: automationBuilds.type
  }).from(automationBuilds).orderBy(desc(automationBuilds.id)).limit(30);
}

// 2. Trend Data: Aggregates last 10 builds (Fixed for TiDB)
export async function getPlaywrightTrend() {
  try {
    const builds = await db.select({ id: automationBuilds.id })
      .from(automationBuilds)
      .where(eq(automationBuilds.type, 'playwright'))
      .orderBy(desc(automationBuilds.id))
      .limit(10);

    if (builds.length === 0) return [];
    const buildIds = builds.map(b => b.id);

    const results = await db.select().from(testResults).where(inArray(testResults.buildId, buildIds));

    return builds.map(b => {
      let passed = 0, total = 0;
      const buildSpecs = results.filter(r => r.buildId === b.id);
      buildSpecs.forEach(spec => {
        (spec.tests as any[])?.forEach(t => {
          total++;
          if (['passed', 'expected', 'success'].includes(t.status?.toLowerCase())) passed++;
        });
      });
      return { name: `#${b.id}`, passed, total };
    }).reverse();
  } catch (e) { return []; }
}

// 3. Build Details: Split query to avoid Lateral Join Error
export async function getBuildDetails(buildId: number) {
  try {
    const build = await db.query.automationBuilds.findFirst({ where: eq(automationBuilds.id, buildId) });
    if (!build) return null;

    const results = await db.select().from(testResults).where(eq(testResults.buildId, buildId));
    
    return {
      ...build,
      results: results.map(r => ({
        ...r,
        tests: (r.tests as any[]).map(t => ({
          ...t,
          has_details: !!(t.steps?.length || t.logs?.length || t.error)
        }))
      }))
    };
  } catch (e) { return null; }
}

// 4. Test Steps: Lazy fetch heavy logs on click
export async function getTestSteps(specId: number, testTitle: string) {
  try {
    // Query the testResults table with the specId
    const testResult = await db.query.testResults.findFirst({ 
      where: eq(testResults.id, specId) 
    });
    
    if (!testResult) return null;
    
    // Parse the tests if it's stored as JSON string
    const testsArray = typeof testResult.tests === 'string' 
      ? JSON.parse(testResult.tests) 
      : testResult.tests;
    
    // Find the test by title in the tests array
    const test = (testsArray as any[]).find((t: any) => t.title === testTitle);
    
    if (!test) return null;
    
    return {
      steps: test.steps || [],
      logs: test.logs || [],
      stdout_logs: test.stdout_logs || test.logs || [],
      stderr_logs: test.stderr_logs || [],
      error: test.error || null,
      video_url: test.video_url || null
    };
  } catch (error) {
    console.error('Error fetching test steps:', error);
    return null;
  }
}

export async function getCypressTestSteps(specId: number, testTitle: string) {
  try {
    // 1. Query the testResults table using the specId (Primary Key)
    const testResult = await db.query.testResults.findFirst({ 
      where: eq(testResults.id, specId) 
    });
    console.log(testResult)
    if (!testResult) return null;
    
    // 2. Handle TiDB JSON parsing (Drizzle usually returns an object, but we check for safety)
    const testsArray = typeof testResult.tests === 'string' 
      ? JSON.parse(testResult.tests) 
      : testResult.tests;
    
    // 3. Find the specific test by title in the Cypress results array
    const test = (testsArray as any[]).find((t: any) => t.title === testTitle);
    
    if (!test) return null;
    
    /**
     * 4. Return Cypress Mapped Data
     * - steps: The command log (cy.visit, cy.get, etc)
     * - logs: Any manual cy.log() or terminal output
     * - stack_trace: Error details for debugging
     */
    return {
      steps: test.steps || [],
      logs: test.logs || [],
      // Cypress often uses 'logs' for all terminal output
      stdout_logs: test.logs || [], 
      stderr_logs: test.stderr_logs || [],
      error: test.error || null,
      video_url: test.video_url || null, // URL from Catbox/Litterbox
      stack_trace: test.stack_trace || (test.error?.stack) || null,
    };
  } catch (error) {
    console.error('❌ Error fetching Cypress test steps:', error);
    return null;
  }
}

export async function getMasterTestCases() {
  return await db.query.testCases.findMany({ orderBy: [desc(testCases.updatedAt)] });
}

export async function getCypressGlobalStats() {
  try {
    const builds = await db.select().from(automationBuilds).where(eq(automationBuilds.type, 'cypress'));
    
    // Fetch all test results for Cypress builds
    const results = await db.select({ tests: testResults.tests })
      .from(testResults)
      .innerJoin(automationBuilds, eq(automationBuilds.id, testResults.buildId))
      .where(eq(automationBuilds.type, 'cypress'));

    let totalTests = 0;
    let passedTests = 0;

    results.forEach(r => {
      const tests = (r.tests as any[]) || [];
      totalTests += tests.length;
      passedTests += tests.filter(t => t.status === 'passed').length;
    });

    // ✅ Match the naming expected by the frontend
    return { 
      totalBuilds: builds.length || 0, 
      totalTestsExecuted: totalTests || 0, 
      lifetimePassRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0 
    };
  } catch (error) {
    console.error("Global Stats Error:", error);
    return { totalBuilds: 0, totalTestsExecuted: 0, lifetimePassRate: 0 };
  }
}

export async function getCypressBuildDetails(buildId: number) {
  try {
    // 1. Fetch the build metadata
    const build = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, buildId),
    });

    if (!build) return null;

    // 2. Fetch all spec rows associated with this build
    // This avoids the Lateral Join syntax error in TiDB
    const results = await db.select().from(testResults).where(eq(testResults.buildId, buildId));

    // 3. Enrich the results with spec-level analytics
    const enrichedResults = results.map(r => {
      // TiDB returns the JSON column as a live JavaScript array
      const tests = (r.tests as any[]) || [];
      
      const specPassed = tests.filter(t => t.status === 'passed').length;
      const specFailed = tests.filter(t => t.status === 'failed').length;
      const specPending = tests.filter(t => ['pending', 'skipped'].includes(t.status)).length;

      // Calculate total spec duration (Handling strings like "1500ms" or raw numbers)
      const totalDurationMs = tests.reduce((acc, t) => {
        const d = typeof t.duration === 'string' ? parseInt(t.duration) : (t.duration || 0);
        return acc + d;
      }, 0);

      // Extract environment info from the first test in the spec
      const firstTest = tests[0] || {};

      return {
        ...r,
        // Spec-level summary
        stats: {
          total: tests.length,
          passed: specPassed,
          failed: specFailed,
          pending: specPending,
          duration: totalDurationMs > 1000 
            ? (totalDurationMs / 1000).toFixed(2) + "s" 
            : totalDurationMs + "ms"
        },
        // Environment Details for this specific worker/spec
        envInfo: {
          browser: firstTest.browser || 'unknown',
          browserVersion: firstTest.browser_version || 'N/A',
          os: firstTest.os || 'unknown',
          project: firstTest.project || 'Cypress'
        },
        // We pass the light version of the test list initially
        // Logs and steps will be lazy-loaded by 'getCypressTestSteps'
        tests: tests.map(t => ({
          title: t.title,
          status: t.status,
          duration: t.duration,
          run_number: t.run_number,
          case_codes: t.case_codes || ["N/A"],
          error: t.error ? { message: t.error.message } : null,
          has_details: !!(t.steps?.length || t.logs?.length)
        }))
      };
    });

    return {
      ...build,
      results: enrichedResults
    };
  } catch (error: any) {
    console.error(`❌ Error fetching details for Cypress build ${buildId}:`, error.message);
    return null;
  }
}

export async function getCypressTrend() {
  const builds = await db.select({ id: automationBuilds.id })
    .from(automationBuilds)
    .where(eq(automationBuilds.type, 'cypress'))
    .orderBy(desc(automationBuilds.id))
    .limit(10);

  if (builds.length === 0) return [];
  const buildIds = builds.map(b => b.id);
  const results = await db.select().from(testResults).where(inArray(testResults.buildId, buildIds));

  return builds.map(b => {
    let p = 0, t = 0;
    results.filter(r => r.buildId === b.id).forEach(spec => {
      (spec.tests as any[]).forEach(test => {
        t++;
        if (test.status === 'passed') p++;
      });
    });
    return { name: `#${b.id}`, passed: p, total: t };
  }).reverse();
}