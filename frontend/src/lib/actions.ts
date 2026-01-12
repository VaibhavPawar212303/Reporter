"use server"

import { desc, eq } from 'drizzle-orm';
import { automationBuilds, testCases } from '../../db/schema';
import { revalidatePath } from "next/cache";
import { db } from '../../db';

// 1. Get Build History for Sidebar
export async function getBuildHistory() {
  try {
    return await db.query.automationBuilds.findMany({
      with: { results: true },
      orderBy: [desc(automationBuilds.id)],
    });
  } catch (error) {
    console.error("Database Fetch Error:", error);
    return [];
  }
}

// 2. Bulk Upload Test Cases (Handles your specific JSON structure)
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

// 3. Fetch Master List
export async function getMasterTestCases() {
  try {
    return await db.query.testCases.findMany({
      orderBy: [desc(testCases.updatedAt)]
    });
  } catch (error) {
    return [];
  }
}

// 4. Update Single Test Case
export async function updateTestCase(id: number, data: any) {
  try {
    // Exclude fields that shouldn't be manually updated or cause errors
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