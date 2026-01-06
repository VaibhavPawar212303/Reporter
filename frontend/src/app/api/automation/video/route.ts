// app/api/automation/video/route.ts
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ keepAlive: true, family: 4 });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId || !apiKey) return new Response("Error", { status: 400 });

  try {
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    const response = await axios({
      method: 'get',
      url: `https://pixeldrain.com/api/file/${fileId}`,
      headers: { 'Authorization': `Basic ${auth}` },
      responseType: 'stream',
      httpsAgent: agent,
    });

    return new Response(response.data as any, {
      headers: {
        'Content-Type': 'video/webm',
        'Accept-Ranges': 'bytes',
        'Content-Length': response.headers['content-length'], // 🔥 Helps the browser player
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    return new Response("Streaming failed", { status: 500 });
  }
}