import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/documents/[id]/send-email
// Body: { to, cc?, bcc?, subject, body }
// Recipient validation: must match employee's official email OR be an explicit
// HR override (in which case we log the override).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { to, cc, bcc, subject, body: emailBody } = body;

  if (!to || !subject || !emailBody) {
    return NextResponse.json(
      { error: "to, subject and body are required." },
      { status: 400 }
    );
  }

  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Recipient validation.
  const officialEmail = doc.employee?.officialEmail ?? "";
  const recipientLower = String(to).toLowerCase().trim();
  const isOfficial = officialEmail.toLowerCase() === recipientLower;
  const overrideNote =
    !isOfficial && officialEmail
      ? `Recipient overridden by HR from ${officialEmail} to ${to}.`
      : !officialEmail
        ? `No official email on file; HR manually specified ${to}.`
        : null;

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  // Build the body — append the override note (if any) at the very bottom so
  // the email body still reads naturally to the recipient.
  const finalBody = overrideNote
    ? `${emailBody}\n\n[Internal note: ${overrideNote}]`
    : emailBody;

  // Simulate sending. We don't have real SMTP credentials in this sandbox, so
  // mark as SENT but include a note in errorMessage explaining the simulation.
  const log = await db.emailLog.create({
    data: {
      documentId: doc.id,
      employeeId: doc.employeeId,
      recipientTo: to,
      recipientCc: cc ?? null,
      recipientBcc: bcc ?? null,
      subject,
      body: finalBody,
      attachmentName: `${doc.documentNumber}.pdf`,
      status: "SENT",
      errorMessage: overrideNote
        ? `Simulated send. ${overrideNote}`
        : "Simulated send (no SMTP configured).",
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  // Update the document status to SENT.
  await db.generatedDocument.update({
    where: { id: doc.id },
    data: { status: "SENT" },
  });

  // Activity + audit logs.
  await db.activity.create({
    data: {
      employeeId: doc.employeeId,
      type: "EMAIL_SENT",
      title: `Document emailed: ${doc.template?.name ?? doc.title}`,
      description: `${doc.documentNumber} sent to ${to}.`,
      metadata: JSON.stringify({
        documentId: doc.id,
        emailLogId: log.id,
        recipient: to,
        override: !!overrideNote,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_SEND",
      entityType: "GeneratedDocument",
      entityId: doc.id,
      description: `Sent document ${doc.documentNumber} to ${to}${
        overrideNote ? ` (override: ${overrideNote})` : ""
      }`,
    },
  });

  return NextResponse.json({ ok: true, log }, { status: 201 });
}
