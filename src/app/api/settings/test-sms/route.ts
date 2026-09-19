import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSmsConfig,
  sendMessageViaGateway,
  normalizeBdPhone,
  formatBdPhone,
} from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/settings/test-sms   { to: string, channel?: "SMS"|"WHATSAPP" }
//
// Sends a short test message through the configured gateway. Without a
// gateway the send is recorded as simulated (so the Messages history
// demonstrates the flow); with one, failures are recorded as FAILED
// with the exact gateway error and surfaced as a 502.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const channel = body?.channel === "WHATSAPP" ? "WHATSAPP" : "SMS";
  const to = normalizeBdPhone(String(body?.to ?? ""));

  if (!to) {
    return NextResponse.json(
      { error: "A valid phone number is required (e.g. 01700-000000 or +8801700000000)." },
      { status: 400 }
    );
  }

  const config = await getSmsConfig();
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const companyName = (await db.company.findFirst())?.name ?? "BH HR";
  const text = `BH HR test message — ${channel === "WHATSAPP" ? "WhatsApp" : "SMS"} channel is ${config ? "live" : "simulated"}. — ${companyName} HR`;

  let delivered = true;
  let error: string | undefined;

  if (config) {
    const r = await sendMessageViaGateway(config, { to, body: text, channel });
    delivered = r.delivered;
    error = r.error;
  }

  await db.messageLog.create({
    data: {
      channel,
      employeeId: null,
      recipientTo: to,
      body: text,
      status: config ? (delivered ? "SENT" : "FAILED") : "SENT",
      errorMessage: config
        ? delivered
          ? `Delivered via gateway (${config.source === "database" ? "Settings" : "env"}) — test ${channel}`
          : error ?? "Gateway delivery failed"
        : `Simulated send (no SMS gateway configured) — test ${channel}`,
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: config && !delivered ? "SMS_TEST_FAILED" : "SMS_TEST_SENT",
      entityType: "Setting",
      description: `Test ${channel} to ${formatBdPhone(to)}: ${config ? (delivered ? "delivered via gateway" : `failed — ${error}`) : "simulated (no gateway configured)"}.`,
      metadata: JSON.stringify({
        channel,
        to,
        mode: config ? "gateway" : "simulated",
        delivered,
        error: error ?? null,
      }),
    },
  });

  if (config && !delivered) {
    return NextResponse.json(
      { error: `Gateway delivery failed: ${error}`, mode: "gateway", to },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: config ? "gateway" : "simulated",
    channel,
    to,
    messageId: delivered ? `sim-${Date.now()}` : undefined,
  });
}
