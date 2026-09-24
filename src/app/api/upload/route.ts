import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { UploadDocument } from '@/lib/db/models';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const reqId = `upl_${Date.now()}_${randomUUID().slice(0, 6)}`;
  console.log(`[POST /api/upload] [ReqID: ${reqId}] Upload request received`);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.warn(`[POST /api/upload] [ReqID: ${reqId}] Validation failed: No file provided`);
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      console.warn(`[POST /api/upload] [ReqID: ${reqId}] Validation failed: Unsupported type ${mimeType}`);
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      console.warn(`[POST /api/upload] [ReqID: ${reqId}] Validation failed: File size ${file.size} exceeds 5MB`);
      return NextResponse.json({ error: 'File size exceeds maximum 5MB limit' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    let ext = 'jpg';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';

    const fileId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const filename = `${fileId}.${ext}`;
    const now = new Date().toISOString();

    // 1. Persist directly into MongoDB hosted database (Serverless safe)
    let dbPersisted = false;
    try {
      const db = await getDatabase();
      await ensureIndexes();

      const uploadDoc: UploadDocument = {
        id: filename,
        filename,
        mimeType,
        size: file.size,
        data: base64Data,
        uploadedAt: now,
      };

      await db.collection<UploadDocument>('uploads').insertOne(uploadDoc as any);
      dbPersisted = true;
      console.log(`[POST /api/upload] [ReqID: ${reqId}] File persisted to database collection 'uploads' as ${filename}`);
    } catch (dbErr: any) {
      console.warn(`[POST /api/upload] [ReqID: ${reqId}] Database storage warning:`, dbErr?.message);
    }

    // 2. Also save to local filesystem if writable (dev fallback/cache)
    try {
      const uploadDir = path.join(process.cwd(), '.data', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(buffer));
    } catch {
      // Ignored in read-only serverless filesystems
    }

    const photoUrl = `/api/uploads/${filename}`;

    console.log(`[POST /api/upload] [ReqID: ${reqId}] Upload successful: ${photoUrl} (dbPersisted=${dbPersisted})`);

    return NextResponse.json({
      success: true,
      url: photoUrl,
      photoUrl,
      photoStorageKey: filename,
      photoMimeType: mimeType,
      photoSize: file.size,
      photoUploadedAt: now,
      persisted: dbPersisted,
    });
  } catch (error: any) {
    console.error(`[POST /api/upload] [ReqID: ${reqId}] Internal upload error:`, error?.message || error);
    return NextResponse.json(
      { error: 'Failed to process file upload', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
