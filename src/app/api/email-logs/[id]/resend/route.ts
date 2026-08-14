import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/email-logs/[id]/resend
// Re-send an existing email log — creates a NEW EmailLog row (we never mutate
// the original) and marks the document as SENT again.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const original = await db.emailLog.findUnique({
    where: { id },
    include: { document: true },
  });
  if (!original) {
    return NextResponse.json({ error: "Email log not found" }, { status: 404 });
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  const resent = await db.emailLog.create({
    data: {
      documentId: original.documentId,
      employeeId: original.employeeId,
      recipientTo: original.recipientTo,
      recipientCc: original.recipientCc,
      recipientBcc: original.recipientBcc,
      subject: original.subject,
      body: original.body,
      attachmentName: original.attachmentName,
      status: "SENT",
      errorMessage: `Resent from log ${original.id}. Simulated send (no SMTP configured).`,
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  if (original.documentId) {
    await db.generatedDocument.update({
      where: { id: original.documentId },
      data: { status: "SENT" },
    });
  }

  await db.activity.create({
    data: {
      employeeId: original.employeeId,
      type: "EMAIL_SENT",
      title: "Email resent",
      description: `Re-sent "${original.subject}" to ${original.recipientTo}.`,
      metadata: JSON.stringify({
        originalLogId: original.id,
        newLogId: resent.id,
        documentId: original.documentId,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "EMAIL_RESEND",
      entityType: "EmailLog",
      entityId: resent.id,
      description: `Resent email "${original.subject}" to ${original.recipientTo}`,
    },
  });

  return NextResponse.json({ ok: true, log: resent }, { status: 201 });
}
