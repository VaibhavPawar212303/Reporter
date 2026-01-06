import axios from 'axios';
import https from 'https';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
// Vercel/Next.js max execution time
export const maxDuration = 60; 

// Optimized agent to prevent socket exhaustion
const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 100, // Handle more simultaneous requests
    family: 4 
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId || !apiKey) return new Response("Error: Missing Data", { status: 400 });

  try {
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    
    const response = await axios({
      method: 'get',
      url: `https://pixeldrain.com/api/file/${fileId}`,
      headers: { 'Authorization': `Basic ${auth}` },
      responseType: 'stream',
      httpsAgent: agent,
      // Increase timeout to 2 minutes for large videos
      timeout: 120000, 
    });

    // Extract useful headers from Pixeldrain
    const contentType = response.headers['content-type'] || 'video/webm';
    const contentLength = response.headers['content-length'];

    // Convert Node stream to Web stream for Next.js Response
    const stream = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk: any) => controller.enqueue(chunk));
        response.data.on('end', () => controller.close());
        response.data.on('error', (err: any) => controller.error(err));
      },
      cancel() {
        response.data.destroy(); // Clean up if user closes browser
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength || '',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });

  } catch (error: any) {
    console.error("❌ Proxy error:", error.message);
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}