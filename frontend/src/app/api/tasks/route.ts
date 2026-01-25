import { NextResponse } from 'next/server';

export async function GET() {
  const API_KEY = process.env.CLICKUP_API_KEY;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;

  try {
    let allTasks: any[] = [];
    let page = 0;
    let hasMore = true;

    // Mass Fetch Loop
    while (hasMore) {
      const query = new URLSearchParams({
        "page": page.toString(),
        "subtasks": "true",
        "include_closed": "true",
      });

      const res = await fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/task?${query}`, {
        headers: { 'Authorization': API_KEY || '' }
      });

      // Handle Rate Limits (429)
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }

      const data = await res.json();
      const tasks = data.tasks || [];

      if (tasks.length > 0) {
        allTasks = [...allTasks, ...tasks];
        // If we get less than 100, we've reached the end
        tasks.length < 100 ? (hasMore = false) : page++;
      } else {
        hasMore = false;
      }

      if (page > 50) break; // Safety cap ~5000 tasks
    }

    return NextResponse.json(allTasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}