import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: filename } = await params;
    if (!filename || typeof filename !== 'string') {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Basic sanitization
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '');
    const filePath = path.join(process.cwd(), '.data', 'uploads', sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const file = fs.readFileSync(filePath);

    let mimeType = 'image/jpeg';
    if (sanitizedFilename.endsWith('.png')) mimeType = 'image/png';
    if (sanitizedFilename.endsWith('.webp')) mimeType = 'image/webp';

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
