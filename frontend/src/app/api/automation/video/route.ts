import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

// Vercel timeout: Hobby (10s), Pro (up to 300s)
export const maxDuration = 60; 

// Optimized HTTPS Agent to handle large streams and bypass IPv6 issues
const agent = new https.Agent({
  keepAlive: true,
  family: 4, // Forces IPv4 to prevent ETIMEDOUT on many network configurations
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId) return new Response("Missing File ID", { status: 400 });

  const apiKey = process.env.PIXELDRAIN_API_KEY;
  if (!apiKey) return new Response("Server API Key missing", { status: 500 });

  const auth = Buffer.from(`:${apiKey}`).toString('base64');

  try {
    console.log(`📡 [Proxy] Streaming video from Pixeldrain: ${fileId}`);

    const response = await axios({
      method: 'get',
      url: `https://pixeldrain.com/api/file/${fileId}`,
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      responseType: 'stream', // 🔥 CRITICAL: Pipe bytes as they arrive
      httpsAgent: agent,
      timeout: 120000, // 2-minute connection timeout
    });

    // We return a new Response, passing the Axios stream directly.
    // This bypasses Pixeldrain's "Hotlink Detected" because the 
    // request is coming from your SERVER, not the browser.
    return new Response(response.data as any, {
      headers: {
        'Content-Type': 'video/webm',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes', // 🔥 Allow the video player to scrub/skip time
      },
    });

  } catch (error: any) {
    console.error("❌ [Proxy Error]:", error.message);
    
    // Provide a clear error if the connection actually timed out
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new Response("Connection to Pixeldrain timed out", { status: 504 });
    }

    return new Response(error.message || "Failed to stream video", { status: 500 });
  }
}