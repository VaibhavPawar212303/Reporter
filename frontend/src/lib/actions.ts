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
      video_url: test.video_url || null,
      stack_trace:test.stack_trace
    };
  } catch (error) {
    console.error('Error fetching test steps:', error);
    return null;
  }
}

export async function getMasterTestCases() {
  return await db.query.testCases.findMany({ orderBy: [desc(testCases.updatedAt)] });
}