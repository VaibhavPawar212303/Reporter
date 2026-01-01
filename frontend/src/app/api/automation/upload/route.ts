import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildId = formData.get('buildId');

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const fileName = `${buildId}/${Date.now()}_${file.name}`;

    // Upload to Supabase Storage (Dashboard side logic)
    const { data, error } = await supabase.storage
      .from('test-videos')
      .upload(fileName, file, { 
        contentType: file.type,
        upsert: true 
      });

    if (error) throw error;

    // Generate Public URL
    const { data: urlData } = supabase.storage
      .from('test-videos')
      .getPublicUrl(fileName);

    return NextResponse.json({ videoUrl: urlData.publicUrl });
  } catch (error: any) {
    console.error("Upload Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}