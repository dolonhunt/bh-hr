import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderPdfBuffer } from "@/lib/document-renderers";
import { getSmtpConfig, sendViaSmtp, textToEmailHtml } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/documents/[id]/send-email
// Body: { to, cc?, bcc?, subject, body }
// Recipient validation: must match employee's official email OR be an explicit
// HR override (in which case we log the override).
//
// Delivery: when SMTP is configured (Settings → Email Settings, or SMTP_*
// environment variables) the message is delivered for real — with the
// document's PDF attached. Otherwise the send is simulated and the EmailLog
// records a "Simulated send" note so the UI can explain itself.
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
  const isOfficial = officialEmail === recipientLower;
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

  // ----- Real SMTP delivery (with PDF attachment), or simulated fallback -----
  const smtp = await getSmtpConfig();
  let attachmentName: string | null = null;
  let delivered = false;
  let deliveryError: string | null = null;
  let messageId: string | undefined;

  if (smtp) {
    // Render the same PDF the download endpoint serves, so the recipient
    // gets the authoritative document.
    try {
      const { buffer } = await renderPdfBuffer({
        title: doc.title,
        html: doc.content,
      });
      attachmentName = `${(doc.documentNumber || doc.title || "document").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      const result = await sendViaSmtp(smtp, {
        to,
        cc,
        bcc,
        subject,
        text: finalBody,
        html: textToEmailHtml(finalBody, {
          heading: doc.template?.name ?? doc.title ?? "HR Document",
          footer: `Sent via BH HR · Beyond Headlines${overrideNote ? " · Internal recipient note applies" : ""}`,
        }),
        attachments: [
          {
            filename: attachmentName,
            content: Buffer.from(buffer),
            contentType: "application/pdf",
          },
        ],
      });
      delivered = result.delivered;
      deliveryError = result.error ?? null;
      messageId = result.messageId;
    } catch (e: unknown) {
      // PDF rendering failure should not lose the email entirely — send
      // without the attachment instead.
      const result = await sendViaSmtp(smtp, {
        to,
        cc,
        bcc,
        subject,
        text: finalBody,
        html: textToEmailHtml(finalBody, {
          heading: doc.template?.name ?? doc.title ?? "HR Document",
          footer: "Sent via BH HR · Beyond Headlines",
        }),
      });
      delivered = result.delivered;
      deliveryError = result.error ?? (e instanceof Error ? `PDF attach failed: ${e.message}` : "PDF attach failed");
      messageId = result.messageId;
      if (delivered) attachmentName = null;
    }
  }

  const log = await db.emailLog.create({
    data: {
      documentId: doc.id,
      employeeId: doc.employeeId,
      recipientTo: to,
      recipientCc: cc ?? null,
      recipientBcc: bcc ?? null,
      subject,
      body: finalBody,
      attachmentName,
      status: smtp && !delivered ? "FAILED" : "SENT",
      errorMessage: smtp
        ? delivered
          ? overrideNote
            ? `Delivered via SMTP (${smtp.fromEmail})${messageId ? ` · id ${messageId}` : ""}. ${overrideNote}`
            : null
          : deliveryError
        : overrideNote
          ? `Simulated send. ${overrideNote}`
          : "Simulated send (no SMTP configured — add credentials in Settings → Email Settings).",
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  // Only flip the document to SENT when the email actually went out
  // (delivered via SMTP, or simulated in the no-SMTP demo mode).
  const shouldMarkSent = !smtp || delivered;
  if (shouldMarkSent) {
    await db.generatedDocument.update({
      where: { id: doc.id },
      data: { status: "SENT" },
    });
  }

  // Activity + audit logs.
  await db.activity.create({
    data: {
      employeeId: doc.employeeId,
      type: shouldMarkSent ? "EMAIL_SENT" : "EMAIL_FAILED",
      title: shouldMarkSent
        ? `Document emailed: ${doc.template?.name ?? doc.title}`
        : `Email failed: ${doc.template?.name ?? doc.title}`,
      description: shouldMarkSent
        ? `${doc.documentNumber} sent to ${to}${smtp ? " via SMTP" : " (simulated)"}.`
        : `${doc.documentNumber} could not be delivered to ${to}: ${deliveryError ?? "unknown error"}.`,
      metadata: JSON.stringify({
        documentId: doc.id,
        emailLogId: log.id,
        recipient: to,
        override: !!overrideNote,
        mode: smtp ? "smtp" : "simulated",
        delivered,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: shouldMarkSent ? "DOCUMENT_SEND" : "EMAIL_FAILED",
      entityType: "GeneratedDocument",
      entityId: doc.id,
      description: shouldMarkSent
        ? `Sent document ${doc.documentNumber} to ${to} (${smtp ? "SMTP" : "simulated"})${
            overrideNote ? ` (override: ${overrideNote})` : ""
          }`
        : `Failed to send ${doc.documentNumber} to ${to}: ${deliveryError ?? "unknown error"}`,
    },
  });

  if (smtp && !delivered) {
    return NextResponse.json(
      {
        error: `SMTP delivery failed: ${deliveryError ?? "unknown error"}`,
        log,
        mode: "smtp",
        delivered: false,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { ok: true, log, mode: smtp ? "smtp" : "simulated", delivered },
    { status: 201 }
  );
}
