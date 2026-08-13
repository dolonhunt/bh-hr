import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Allowed status transitions for the document approval workflow.
// GENERATED -> PENDING_APPROVAL -> APPROVED -> ISSUED -> SENT
//                                   |
//                                   v
//                              GENERATED (reject)
// Any -> ARCHIVED
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["GENERATED", "PENDING_APPROVAL", "ARCHIVED"],
  GENERATED: ["PENDING_APPROVAL", "ARCHIVED"],
  PENDING_APPROVAL: ["APPROVED", "GENERATED", "ARCHIVED"],
  APPROVED: ["ISSUED", "ARCHIVED"],
  ISSUED: ["SENT", "ARCHIVED"],
  SENT: ["ARCHIVED"],
  ARCHIVED: [],
};

// When a document reaches one of these states, content edits are locked.
const LOCKED_STATUSES = new Set(["APPROVED", "ISSUED", "SENT", "ARCHIVED"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: {
      employee: {
        include: { department: true, designation: true, role: true },
      },
      template: true,
      generatedBy: true,
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sentBy: true },
      },
    },
  });
  if (!doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldStatus = existing.status;
  const newStatus = body.status as string | undefined;

  // Validate status transition if a status change is requested.
  if (newStatus && newStatus !== oldStatus) {
    const allowed = VALID_TRANSITIONS[oldStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${oldStatus} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }
  }

  // Lock content edits when the document is in a finalized state.
  const effectiveStatus = newStatus ?? oldStatus;
  const isLocked = LOCKED_STATUSES.has(effectiveStatus);
  const data: any = {};
  if (newStatus) data.status = newStatus;
  // Only allow content/title/month edits when not locked.
  if (!isLocked) {
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.month !== undefined) data.month = body.month;
  }

  const updated = await db.generatedDocument.update({
    where: { id },
    data,
    include: {
      employee: true,
      template: true,
    },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  // Always write an audit log. The action + description vary depending on
  // whether this was a status transition or a regular field update.
  if (newStatus && newStatus !== oldStatus) {
    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: "DOCUMENT_STATUS_CHANGE",
        entityType: "GeneratedDocument",
        entityId: id,
        description: `Document ${updated.documentNumber} status changed from ${oldStatus} to ${newStatus}`,
        metadata: JSON.stringify({
          documentId: id,
          documentNumber: updated.documentNumber,
          from: oldStatus,
          to: newStatus,
          note: body.note ?? null,
        }),
      },
    });

    // Mirror the status change as an activity on the employee timeline so
    // the dashboard / employee profile picks it up.
    const transitionVerb: Record<string, string> = {
      PENDING_APPROVAL: "submitted for approval",
      APPROVED: "approved",
      ISSUED: "issued",
      SENT: "sent",
      ARCHIVED: "archived",
      GENERATED: "returned to draft",
    };
    await db.activity.create({
      data: {
        employeeId: existing.employeeId,
        type: "DOCUMENT_STATUS_CHANGE",
        title: `Document ${transitionVerb[newStatus] ?? "updated"}: ${updated.title}`,
        description: `${updated.documentNumber} (${existing.template?.name ?? updated.type}) — ${transitionVerb[newStatus] ?? "status updated"}${body.note ? ` — ${body.note}` : ""}.`,
        metadata: JSON.stringify({
          documentId: id,
          documentNumber: updated.documentNumber,
          from: oldStatus,
          to: newStatus,
        }),
      },
    });
  } else {
    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: "DOCUMENT_UPDATE",
        entityType: "GeneratedDocument",
        entityId: id,
        description: `Updated document ${updated.documentNumber}${newStatus ? ` (status=${newStatus})` : ""}`,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Soft delete via archive.
  const archived = await db.generatedDocument.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_ARCHIVE",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Archived document ${archived.documentNumber}`,
    },
  });

  return NextResponse.json({ ok: true });
}
