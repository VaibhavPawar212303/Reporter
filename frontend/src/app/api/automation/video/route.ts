import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max for Vercel Hobby

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.PIXELDRAIN_API_KEY;

  if (!fileId || !apiKey) return new Response("Error: Missing Data", { status: 400 });

  try {
    const auth = Buffer.from(`:${apiKey}`).toString('base64');
    
    // 1. Capture the Range header from the user's browser
    const rangeHeader = req.headers.get('range');

    const headers: HeadersInit = {
      'Authorization': `Basic ${auth}`,
    };
    
    // 2. Forward the range request to Pixeldrain if it exists
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const response = await fetch(`https://pixeldrain.com/api/file/${fileId}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok && response.status !== 206) {
      return new Response(`Pixeldrain error: ${response.statusText}`, { status: response.status });
    }

    // 3. Forward the necessary headers back to the browser
    const responseHeaders = new Headers();
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range', // Required for seeking
      'accept-ranges',
      'cache-control'
    ];

    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });

    // Default Cache Control if not provided
    if (!responseHeaders.has('cache-control')) {
      responseHeaders.set('Cache-Control', 'public, max-age=3600');
    }

    // 4. Return the Web Stream directly
    // Status 206 means "Partial Content" (used for video seeking)
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error("❌ Proxy error:", error.message);
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}