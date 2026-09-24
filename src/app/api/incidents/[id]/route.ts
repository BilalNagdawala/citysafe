import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { IncidentDocument, AuditLogDocument } from '@/lib/db/models';
import { randomUUID } from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const incident = await db.collection<IncidentDocument>('incidents').findOne({ id });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (error: any) {
    console.error('Failed to get incident by id:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve incident', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await db.collection<IncidentDocument>('incidents').findOne({ id });

    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Partial<IncidentDocument> = {
      updatedAt: now,
    };

    if (body.status && ['PENDING', 'VERIFIED', 'REJECTED', 'ASSIGNED', 'RESOLVED', 'ESCALATED'].includes(body.status)) {
      updates.status = body.status;
    }

    if (typeof body.severity === 'number') {
      updates.severity = Math.min(100, Math.max(1, body.severity));
    }

    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }

    if (body.assignedGuardianId !== undefined) {
      updates.assignedGuardianId = body.assignedGuardianId;
    }

    // Append to timeline if note or action provided
    const timeline = existing.timeline ? [...existing.timeline] : [];
    if (body.action || body.note) {
      timeline.push({
        action: body.action || 'Updated',
        timestamp: now,
        note: body.note || undefined,
        actor: body.actor || 'Guardian',
      });
      updates.timeline = timeline;
    }

    await db.collection<IncidentDocument>('incidents').updateOne(
      { id },
      { $set: updates }
    );

    const updated = await db.collection<IncidentDocument>('incidents').findOne({ id });

    // Log to auditLogs
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: 'INCIDENT_UPDATED',
      entityType: 'incident',
      entityId: id,
      actor: body.actor || 'Guardian',
      details: { updates },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    console.error('Failed to update incident:', error);
    return NextResponse.json(
      { error: 'Failed to update incident', details: error.message },
      { status: 500 }
    );
  }
}
