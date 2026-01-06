import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

export const maxDuration = 60;

// Force IPv4 and keep connections alive to prevent ETIMEDOUT
const agent = new https.Agent({
  keepAlive: true,
  family: 4, // Force IPv4
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file || file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    const safeName = `b${buildId}_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

    console.log(`📥 [API] Processing: ${safeName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Convert File to Buffer for stable Axios streaming
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create FormData for the Pixeldrain hop
    const pixelForm = new FormData();
    pixelForm.append('file', new Blob([buffer]), safeName);
    pixelForm.append('name', safeName);

    const pixelResponse = await axios.post('https://pixeldrain.com/api/file', pixelForm, {
      headers: { 
        'Authorization': `Basic ${auth}`,
      },
      httpsAgent: agent, // Use our optimized agent
      timeout: 120000, // 2 minutes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (pixelResponse.data.success) {
      // Return the direct URL
      const videoUrl = `https://pixeldrain.com/api/file/${pixelResponse.data.id}`;
      console.log(`✅ [API] Success: ${videoUrl}`);
      return NextResponse.json({ videoUrl });
    }

    throw new Error("Pixeldrain API rejected the file");

  } catch (error: any) {
    console.error("❌ [API] Upload Error:", error.message);
    if (error.response) console.error("Pixeldrain Data:", error.response.data);
    
    return NextResponse.json({ 
      error: error.message,
      cause: error.code // Will show ETIMEDOUT or ECONNRESET
    }, { status: 500 });
  }
}