"use server"

import { desc, eq } from 'drizzle-orm';
import { automationBuilds, testCases } from '../../db/schema';
import { revalidatePath } from "next/cache";
import { db } from '../../db';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. Get Build History for Sidebar (Optimized: Removed "with results" to save local memory/bandwidth)
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

// 2. Bulk Upload Test Cases (Unchanged)
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
        .onConflictDoUpdate({
          target: [testCases.caseCode],
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
    console.error("❌ DB Insert Error:", e);
    return { error: e.message };
  }
}

// 3. Fetch Master List (Unchanged)
export async function getMasterTestCases() {
  try {
    return await db.query.testCases.findMany({
      orderBy: [desc(testCases.updatedAt)]
    });
  } catch (error) {
    return [];
  }
}

// 4. Update Single Test Case (Unchanged)
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

// 5. Dashboard Stats (Unchanged)
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

// 6. Get Build Details (Modified: Removed "steps" and "stack_trace" to prevent Quota Violation)
export async function getBuildDetails(buildId: number) {
  try {
    const { data, error } = await supabase
      .from('builds')
      .select(`
        id,
        status,
        environment,
        createdAt,
        spec_results (
          id,
          specFile:spec_file,
          videoUrl:video_url,
          test_results (
            id,
            title,
            full_title,
            status,
            duration,
            error,
            case_codes,
            screenshot_url,
            browser,
            os,
            current_retry
          )
        )
      `)
      .eq('id', buildId)
      .single();

    if (error) throw error;

    return {
      ...data,
      results: data.spec_results.map((spec: any) => ({
        id: spec.id,
        specFile: spec.specFile,
        videoUrl: spec.videoUrl,
        tests: spec.test_results || []
      }))
    };
  } catch (error) {
    console.error(`❌ Error fetching details for build ${buildId}:`, error);
    return null;
  }
}

// 🔥 REQUIRED ADDITION: 7. Get Test Steps (Fetch heavy data only when needed)
export async function getTestSteps(testId: string) {
  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('steps, stack_trace')
      .eq('id', testId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`❌ Error fetching steps for test ${testId}:`, error);
    return null;
  }
}