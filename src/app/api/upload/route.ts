import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum 5MB limit' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    let ext = 'jpg';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';

    const fileId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const filename = `${fileId}.${ext}`;

    const uploadDir = path.join(process.cwd(), '.data', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    const photoStorageKey = filename;
    const photoUrl = `/api/uploads/${filename}`;
    const photoUploadedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      url: photoUrl,
      photoUrl,
      photoStorageKey,
      photoMimeType: mimeType,
      photoSize: file.size,
      photoUploadedAt,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
