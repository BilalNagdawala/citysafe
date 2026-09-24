import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { UploadDocument } from '@/lib/db/models';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: filename } = await params;
    if (!filename || typeof filename !== 'string') {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Basic sanitization
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

    // 1. Try fetching from hosted MongoDB persistent storage first
    try {
      const db = await getDatabase();
      const doc = await db.collection<UploadDocument>('uploads').findOne({
        $or: [{ filename: sanitizedFilename }, { id: sanitizedFilename }],
      });

      if (doc && doc.data) {
        const fileBuffer = Buffer.from(doc.data, 'base64');
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': doc.mimeType || 'image/jpeg',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (dbErr: any) {
      // MongoDB might not be configured in some environments; fall through to filesystem
      console.warn(`[GET /api/uploads/${sanitizedFilename}] MongoDB lookup failed:`, dbErr?.message);
    }

    // 2. Fall back to local filesystem (development environment)
    try {
      const filePath = path.join(process.cwd(), '.data', 'uploads', sanitizedFilename);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        let mimeType = 'image/jpeg';
        if (sanitizedFilename.endsWith('.png')) mimeType = 'image/png';
        if (sanitizedFilename.endsWith('.webp')) mimeType = 'image/webp';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': stat.size.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch {
      // Filesystem read error
    }

    return new NextResponse('File Not Found', { status: 404 });
  } catch (error) {
    console.error('Error serving uploaded photo:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
