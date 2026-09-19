import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSmtpConfig, sendViaSmtp, textToEmailHtml } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const to: string = body.to;
  if (!to) {
    return NextResponse.json({ error: "Recipient 'to' is required" }, { status: 400 });
  }

  // Callers may supply a custom subject/body (e.g. the Email Template Editor
  // passes the rendered subject/body of the template being tested). Fall back
  // to a generic test message when they are not provided so existing callers
  // keep working.
  const subject: string =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject
      : "Test Email from BH HR";
  const emailBody: string =
    typeof body.body === "string" && body.body.trim()
      ? body.body
      : "This is a test email from BH HR system. SMTP is configured correctly.";

  // Real SMTP when configured; simulated fallback otherwise.
  const smtp = await getSmtpConfig();
  let status: "SENT" | "FAILED" = "SENT";
  let note: string;

  if (smtp) {
    const result = await sendViaSmtp(smtp, {
      to,
      subject,
      text: emailBody,
      html: textToEmailHtml(emailBody, {
        heading: "BH HR — SMTP Test",
        footer: `Delivery test · ${smtp.source === "db" ? "Settings config" : "Environment config"}`,
      }),
    });
    if (result.delivered) {
      note = `Delivered via SMTP (${smtp.host}:${smtp.port})${result.messageId ? ` · id ${result.messageId}` : ""}`;
    } else {
      status = "FAILED";
      note = result.error ?? "SMTP delivery failed";
    }
  } else {
    note = "Simulated send (no SMTP configured — add credentials in Settings → Email Settings, or set SMTP_* environment variables).";
  }

  const log = await db.emailLog.create({
    data: {
      recipientTo: to,
      subject,
      body: emailBody,
      status,
      errorMessage: status === "SENT" ? null : note,
      sentAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      action: "EMAIL_TEST",
      entityType: "EmailLog",
      entityId: log.id,
      description: status === "SENT" ? `Test email to ${to} (${smtp ? "SMTP" : "simulated"})` : `Test email FAILED for ${to}: ${note}`,
      metadata: JSON.stringify({
        note,
        to,
        subjectLength: subject.length,
        bodyLength: emailBody.length,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
  });

  if (status === "FAILED") {
    return NextResponse.json(
      { ok: false, error: note, logId: log.id, mode: "smtp" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: smtp ? "Test email delivered via SMTP" : "Test email simulated",
    logId: log.id,
    note,
    mode: smtp ? "smtp" : "simulated",
  });
}
