import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { AlertDocument, AuditLogDocument, createGeoPoint, validateCoordinates } from '@/lib/db/models';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const query: Record<string, any> = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const alerts = await db
      .collection<AlertDocument>('alerts')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error('Failed to get alerts from MongoDB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const alertId = `alt-${Date.now()}-${randomUUID().slice(0, 6)}`;

    // Optional GeoJSON point if lat and lng provided
    let geo = undefined;
    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      const val = validateCoordinates(body.lat, body.lng);
      if (val.isValid) {
        geo = createGeoPoint(body.lat, body.lng);
      }
    }

    const newAlert: AlertDocument = {
      id: alertId,
      type: body.type || 'system',
      title: body.title || 'New Alert',
      description: body.description || '',
      status: 'active',
      location: body.location || (geo ? `Lat: ${body.lat.toFixed(4)}, Lng: ${body.lng.toFixed(4)}` : undefined),
      geo,
      lat: typeof body.lat === 'number' ? body.lat : undefined,
      lng: typeof body.lng === 'number' ? body.lng : undefined,
      severity: body.severity || (body.type === 'sos' ? 'critical' : 'medium'),
      userId: body.userId || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<AlertDocument>('alerts').insertOne(newAlert as any);

    // Record in audit log
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: 'ALERT_CREATED',
      entityType: 'alert',
      entityId: alertId,
      actor: body.userId || 'Citizen User',
      details: { type: newAlert.type, title: newAlert.title, severity: newAlert.severity },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create alert in MongoDB:', error);
    return NextResponse.json(
      { error: 'Failed to create alert', details: error.message },
      { status: 500 }
    );
  }
}
