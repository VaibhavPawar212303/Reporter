import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ keepAlive: true, family: 4 });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId) return new Response("Missing ID", { status: 400 });

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
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    return new Response("Video stream failed", { status: 500 });
  }
}