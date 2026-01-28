"use server"

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { automationBuilds, organizationMembers, projects, testCases, testResults, users } from '../../db/schema';
import { revalidatePath } from "next/cache";
import { db } from '../../db';
import { auth } from '@clerk/nextjs/server';



export async function getDashboardStats() {
  const builds = await db.select().from(automationBuilds).orderBy(desc(automationBuilds.id)).limit(50);
  const totalRequirements = await db.select({ count: sql<number>`count(*)` }).from(testCases);

  // Fetch results for these specific builds only to save RUs
  const buildIds = builds.map(b => b.id);
  const results = buildIds.length > 0
    ? await db.select().from(testResults).where(inArray(testResults.buildId, buildIds))
    : [];

  return {
    builds,
    results, // These are the rows containing the JSON 'tests' column
    totalRequirements: totalRequirements[0]?.count || 0
  };
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

export async function uploadMasterTestCases(data: any[], projectId: number) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return { error: 'No organization found' };
    }

    // Verify project belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.organizationId, membership.organizationId)
      ),
    });

    if (!project) {
      return { error: 'Project not found or access denied' };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of data) {
      const code = item['Case code'] || item.caseCode;
      const title = item['Title'] || item.title;

      if (!code || !title) {
        skipped++;
        continue;
      }

      // Check if test case already exists for this org
      const existing = await db.query.testCases.findFirst({
        where: and(
          eq(testCases.organizationId, membership.organizationId),
          eq(testCases.caseCode, String(code))
        ),
      });

      if (existing) {
        // Update existing test case
        await db
          .update(testCases)
          .set({
            title: String(title),
            moduleName: String(item['ModuleName'] || item['Module Name'] || ''),
            testSuite: String(item['Test Suite'] || ''),
            description: String(item['Description'] || ''),
            precondition: String(item['Precondition'] || ''),
            steps: String(item['Steps'] || ''),
            expectedResult: String(item['ExpectedResult'] || ''),
            type: String(item['Type'] || ''),
            priority: String(item['Priorities'] || item.priority || 'medium'),
            mode: String(item['Mode'] || 'Automation'),
            tags: String(item['Tags'] || ''),
          })
          .where(eq(testCases.id, existing.id));
        updated++;
      } else {
        // Insert new test case
        await db.insert(testCases).values({
          projectId: projectId,
          organizationId: membership.organizationId,
          caseCode: String(code),
          caseKey: String(item['Case API Key'] || item['Case Key'] || ''),
          moduleName: String(item['ModuleName'] || item['Module Name'] || ''),
          testSuite: String(item['Test Suite'] || ''),
          title: String(title),
          description: String(item['Description'] || ''),
          precondition: String(item['Precondition'] || ''),
          steps: String(item['Steps'] || ''),
          expectedResult: String(item['ExpectedResult'] || ''),
          type: String(item['Type'] || ''),
          priority: String(item['Priorities'] || item.priority || 'medium'),
          mode: String(item['Mode'] || 'Automation'),
          createdById: userId,
          tags: String(item['Tags'] || ''),
        });
        inserted++;
      }
    }

    revalidatePath('/test-cases');
    revalidatePath('/');
    revalidatePath(`/projects/${projectId}`);

    return {
      success: true,
      stats: {
        total: data.length,
        inserted,
        updated,
        skipped,
      },
    };
  } catch (e: any) {
    console.error('❌ TiDB Insert Error:', e);
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





export async function getPlaywrightTrend(projectId?: number) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return { error: 'No organization found' };
    }

    // Build query conditions
    const conditions = [
      eq(automationBuilds.type, 'playwright'),
      eq(automationBuilds.organizationId, membership.organizationId),
    ];

    // Optionally filter by project
    if (projectId) {
      conditions.push(eq(automationBuilds.projectId, projectId));
    }

    // Get last 10 builds
    const builds = await db
      .select({ id: automationBuilds.id })
      .from(automationBuilds)
      .where(and(...conditions))
      .orderBy(desc(automationBuilds.id))
      .limit(10);

    if (builds.length === 0) return [];

    const buildIds = builds.map((b) => b.id);

    // Get results for these builds
    const results = await db
      .select()
      .from(testResults)
      .where(
        and(
          inArray(testResults.buildId, buildIds),
          eq(testResults.organizationId, membership.organizationId)
        )
      );

    // Calculate trend data
    return builds
      .map((b) => {
        let passed = 0,
          failed = 0,
          total = 0;

        const buildSpecs = results.filter((r) => r.buildId === b.id);

        buildSpecs.forEach((spec) => {
          (spec.tests as any[])?.forEach((t) => {
            if (t.is_final) {
              total++;
              const status = t.status?.toLowerCase();
              if (['passed', 'expected', 'success'].includes(status)) {
                passed++;
              } else if (['failed', 'unexpected', 'error'].includes(status)) {
                failed++;
              }
            }
          });
        });

        return {
          name: `#${b.id}`,
          passed,
          failed,
          total,
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        };
      })
      .reverse();
  } catch (e: any) {
    console.error('getPlaywrightTrend error:', e.message);
    return [];
  }
}
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
export async function deleteTestCase(id: number) {
  try {
    await db.delete(testCases).where(eq(testCases.id, id));
    return { success: true };
  } catch (e: any) {
    console.error("DELETE_ERROR:", e.message);
    return { error: e.message };
  }
}
export async function moveModule(oldPath: string, newPath: string) {
  try {
    // Finds all test cases starting with the old folder path and renames them
    // SQL: UPDATE test_cases SET module_name = REPLACE(module_name, 'Old', 'New') 
    // WHERE module_name LIKE 'Old%'
    await db.update(testCases)
      .set({
        moduleName: sql`REPLACE(${testCases.moduleName}, ${oldPath}, ${newPath})`,
        updatedAt: new Date()
      })
      .where(sql`${testCases.moduleName} LIKE ${oldPath + '%'}`);

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
export async function getAutomationTrend() {
  try {
    const result = await db.execute(sql`
      SELECT DATE(updated_at) as date, COUNT(*) as count
      FROM test_cases
      WHERE mode = 'Automation' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)
      GROUP BY DATE(updated_at) ORDER BY date ASC
    `);

    const rows = (result as any)[0] || [];
    const statsMap = new Map(rows.map((r: any) => [new Date(r.date).toISOString().split('T')[0], r.count]));

    const trendData = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendData.push({
        name: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        automated: statsMap.get(dateStr) || 0
      });
    }
    return trendData;
  } catch (e) { return []; }
}
export async function createProject(formData: {
  name: string;
  type: string;
  environment: string;
  description?: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return { success: false, error: 'No organization found' };
    }

    const res = await db.insert(projects).values({
      organizationId: membership.organizationId,
      name: formData.name.toUpperCase(),
      type: formData.type.toLowerCase(),
      environment: formData.environment.toLowerCase(),
      description: formData.description || '',
    });

    const insertedId = (res as any).lastInsertId || (res as any)[0]?.insertId;

    // Revalidate paths
    revalidatePath('/projects');
    revalidatePath('/dashboard');

    return { success: true, id: insertedId };
  } catch (error: any) {
    console.error('Project Creation Error:', error);
    return { success: false, error: error.message || 'Failed to register project' };
  }
}

export async function getBuildDetails(buildId: number) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 getBuildDetails called with buildId:', buildId);
    console.log('='.repeat(60));

    const { userId } = await auth();
    console.log('📋 Step 1: userId:', userId);

    if (!userId) {
      console.log('❌ No userId found');
      return { error: 'Unauthorized' };
    }

    // Get user's organization
    console.log('📋 Step 2: Getting organization membership');
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });
    console.log('   - Membership:', membership);

    if (!membership) {
      console.log('❌ No organization found for user');
      return { error: 'No organization found' };
    }

    console.log('   - Organization ID:', membership.organizationId);

    // Get build (simple query without 'with')
    console.log('📋 Step 3: Getting build');
    console.log('   - Looking for buildId:', buildId);
    console.log('   - With organizationId:', membership.organizationId);

    const build = await db
      .select()
      .from(automationBuilds)
      .where(
        and(
          eq(automationBuilds.id, buildId),
          eq(automationBuilds.organizationId, membership.organizationId)
        )
      )
      .limit(1);

    console.log('   - Build query result:', build);
    console.log('   - Build length:', build?.length);

    if (!build || build.length === 0) {
      console.log('❌ Build not found');
      
      // Debug: Check if build exists without org filter
      const buildWithoutOrg = await db
        .select()
        .from(automationBuilds)
        .where(eq(automationBuilds.id, buildId))
        .limit(1);
      
      console.log('   - Build without org filter:', buildWithoutOrg);
      if (buildWithoutOrg.length > 0) {
        console.log('   - Build exists but has different organizationId:', buildWithoutOrg[0].organizationId);
      }
      
      return null;
    }

    const buildData = build[0];
    console.log('✅ Build found:', {
      id: buildData.id,
      projectId: buildData.projectId,
      organizationId: buildData.organizationId,
      status: buildData.status,
    });

    // Get project separately
    console.log('📋 Step 4: Getting project');
    let project = null;
    if (buildData.projectId) {
      const projectResult = await db
        .select()
        .from(projects)
        .where(eq(projects.id, buildData.projectId))
        .limit(1);
      project = projectResult[0] || null;
      console.log('   - Project:', project?.name);
    }

    // Get triggered by user separately
    console.log('📋 Step 5: Getting triggered by user');
    let triggeredBy = null;
    if (buildData.triggeredById) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, buildData.triggeredById))
        .limit(1);
      triggeredBy = userResult[0] || null;
      console.log('   - Triggered by:', triggeredBy?.email);
    }

    // Get test results for this build
    console.log('📋 Step 6: Getting test results');
    const results = await db
      .select()
      .from(testResults)
      .where(eq(testResults.buildId, buildId));
    console.log('   - Results count:', results.length);

    const finalResult = {
      ...buildData,
      project: project,
      triggeredBy: triggeredBy,
      results: results.map((r) => ({
        ...r,
        tests: Array.isArray(r.tests)
          ? (r.tests as any[]).map((t) => ({
              ...t,
              has_details: !!(t.steps?.length || t.logs?.length || t.error),
            }))
          : [],
      })),
    };

    console.log('✅ Final result:', {
      buildId: finalResult.id,
      projectName: finalResult.project?.name,
      resultsCount: finalResult.results.length,
      totalTests: finalResult.results.reduce((acc, r) => acc + r.tests.length, 0),
    });
    console.log('='.repeat(60) + '\n');

    return finalResult;
  } catch (e: any) {
    console.error('❌ getBuildDetails error:', e.message);
    console.error('   Stack:', e.stack);
    return null;
  }
}
export async function getProjects() {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  // Get user's organization
  const membership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
  });

  if (!membership) {
    return [];
  }

  // Fetch projects for the user's organization
  const result = await db.select({
    id: projects.id,
    name: projects.name,
    type: projects.type,
    environment: projects.environment,
    description: projects.description,
    organizationId: projects.organizationId,
    createdAt: projects.createdAt,
    // Count builds linked to this project
    executionCount: sql<number>`(SELECT COUNT(*) FROM automation_builds WHERE automation_builds.project_id = ${projects.id})`,
    // Count test cases linked to this project
    totalCases: sql<number>`(SELECT COUNT(*) FROM test_cases WHERE test_cases.project_id = ${projects.id})`,
  })
  .from(projects)
  .where(eq(projects.organizationId, membership.organizationId));

  // Map to add UI colors
  const colors = ['indigo', 'amber', 'emerald', 'rose', 'cyan', 'violet'];

  return result.map((p, index) => ({
    ...p,
    color: colors[index % colors.length],
    coverage: p.totalCases > 0 ? '100%' : '0%',
  }));
}
export async function getProjectById(id: number) {
  const res = await db.select().from(projects).where(eq(projects.id, id));
  return res[0];
}
export async function getBuildsByProjectAndType(projectId: number, type: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return { error: 'No organization found' };
    }

    // Verify project belongs to user's organization
    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, membership.organizationId)
        )
      )
      .limit(1);

    if (!project || project.length === 0) {
      return { error: 'Project not found or access denied' };
    }

    // Get builds for this project and type
    const builds = await db
      .select()
      .from(automationBuilds)
      .where(
        and(
          eq(automationBuilds.projectId, projectId),
          eq(automationBuilds.type, type.toLowerCase()),
          eq(automationBuilds.organizationId, membership.organizationId)
        )
      )
      .orderBy(desc(automationBuilds.createdAt));

    return builds;
  } catch (e: any) {
    console.error('getBuildsByProjectAndType error:', e.message);
    return { error: e.message };
  }
}





export async function getTestCasesByProject(projectId: number) {
  return await db.select()
    .from(testCases)
    .where(eq(testCases.projectId, projectId))
    .orderBy(desc(testCases.createdAt));
}
export async function createTestCase(data: {
  projectId: number;
  caseCode: string;
  title: string;
  moduleName?: string;
  priority?: string;
  steps?: string;
  expectedResult?: string;
  description?: string;
  precondition?: string;
  testSuite?: string;
  tags?: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      return { success: false, error: 'No organization found' };
    }

    // Verify project belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, Number(data.projectId)),
        eq(projects.organizationId, membership.organizationId)
      ),
    });

    if (!project) {
      return { success: false, error: 'Project not found or access denied' };
    }

    // Check if case code already exists in this organization
    const existingCase = await db.query.testCases.findFirst({
      where: and(
        eq(testCases.organizationId, membership.organizationId),
        eq(testCases.caseCode, data.caseCode.toUpperCase())
      ),
    });

    if (existingCase) {
      return { success: false, error: 'Case code already exists' };
    }

    const res = await db.insert(testCases).values({
      projectId: Number(data.projectId),
      organizationId: membership.organizationId,
      createdById: userId,
      caseCode: data.caseCode.toUpperCase(),
      title: data.title,
      moduleName: data.moduleName || 'GENERAL',
      priority: data.priority || 'medium',
      steps: data.steps || '',
      expectedResult: data.expectedResult || '',
      description: data.description || '',
      precondition: data.precondition || '',
      testSuite: data.testSuite || '',
      tags: data.tags || '',
      type: 'manual',
    });

    const insertedId = (res as any).lastInsertId || (res as any)[0]?.insertId;

    revalidatePath(`/projects/${data.projectId}`);
    revalidatePath(`/projects/${data.projectId}/manual`);
    revalidatePath('/test-cases');

    return { success: true, id: insertedId };
  } catch (error: any) {
    console.error('DB Error:', error);
    return { success: false, error: error.message };
  }
}
export async function getProjectManualStats(projectId: number) {
  const allCases = await db.select().from(testCases).where(eq(testCases.projectId, projectId));

  // Group by Module
  const modules = allCases.reduce((acc: any, tc) => {
    const mod = tc.moduleName || "UNASSIGNED";
    if (!acc[mod]) acc[mod] = { name: mod, auto: 0, man: 0, total: 0 };
    acc[mod].total++;
    // Logic: If mode is 'Automation' it counts as Auto, else Manual
    if (tc.mode?.toLowerCase() === 'automation') acc[mod].auto++;
    else acc[mod].man++;
    return acc;
  }, {});

  const total = allCases.length;
  const auto = allCases.filter(c => c.mode?.toLowerCase() === 'automation').length;
  const man = total - auto;

  return {
    stats: {
      total,
      auto,
      man,
      roi: total > 0 ? Math.round((auto / total) * 100) : 0
    },
    moduleList: Object.values(modules)
  };
}

const forceSlice = (val: any, limit: number, fallback: string | null = null) => {
  if (val === undefined || val === null || val === "" || val === "-") return fallback;
  return String(val).trim().slice(0, limit);
};
export async function importTestCases(projectId: number, dataArray: any[]) {
  try {
    // 1. GET AUTH CONTEXT
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // 2. GET USER'S ORGANIZATION ID
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) return { success: false, error: "No organization found for user" };
    const orgId = membership.organizationId;

    // 3. MAP DATA TO SCHEMA (Injecting orgId and projectId)
    const formattedData = dataArray.map((item, index) => {
      const find = (key: string) => {
        const normalizedSearch = key.toLowerCase().replace(/[\s_]/g, "");
        const targetKey = Object.keys(item).find((actualKey) => {
          return actualKey.toLowerCase().replace(/[\s_]/g, "") === normalizedSearch;
        });
        return targetKey ? item[targetKey] : undefined;
      };

      return {
        projectId: Number(projectId),
        organizationId: orgId, // FIXED: Now explicitly passed to every row
        caseCode: forceSlice(find('caseCode') || find('case_code'), 100) || `TC-AUTO-${Date.now()}-${index}`,
        caseKey: forceSlice(find('caseKey'), 100),
        moduleName: forceSlice(find('moduleName') || find('module_name'), 100, 'GENERAL'),
        testSuite: forceSlice(find('testSuite') || find('test_suite'), 100),
        title: String(find('title') || 'Untitled Case'),
        description: find('description') ? String(find('description')) : null,
        precondition: find('precondition') ? String(find('precondition')) : null,
        steps: find('steps') ? String(find('steps')) : null,
        expectedResult: find('expectedResult') || find('expected_result') ? String(find('expectedResult') || find('expected_result')) : null,
        priority: forceSlice(find('priorities') || find('priority'), 20, 'medium'),
        mode: forceSlice(find('mode'), 50, 'manual'),
        type: forceSlice(find('type'), 50, 'standard'),
        createdById: userId, // Link to the user who uploaded
        shareableLink: find('shareableTestCaseDetails') || find('shareable_link') ? String(find('shareableTestCaseDetails') || find('shareable_link')) : null,
        tags: find('tags') ? String(find('tags')) : null,
      };
    });

    // 4. CHUNKED BATCH UPSERT (Optimized for TiDB)
    const chunkSize = 40; 
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);
      
      await db.insert(testCases)
        .values(chunk as any)
        .onDuplicateKeyUpdate({
          set: {
            title: sql`VALUES(title)`,
            //@ts-ignore
            module_name: sql`VALUES(module_name)`,
            description: sql`VALUES(description)`,
            steps: sql`VALUES(steps)`,
            expected_result: sql`VALUES(expected_result)`,
            priority: sql`VALUES(priority)`,
            tags: sql`VALUES(tags)`,
            updatedAt: new Date()
          }
        });
    }
    
    revalidatePath(`/projects/${projectId}/manual`);
    return { success: true, count: formattedData.length };

  } catch (error: any) {
    console.error("IMPORT_CRITICAL_ERROR:", error);
    return { success: false, error: error.message };
  }
}