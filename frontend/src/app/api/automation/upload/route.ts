import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    // 1. Prepare data for Discord
    const discordPayload = new FormData();
    // Use the native File object received from the request
    discordPayload.append('file', file, file.name);
    discordPayload.append('content', `📹 **Recording for Build #${buildId}**\nFile: \`${file.name}\``);

    // 2. Send to Discord Webhook
    const discordResponse = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      body: discordPayload,
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      throw new Error(`Discord API Error: ${errorText}`);
    }

    const discordData = await discordResponse.json();

    // 3. Discord returns an array of 'attachments'. Get the direct URL.
    const videoUrl = discordData.attachments[0].url;

    // Return the URL to the Runner (Playwright/Cypress)
    return NextResponse.json({ videoUrl });
  } catch (error: any) {
    console.error("❌ Discord Upload Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}