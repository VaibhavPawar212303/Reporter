import { NextResponse } from 'next/server';

// Increase timeout for streaming large videos
export const maxDuration = 60; 

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId) return new Response("Missing File ID", { status: 400 });

  const apiKey = process.env.PIXELDRAIN_API_KEY;
  const auth = Buffer.from(`:${apiKey}`).toString('base64');

  try {
    // We make a server-to-server request to Pixeldrain using your API Key
    const response = await fetch(`https://pixeldrain.com/api/file/${fileId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
        console.error(`❌ Proxy failed: Pixeldrain returned ${response.status}`);
        return new Response("Video not found or access denied", { status: response.status });
    }

    // Forward the video stream with correct headers
    // This bypasses Pixeldrain's "Hotlink Detection" entirely
    return new Response(response.body, {
      headers: {
        'Content-Type': 'video/webm',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': 'inline', // Ensures it plays in browser
      },
    });
  } catch (error: any) {
    console.error("❌ Proxy error:", error.message);
    return new Response("Internal Server Error", { status: 500 });
  }
}