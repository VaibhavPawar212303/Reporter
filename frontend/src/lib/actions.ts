"use server"

import { desc, eq } from 'drizzle-orm';
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

/**
 * 5. Dashboard Stats
 * Relational query works with TiDB if schema is passed to drizzle()
 */
export async function getDashboardStats() {
  try {
    const allBuilds = await db.query.automationBuilds.findMany({
      with: { results: true }
    });
    const allMasterCases = await db.query.testCases.findMany();

    return {
      totalBuilds: allBuilds.length,
      totalRequirements: allMasterCases.length,
      builds: allBuilds,
      masterCases: allMasterCases
    };
  } catch (error) {
    return { totalBuilds: 0, totalRequirements: 0, builds: [], masterCases: [] };
  }
}

/**
 * 6. Get Build Details
 * ✅ CONVERTED: From Supabase to TiDB/Drizzle
 * In TiDB, we query 'testResults' based on the 'buildId'
 */
export async function getBuildDetails(buildId: number) {
  try {
    const data = await db.query.automationBuilds.findFirst({
      where: eq(automationBuilds.id, buildId),
      with: {
        results: true // This fetches all rows from 'test_results' for this build
      }
    });

    if (!data) return null;

    return {
      ...data,
      // Mapping to match your frontend expected structure
      results: data.results.map((spec) => ({
        id: spec.id,
        specFile: spec.specFile,
        // In TiDB we stored tests as a JSON array in the 'tests' column
        tests: spec.tests || [] 
      }))
    };
  } catch (error) {
    console.error(`❌ Error fetching details for build ${buildId}:`, error);
    return null;
  }
}

/**
 * 7. Get Test Steps 
 * ✅ CONVERTED: From Supabase to TiDB/Drizzle
 * Since steps are stored inside the JSON column 'tests' in 'test_results'
 */
export async function getTestSteps(specId: number, testTitle: string) {
  try {
    const record = await db.query.testResults.findFirst({
      where: eq(testResults.id, specId)
    });

    if (!record || !Array.isArray(record.tests)) return null;

    // Find the specific test inside the JSON array
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