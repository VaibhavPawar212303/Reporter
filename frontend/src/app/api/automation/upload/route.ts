import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Catbox requires:
    // 1. reqtype: 'fileupload'
    // 2. userhash: (optional)
    // 3. fileToUpload: (the actual file)
    const catForm = new FormData();
    catForm.append('reqtype', 'fileupload');
    catForm.append('fileToUpload', file);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catForm,
      // IMPORTANT: In Next.js/Node, do NOT manually set the Content-Type header
      // when sending FormData; fetch will automatically add the 'boundary' string.
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Catbox Error: ${errorText}`);
    }

    const videoUrl = await response.text(); // Catbox returns the URL as plain text

    // Check if Catbox returned an error string instead of a URL
    if (videoUrl.startsWith('Filters') || videoUrl.includes('error')) {
      return NextResponse.json({ error: videoUrl }, { status: 400 });
    }

    return NextResponse.json({ videoUrl: videoUrl.trim() });
  } catch (error: any) {
    console.error("Upload Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}