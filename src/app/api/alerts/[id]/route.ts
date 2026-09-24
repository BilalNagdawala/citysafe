import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { AlertDocument, AuditLogDocument } from '@/lib/db/models';
import { randomUUID } from 'crypto';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await db.collection<AlertDocument>('alerts').findOne({ id });

    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Partial<AlertDocument> = {
      updatedAt: now,
    };

    if (body.status && ['active', 'acknowledged', 'assigned', 'escalated', 'resolved'].includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'acknowledged') updates.acknowledgedAt = now;
      if (body.status === 'assigned') updates.assignedAt = now;
      if (body.status === 'escalated') updates.escalatedAt = now;
      if (body.status === 'resolved') updates.resolvedAt = now;
    }

    if (body.severity && ['critical', 'high', 'medium', 'low'].includes(body.severity)) {
      updates.severity = body.severity;
    }

    if (body.assignedGuardianId) {
      updates.assignedGuardianId = body.assignedGuardianId;
    }

    await db.collection<AlertDocument>('alerts').updateOne(
      { id },
      { $set: updates }
    );

    const updated = await db.collection<AlertDocument>('alerts').findOne({ id });

    // Record status change in audit log
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: `ALERT_${(body.status || 'UPDATED').toUpperCase()}`,
      entityType: 'alert',
      entityId: id,
      actor: body.guardianId || body.actor || 'Guardian',
      details: { updates },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert', details: error.message },
      { status: 500 }
    );
  }
}
