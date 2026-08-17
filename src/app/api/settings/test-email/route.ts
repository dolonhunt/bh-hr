import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  // Simulate sending a test email by creating an EmailLog entry
  const log = await db.emailLog.create({
    data: {
      recipientTo: to,
      subject,
      body: emailBody,
      status: "SENT",
      errorMessage: null,
      sentAt: new Date(),
    },
  });

  // Add a note via metadata using a separate audit log entry
  await db.auditLog.create({
    data: {
      action: "EMAIL_TEST",
      entityType: "EmailLog",
      entityId: log.id,
      description: `Test email simulated to ${to}`,
      metadata: JSON.stringify({
        note: "Test email simulated",
        to,
        subjectLength: subject.length,
        bodyLength: emailBody.length,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Test email simulated",
    logId: log.id,
    note: "Test email simulated",
  });
}
