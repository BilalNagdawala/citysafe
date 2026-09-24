import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  try {
    const db = await getDatabase();

    // Ping the database
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;

    // Initialize indexes if needed
    await ensureIndexes();

    // Fetch collection statistics safely
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Get document counts for primary collections
    const counts: Record<string, number> = {};
    for (const name of ['incidents', 'alerts', 'journeys', 'guardians', 'users', 'caseNotes', 'auditLogs']) {
      if (collectionNames.includes(name)) {
        counts[name] = await db.collection(name).countDocuments();
      } else {
        counts[name] = 0;
      }
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      target: 'local_mongodb',
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
        error: 'Unable to connect to local MongoDB. Ensure MongoDB service is running on 127.0.0.1:27017.',
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
