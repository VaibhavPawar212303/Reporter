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

    // 1. Ensure the filename has the correct extension for streaming
    const safeFileName = file.name.endsWith('.webm') ? file.name : `${file.name}.webm`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const pixelForm = new FormData();
        pixelForm.append('file', file);
        pixelForm.append('name', safeFileName); // Explicit name help headers

        const pixelResponse = await fetch('https://pixeldrain.com/api/file', {
          method: 'POST',
          body: pixelForm,
          headers: { 'Authorization': `Basic ${auth}` },
          signal: AbortSignal.timeout(45000), 
        });

        const pixelData = await pixelResponse.json();

        if (pixelResponse.ok && pixelData.success) {
          // 🔥 FIX: Return the CLEAN URL without ?download=0
          const videoUrl = `https://pixeldrain.com/api/file/${pixelData.id}`;
          console.log(`✅ Pixeldrain Linked: ${videoUrl}`);
          
          return NextResponse.json({ videoUrl });
        }
      } catch (error: any) {
        if (attempt === 3) throw error;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } catch (error: any) {
    console.error("❌ Upload API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}