import { NextResponse } from 'next/server';
import axios from 'axios';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file || file.size === 0) return NextResponse.json({ error: "Empty" }, { status: 400 });

    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    const safeName = `b${buildId}_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

    console.log(`📥 [API] Starting upload: ${safeName}`);

    // Convert File to Buffer for Axios
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 🔥 Switch from fetch to Axios for the internal request
    // Pixeldrain expects the file in a field named 'file'
    const pixelForm = new FormData();
    pixelForm.append('file', new Blob([buffer]), safeName);
    pixelForm.append('name', safeName);

    const pixelResponse = await axios.post('https://pixeldrain.com/api/file', pixelForm, {
      headers: { 
        'Authorization': `Basic ${auth}`,
      },
      timeout: 55000, // 55 seconds
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (pixelResponse.data.success) {
      const videoUrl = `https://pixeldrain.com/api/file/${pixelResponse.data.id}?download=0`;
      console.log(`✅ [API] Success: ${videoUrl}`);
      return NextResponse.json({ videoUrl });
    }

    throw new Error("Pixeldrain returned success: false");

  } catch (error: any) {
    // 🔥 This will print the HIDDEN reason for "fetch failed"
    console.error("❌ [API] CRITICAL ERROR DETAILS:");
    console.error("Message:", error.message);
    if (error.cause) console.error("Cause:", error.cause); 
    if (error.response) console.error("Pixeldrain Response:", error.response.data);

    return NextResponse.json({ 
      error: error.message,
      cause: error.cause?.message || "Unknown socket error"
    }, { status: 500 });
  }
}