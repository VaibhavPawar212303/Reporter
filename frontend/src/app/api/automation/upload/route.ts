import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');

    // 🔥 FIX: Sanitize the filename. Remove spaces and special characters.
    // Pixeldrain's API is very sensitive to the "name" field.
    const cleanFileName = file.name
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove symbols like ( ) [ ]
      .concat(file.name.endsWith('.webm') ? '' : '.webm');

    console.log(`📥 API Received: ${cleanFileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Internal Retry Logic
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const pixelForm = new FormData();
        pixelForm.append('file', file);
        pixelForm.append('name', cleanFileName);

        const pixelResponse = await fetch('https://pixeldrain.com/api/file', {
          method: 'POST',
          body: pixelForm,
          headers: { 'Authorization': `Basic ${auth}` },
          signal: AbortSignal.timeout(40000), 
        });

        const pixelData = await pixelResponse.json();

        if (pixelResponse.ok && pixelData.success) {
          const videoUrl = `https://pixeldrain.com/api/file/${pixelData.id}`;
          console.log(`✅ Pixeldrain Linked: ${videoUrl}`);
          return NextResponse.json({ videoUrl });
        } else {
          throw new Error(pixelData.message || "Pixeldrain rejected upload");
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`⚠️ Internal attempt ${attempt} failed: ${err.message}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw lastErr;

  } catch (error: any) {
    // This log will tell you EXACTLY why the 500 is happening
    console.error("❌ CRITICAL UPLOAD ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}