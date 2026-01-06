import axios from 'axios';
import https from 'https';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const agent = new https.Agent({ keepAlive: true, family: 4 });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId || !apiKey) return new Response("Missing Data", { status: 400 });

  try {
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    const response = await axios({
      method: 'get',
      url: `https://pixeldrain.com/api/file/${fileId}`,
      headers: { 'Authorization': `Basic ${auth}` },
      responseType: 'stream',
      httpsAgent: agent,
      timeout: 30000,
    });

    return new Response(response.data as any, {
      headers: {
        'Content-Type': 'video/webm',
        'Accept-Ranges': 'bytes', // Allows scrubbing the video timeline
        'Content-Length': response.headers['content-length'] || '',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error("❌ Proxy error:", error.message);
    return new Response("Video stream failed", { status: 500 });
  }
}