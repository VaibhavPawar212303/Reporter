import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../../db';
import { automationBuilds, testResults } from '../../../../../db/schema';


// 1. ANSI Cleaning Utility
const cleanText = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text.replace(
    /[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, 
    ''
  );
};

export async function POST(req: Request) {
  const body = await req.json();
  const { build_id, spec_file, test_entry } = body;

  return await db.transaction(async (tx) => {
    // 1. Get existing record
    const existing = await tx.query.testResults.findFirst({
      where: and(eq(testResults.buildId, build_id), eq(testResults.specFile, spec_file))
    });

    let tests = existing ? (existing.tests as any[]) : [];
    const idx = tests.findIndex(t => t.title === test_entry.title && t.project === test_entry.project);

    if (idx !== -1) {
      // 2. LOG APPENDING LOGIC
      const currentLogs = tests[idx].logs || [];
      if (test_entry.log_chunk) {
        currentLogs.push(`[${new Date().toLocaleTimeString()}] ${test_entry.log_chunk}`);
      }

      // 3. Status/Data Update
      tests[idx] = {
        ...tests[idx],
        ...test_entry,
        logs: currentLogs,
        // Ensure status doesn't move backwards (e.g., from failed to running)
        status: test_entry.status || tests[idx].status
      };
    } else {
      // Create new entry
      tests.push({ ...test_entry, logs: test_entry.logs || [] });
    }

    // 4. Atomic Upsert to TiDB
    await tx.insert(testResults)
      .values({ buildId: build_id, specFile: spec_file, tests })
      .onDuplicateKeyUpdate({ set: { tests } });

    return NextResponse.json({ success: true });
  });
}