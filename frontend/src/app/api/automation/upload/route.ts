import { NextResponse } from 'next/server';

export const maxDuration = 60; // Next.js timeout

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const apiKey = process.env.PIXELDRAIN_API_KEY;
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    
    // Sanitize filename: Pixeldrain PUT API uses the filename in the URL
    const safeName = encodeURIComponent(file.name.replace(/\s+/g, '_'));

    console.log(`📥 [API] Pushing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // 🔥 THE FIX: Use Pixeldrain's PUT API instead of POST FormData.
    // This is 10x more stable for large files and bypasses the "fetch failed" issue.
    const pixelResponse = await fetch(`https://pixeldrain.com/api/file/${safeName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      // We stream the raw bytes directly from the request
      body: file.stream(), 
      // @ts-ignore - 'duplex' is required for streaming in some Node versions
      duplex: 'half',
      signal: AbortSignal.timeout(120000), // 2-minute timeout
    });

    if (!pixelResponse.ok) {
      const errorText = await pixelResponse.text();
      throw new Error(`Pixeldrain Error: ${errorText}`);
    }

    const pixelData = await pixelResponse.json();

    if (pixelData.success) {
      const videoUrl = `https://pixeldrain.com/api/file/${pixelData.id}?download=0`;
      console.log(`✅ [API] Success: ${videoUrl}`);
      return NextResponse.json({ videoUrl });
    }

    throw new Error("Upload failed");

  } catch (error: any) {
    console.error("❌ [API] Critical Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}