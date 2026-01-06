import { NextRequest } from 'next/server';
import axios from 'axios';
import https from 'https';

export const dynamic = 'force-dynamic';
// Vercel execution limit (Hobby is 10s, Pro is up to 300s)
export const maxDuration = 60; 

// 🔥 THE FIX: Force IPv4 and keep connections alive
const agent = new https.Agent({
  keepAlive: true,
  family: 4, // 4 = Force IPv4. Prevents the "connect ETIMEDOUT" caused by slow IPv6 lookups.
  timeout: 60000,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId) return new Response("Missing ID", { status: 400 });
  if (!apiKey) return new Response("API Key not set", { status: 500 });

  try {
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    
    console.log(`📡 [Proxy] Connecting to Pixeldrain (IPv4): ${fileId}`);

    const response = await axios({
      method: 'get',
      url: `https://pixeldrain.com/api/file/${fileId}`,
      headers: { 'Authorization': `Basic ${auth}` },
      responseType: 'stream', // 🔥 Stream the bytes directly
      httpsAgent: agent,      // Use the optimized IPv4 agent
      timeout: 30000,         // 30s timeout for the connection
    });

    // Convert the Axios Node stream to a Web ReadableStream for Next.js Response
    const stream = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk: any) => controller.enqueue(chunk));
        response.data.on('end', () => controller.close());
        response.data.on('error', (err: any) => controller.error(err));
      },
      cancel() {
        response.data.destroy();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'video/webm',
        'Accept-Ranges': 'bytes', // Essential for the video seek bar
        'Content-Length': response.headers['content-length'] || '',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error("❌ [Proxy Error]:", error.message);
    
    if (error.code === 'ETIMEDOUT') {
      return new Response("Storage provider connection timed out", { status: 504 });
    }

    return new Response("Failed to stream video", { status: 500 });
  }
}