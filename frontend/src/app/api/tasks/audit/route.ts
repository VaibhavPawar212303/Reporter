import { NextResponse } from 'next/server';

export async function GET() {
  const { 
    CLICKUP_API_KEY: API_KEY, 
    CLICKUP_TEAM_ID: TEAM_ID, 
    BUG_TYPE_ID, 
    HOTFIX_TYPE_ID 
  } = process.env;

  try {
    let allDefects: any[] = [];
    let page = 0;
    let hasMore = true;

    // FLOW: Recursive Crawler
    while (hasMore) {
      // 1. We query the entire TEAM level to catch bugs across all folders/lists
      // 2. We filter by custom_items[] to target ONLY your Bug and Hotfix types
      const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task` + 
                  `?subtasks=true` +
                  `&include_closed=true` +
                  `&page=${page}` +
                  `&custom_items[]=${BUG_TYPE_ID}` +
                  `&custom_items[]=${HOTFIX_TYPE_ID}`;

      const res = await fetch(url, {
        headers: { 'Authorization': API_KEY || '' },
      });

      const data = await res.json();

      if (data.tasks && data.tasks.length > 0) {
        allDefects = [...allDefects, ...data.tasks];
        page++;
      } else {
        hasMore = false;
      }

      // Safety: Prevent timeout (usually covers ~5000 bugs)
      if (page > 50) break;
    }

    return NextResponse.json(allDefects);
  } catch (error) {
    return NextResponse.json({ error: 'Deep Scan Connection Failed' }, { status: 500 });
  }
}