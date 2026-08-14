import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/documents/[id]/issue
// Body: {} (no body required)
// Transitions APPROVED -> ISSUED. This locks the document — content / title
// can no longer be edited (the PATCH route enforces this via LOCKED_STATUSES).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (existing.status !== "APPROVED") {
    return NextResponse.json(
      {
        error: `Document must be APPROVED before it can be issued (current: ${existing.status}).`,
      },
      { status: 400 }
    );
  }

  const updated = await db.generatedDocument.update({
    where: { id },
    data: { status: "ISSUED" },
    include: { employee: true, template: true },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_STATUS_CHANGE",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Document ${updated.documentNumber} status changed from APPROVED to ISSUED`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        from: "APPROVED",
        to: "ISSUED",
        action: "ISSUE",
      }),
    },
  });

  await db.activity.create({
    data: {
      employeeId: existing.employeeId,
      type: "DOCUMENT_ISSUED",
      title: `Document issued: ${updated.title}`,
      description: `${updated.documentNumber} (${existing.template?.name ?? updated.type}) was issued and is now locked. Content can no longer be edited.`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        issuerId: user?.id ?? null,
      }),
    },
  });

  return NextResponse.json({ ok: true, document: updated });
}
