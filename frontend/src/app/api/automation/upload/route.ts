import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    const catForm = new FormData();
    catForm.append('reqtype', 'fileupload');
    catForm.append('fileToUpload', file);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catForm,
    });

    const videoUrl = await response.text(); // Catbox returns plain text URL
    return NextResponse.json({ videoUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}