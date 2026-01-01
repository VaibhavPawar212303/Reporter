import { NextResponse } from 'next/server';

// 1. Increase the execution timeout (Essential for large file uploads)
// Note: On Vercel Hobby, max is 10s. Pro is up to 300s.
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 2. Check content length before processing to catch 413 early
    const contentLength = req.headers.get('content-length');
    const sizeInMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : "Unknown";
    
    console.log(`📥 Incoming upload request. Size: ${sizeInMB} MB`);

    // 3. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file) {
      return NextResponse.json({ error: "No file found in request" }, { status: 400 });
    }

    // 4. Prepare data for Discord
    // We recreate the FormData to ensure a clean stream to Discord
    const discordPayload = new FormData();
    discordPayload.append('file', file, file.name);
    discordPayload.append('content', `📹 **Recording for Build #${buildId}**\nFile: \`${file.name}\` (${sizeInMB} MB)`);

    console.log(`🚀 Forwarding to Discord Webhook...`);

    // 5. Send to Discord Webhook
    const discordResponse = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      body: discordPayload,
      // Increase timeout for the fetch call itself
      signal: AbortSignal.timeout(50000), 
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      
      // Handle Discord's specific 413 (File over 25MB)
      if (discordResponse.status === 413) {
        throw new Error("Discord rejected the upload: File exceeds Discord's 25MB limit.");
      }
      
      throw new Error(`Discord API Error (${discordResponse.status}): ${errorText}`);
    }

    const discordData = await discordResponse.json();

    // 6. Get the direct URL from Discord's CDN
    const videoUrl = discordData.attachments[0].url;
    console.log(`✅ Upload successful: ${videoUrl}`);

    return NextResponse.json({ videoUrl });
  } catch (error: any) {
    console.error("❌ Discord Upload Error:", error.message);
    
    // If the error is a 413 from the server/gateway
    if (error.message.includes('fetch failed') || error.message.includes('large')) {
        return NextResponse.json({ 
            error: "Payload Too Large: The video file exceeds the server limit." 
        }, { status: 413 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}