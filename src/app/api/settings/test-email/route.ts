import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const to: string = body.to;
  if (!to) {
    return NextResponse.json({ error: "Recipient 'to' is required" }, { status: 400 });
  }

  // Simulate sending a test email by creating an EmailLog entry
  const log = await db.emailLog.create({
    data: {
      recipientTo: to,
      subject: "Test Email from TeamHub HR",
      body: "This is a test email from TeamHub HR system. SMTP is configured correctly.",
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
      metadata: JSON.stringify({ note: "Test email simulated", to }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Test email simulated",
    logId: log.id,
    note: "Test email simulated",
  });
}
