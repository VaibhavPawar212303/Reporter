import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');

    if (!file || file.size === 0) return NextResponse.json({ error: "Empty" }, { status: 400 });

    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
    console.log(`📥 [API] Processing: ${safeName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // 🔥 Use native fetch with a simple FormData object
    // This is more memory efficient than converting to a large Buffer
    const pixelForm = new FormData();
    pixelForm.append('file', file);
    pixelForm.append('name', safeName);

    const pixelResponse = await fetch('https://pixeldrain.com/api/file', {
      method: 'POST',
      body: pixelForm,
      headers: { 'Authorization': `Basic ${auth}` },
      // Important: prevent timeout
      signal: AbortSignal.timeout(120000), 
    });

    const pixelData = await pixelResponse.json();

    if (pixelResponse.ok && pixelData.success) {
      const videoUrl = `https://pixeldrain.com/api/file/${pixelData.id}`;
      console.log(`✅ [API] Success: ${videoUrl}`);
      return NextResponse.json({ videoUrl });
    }

    throw new Error(pixelData.message || "Pixeldrain upload failed");

  } catch (error: any) {
    console.error("❌ [API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}