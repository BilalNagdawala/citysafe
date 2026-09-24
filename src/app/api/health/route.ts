import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const uri = process.env.MONGODB_URI || '';
  const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('.mongodb.net');
  const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');
  const isVercel = process.env.VERCEL === '1';

  let targetType = 'unconfigured';
  if (isAtlas) targetType = 'mongodb_atlas';
  else if (isLocalhost) targetType = 'local_mongodb';
  else if (uri) targetType = 'hosted_mongodb';

  if (!uri) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unconfigured',
        target: targetType,
        isVercel,
        error: 'MONGODB_URI is not set in environment variables. For Vercel production, configure MongoDB Atlas.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  if (isVercel && isLocalhost) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'invalid_configuration',
        target: targetType,
        isVercel,
        error: 'Vercel serverless functions cannot connect to localhost/127.0.0.1. A hosted MongoDB Atlas cluster is required.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const db = await getDatabase();

    // Ping the database
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;

    // Initialize indexes if needed
    await ensureIndexes();

    // Fetch collection statistics safely
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    // Get document counts for primary collections
    const counts: Record<string, number> = {};
    const trackingCollections = [
      'incidents',
      'alerts',
      'journeys',
      'guardians',
      'users',
      'caseNotes',
      'auditLogs',
      'uploads',
    ];

    for (const name of trackingCollections) {
      if (collectionNames.includes(name)) {
        counts[name] = await db.collection(name).countDocuments();
      } else {
        counts[name] = 0;
      }
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      target: targetType,
      isVercel,
      latencyMs,
      timestamp: new Date().toISOString(),
      collections: counts,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        target: targetType,
        isVercel,
        error: `Database connection error: ${error?.message || 'Failed to ping MongoDB'}`,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
