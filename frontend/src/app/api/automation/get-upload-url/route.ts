import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { fileName } = await req.json();
    
    // Create a Signed URL that is valid for 60 seconds
    // This allows a direct upload to the 'test-videos' bucket
    const { data, error } = await supabase.storage
      .from('test-videos')
      .createSignedUploadUrl(fileName);

    if (error) throw error;

    // This URL allows the client to upload WITHOUT knowing your secret keys
    return NextResponse.json({ 
      uploadUrl: data.signedUrl,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/test-videos/${fileName}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}