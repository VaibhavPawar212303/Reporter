"use server"

import { desc, eq, inArray } from 'drizzle-orm';
import { automationBuilds, testCases, testResults } from '../../db/schema';
import { revalidatePath } from "next/cache";
import { db } from '../../db';

/**
 * 1. Get Build History for Sidebar
 * TiDB Optimized: Selecting specific fields saves Request Units (RUs)
 */
export async function getBuildHistory() {
  try {
    return await db.select({
      id: automationBuilds.id,
      status: automationBuilds.status,
      environment: automationBuilds.environment,
      createdAt: automationBuilds.createdAt,
      type: automationBuilds.type
    })
      .from(automationBuilds)
      .orderBy(desc(automationBuilds.id))
      .limit(30);
  } catch (error) {
    console.error("Database Fetch Error:", error);
    return [];
  }
}

/**
 * 2. Bulk Upload Test Cases 
 * ✅ FIXED: Changed .onConflictDoUpdate (Postgres) to .onDuplicateKeyUpdate (TiDB/MySQL)
 */
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

/**
 * 3. Fetch Master List
 */
export async function getMasterTestCases() {
  try {
    return await db.query.testCases.findMany({
      orderBy: [desc(testCases.updatedAt)]
    });
  } catch (error) {
    return [];
  }
}

/**
 * 4. Update Single Test Case
 */
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

export async function getBuildDetails(buildId: number) {
  try {
    // Query 1: Get the build metadata
    const build = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, buildId),
    });

    if (!build) return null;

    // Query 2: Get the spec results associated with this build
    const results = await db.query.testResults.findMany({
      where: eq(testResults.buildId, buildId),
    });

    // Manually combine them to match the expected frontend structure
    return {
      ...build,
      results: results.map((spec) => ({
        id: spec.id,
        specFile: spec.specFile,
        tests: spec.tests || []
      }))
    };
  } catch (error: any) {
    console.error(`❌ Error fetching details for build ${buildId}:`, error.message);
    return null;
  }
}

export async function getTestSteps(specId: number, testTitle: string) {
  try {
    const record = await db.query.testResults.findFirst({
      where: eq(testResults.id, specId)
    });

    if (!record || !Array.isArray(record.tests)) return null;

    const specificTest = record.tests.find((t: any) => t.title === testTitle);

    return {
      steps: specificTest?.steps || [],
      stack_trace: specificTest?.error?.stack || null
    };
  } catch (error) {
    console.error(`❌ Error fetching steps for spec ${specId}:`, error);
    return null;
  }
}

export async function getPlaywrightTrend() {
  try {
    // 1. Fetch the last 10 Playwright builds first (Lightweight)
    const builds = await db
      .select({
        id: automationBuilds.id,
        createdAt: automationBuilds.createdAt,
      })
      .from(automationBuilds)
      .where(eq(automationBuilds.type, 'playwright'))
      .orderBy(desc(automationBuilds.id))
      .limit(10);

    if (builds.length === 0) return [];

    const buildIds = builds.map((b) => b.id);

    // 2. Fetch all test results for these 10 builds in one query
    const results = await db
      .select()
      .from(testResults)
      .where(inArray(testResults.buildId, buildIds));

    // 3. Aggregate data in JavaScript (No Lateral Join needed)
    const trendData = builds.map((b) => {
      let passed = 0;
      let total = 0;

      // Find all spec results belonging to this build
      const buildSpecs = results.filter((r) => r.buildId === b.id);

      buildSpecs.forEach((spec) => {
        // spec.tests is the JSON array from TiDB
        if (Array.isArray(spec.tests)) {
          spec.tests.forEach((t: any) => {
            total++;
            // Support both Playwright/Cypress status strings
            const status = t.status?.toLowerCase();
            if (status === 'passed' || status === 'expected' || status === 'success') {
              passed++;
            }
          });
        }
      });

      return {
        name: `#${b.id}`,
        passed,
        total,
      };
    });

    // Reverse so the chart flows from Oldest to Newest (Left to Right)
    return trendData.reverse();
  } catch (error: any) {
    console.error("❌ Trend Fetch Error:", error.message);
    return [];
  }
}