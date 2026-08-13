import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/documents/[id]/reject
// Body: { note?: string }
// Transitions PENDING_APPROVAL -> GENERATED (back to draft) and writes audit +
// activity logs. The note is captured as the rejection reason.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const note = body.note as string | undefined;

  const existing = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (existing.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      {
        error: `Document must be in PENDING_APPROVAL to reject (current: ${existing.status}).`,
      },
      { status: 400 }
    );
  }

  const updated = await db.generatedDocument.update({
    where: { id },
    data: { status: "GENERATED" },
    include: { employee: true, template: true },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_STATUS_CHANGE",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Document ${updated.documentNumber} status changed from PENDING_APPROVAL to GENERATED`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        from: "PENDING_APPROVAL",
        to: "GENERATED",
        action: "REJECT",
        note: note ?? null,
      }),
    },
  });

  await db.activity.create({
    data: {
      employeeId: existing.employeeId,
      type: "DOCUMENT_REJECTED",
      title: `Document returned to draft: ${updated.title}`,
      description: `${updated.documentNumber} (${existing.template?.name ?? updated.type}) was rejected and returned to draft${note ? ` — ${note}` : ""}.`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        rejectorId: user?.id ?? null,
        note: note ?? null,
      }),
    },
  });

  return NextResponse.json({ ok: true, document: updated });
}
