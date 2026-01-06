import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

export const maxDuration = 60; // Next.js timeout

// 🔥 FIX: Create a dedicated agent to force IPv4 and prevent ETIMEDOUT
const agent = new https.Agent({
  keepAlive: true,
  family: 4, // 4 = Force IPv4. Prevents slow IPv6 lookup hangups.
  timeout: 60000,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    
    // Clean filename for the API
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');

    console.log(`📥 [API] Streaming to Pixeldrain: ${safeName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Prepare internal FormData for the hop to Pixeldrain
    const pixelForm = new FormData();
    // Use a Blob to make it compatible with Axios and modern Node
    const arrayBuffer = await file.arrayBuffer();
    pixelForm.append('file', new Blob([arrayBuffer]), safeName);
    pixelForm.append('name', safeName);

    // 🔥 Use Axios for the internal request with the optimized agent
    const pixelResponse = await axios.post('https://pixeldrain.com/api/file', pixelForm, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      httpsAgent: agent,
      timeout: 120000, // 2 minutes for the total upload
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (pixelResponse.data.success) {
      const videoUrl = `https://pixeldrain.com/api/file/${pixelResponse.data.id}?download=0`;
      console.log(`✅ [API] Success: ${videoUrl}`);
      return NextResponse.json({ videoUrl });
    }

    throw new Error("Pixeldrain upload was not successful");

  } catch (error: any) {
    console.error("❌ [API] Upload Error:", error.message);
    
    // Check if the error is a timeout
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return NextResponse.json({ error: "Connection to Pixeldrain timed out. Server might be busy." }, { status: 504 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}