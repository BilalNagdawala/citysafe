import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { IncidentDocument, AuditLogDocument, CaseNoteDocument } from '@/lib/db/models';
import { randomUUID } from 'crypto';

const ALLOWED_ACTIONS = ['VERIFY', 'ASSIGN', 'ESCALATE', 'RESOLVE', 'CONTACT_NGO', 'NOTE'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Incident report ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, note, guardianId, guardianName } = body || {};

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (note && note.length > 2000) {
      return NextResponse.json({ error: 'Note exceeds maximum 2000 characters' }, { status: 400 });
    }

    const db = await getDatabase();
    const incident = await db.collection<IncidentDocument>('incidents').findOne({ id });

    if (!incident) {
      return NextResponse.json({ error: 'Incident report not found' }, { status: 404 });
    }

    if (incident.status === 'RESOLVED' && action !== 'NOTE') {
      return NextResponse.json({ error: 'Cannot perform actions on an already resolved incident' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let statusUpdate = incident.status;
    let actionDesc = action;

    switch (action) {
      case 'VERIFY':
        statusUpdate = 'VERIFIED';
        actionDesc = 'Verified by Guardian';
        break;
      case 'ASSIGN':
        statusUpdate = 'ASSIGNED';
        actionDesc = 'Assigned to Case';
        break;
      case 'ESCALATE':
        statusUpdate = 'ESCALATED';
        actionDesc = 'Escalated to Emergency Services';
        break;
      case 'RESOLVE':
        statusUpdate = 'RESOLVED';
        actionDesc = 'Resolved by Guardian';
        break;
      case 'CONTACT_NGO':
        actionDesc = 'Partner Organization Contacted';
        break;
      case 'NOTE':
        actionDesc = 'Guardian Note Added';
        break;
    }

    const actor = guardianName || 'Guardian';
    const newTimelineItem = {
      action: actionDesc,
      timestamp: now,
      note: note ? note.trim() : undefined,
      actor,
    };

    const timeline = incident.timeline ? [...incident.timeline, newTimelineItem] : [newTimelineItem];

    await db.collection<IncidentDocument>('incidents').updateOne(
      { id },
      {
        $set: {
          status: statusUpdate,
          timeline,
          updatedAt: now,
          ...(guardianId ? { assignedGuardianId: guardianId } : {}),
        },
      }
    );

    // If a note was provided, save to caseNotes collection as well
    if (note && note.trim()) {
      const caseNoteDoc: CaseNoteDocument = {
        id: `note-${Date.now()}-${randomUUID().slice(0, 6)}`,
        reportId: id,
        guardianId: guardianId || undefined,
        guardianName: actor,
        note: note.trim(),
        action,
        createdAt: now,
      };
      await db.collection<CaseNoteDocument>('caseNotes').insertOne(caseNoteDoc as any);
    }

    // Record in audit log
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: `GUARDIAN_ACTION_${action}`,
      entityType: 'incident',
      entityId: id,
      actor,
      details: { action, note, statusUpdate },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    const updated = await db.collection<IncidentDocument>('incidents').findOne({ id });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    console.error('Failed to execute guardian action:', error);
    return NextResponse.json(
      { error: 'Failed to execute report action', details: error.message },
      { status: 500 }
    );
  }
}
