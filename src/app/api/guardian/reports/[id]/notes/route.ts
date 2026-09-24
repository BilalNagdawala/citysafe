import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { IncidentDocument, CaseNoteDocument, AuditLogDocument } from '@/lib/db/models';
import { randomUUID } from 'crypto';

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
    const { note, guardianId, guardianName } = body || {};

    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'Note text cannot be empty' }, { status: 400 });
    }

    if (note.length > 2000) {
      return NextResponse.json({ error: 'Note exceeds maximum 2000 characters' }, { status: 400 });
    }

    const db = await getDatabase();
    const incident = await db.collection<IncidentDocument>('incidents').findOne({ id });

    if (!incident) {
      return NextResponse.json({ error: 'Incident report not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const actor = guardianName || 'Guardian';

    // 1. Save in caseNotes collection
    const noteDoc: CaseNoteDocument = {
      id: `note-${Date.now()}-${randomUUID().slice(0, 6)}`,
      reportId: id,
      guardianId: guardianId || undefined,
      guardianName: actor,
      note: note.trim(),
      action: 'NOTE',
      createdAt: now,
    };
    await db.collection<CaseNoteDocument>('caseNotes').insertOne(noteDoc as any);

    // 2. Append to incident timeline
    const newTimelineItem = {
      action: 'Case Note Added',
      timestamp: now,
      note: note.trim(),
      actor,
    };

    const timeline = incident.timeline ? [...incident.timeline, newTimelineItem] : [newTimelineItem];

    await db.collection<IncidentDocument>('incidents').updateOne(
      { id },
      {
        $set: {
          timeline,
          updatedAt: now,
        },
      }
    );

    // 3. Log to auditLogs
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: 'CASE_NOTE_ADDED',
      entityType: 'incident',
      entityId: id,
      actor,
      details: { noteId: noteDoc.id, snippet: note.trim().slice(0, 100) },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    const updatedIncident = await db.collection<IncidentDocument>('incidents').findOne({ id });

    return NextResponse.json({
      success: true,
      note: noteDoc,
      incident: updatedIncident,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add case note:', error);
    return NextResponse.json(
      { error: 'Failed to record case note', details: error.message },
      { status: 500 }
    );
  }
}
