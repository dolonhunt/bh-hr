import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSmsConfig,
  sendMessageViaGateway,
  normalizeBdPhone,
} from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/announcements/[id]/sms-blast
// Body: { channel?: "SMS" | "WHATSAPP", departmentId?: string | null }
//
// Sends the announcement as an SMS or WhatsApp message to every ACTIVE
// employee with a phone number on file (announcement.audience ===
// "DEPARTMENT" restricts to its department). Real gateway when
// configured (Settings → SMS & WhatsApp or SMS_* env vars); simulated
// (fully logged) otherwise. One MessageLog per recipient — the
// Messages history stays auditable.

const SMS_MAX_LEN = 480; // ~3 SMS segments of text, keep it tight

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { channel?: string; departmentId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    // no body → defaults
  }
  const channel = body.channel === "WHATSAPP" ? "WHATSAPP" : "SMS";

  const announcement = await db.announcement.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  // Resolve the target department: explicit override wins, else the
  // announcement's own DEPARTMENT audience.
  const deptId =
    body.departmentId !== undefined ? body.departmentId : announcement.departmentId;

  const activeEmployees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(deptId ? { departmentId: deptId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      department: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  // Normalize phones and drop employees without a usable number —
  // reported separately so the operator sees the full picture.
  const employees = activeEmployees
    .map((e) => ({ ...e, normalizedPhone: normalizeBdPhone(e.phone) }))
    .filter((e) => e.normalizedPhone !== null) as {
    id: string;
    fullName: string;
    phone: string | null;
    department: { name: string | null };
    normalizedPhone: string;
  }[];
  const noPhone = activeEmployees.length - employees.length;

  if (employees.length === 0) {
    return NextResponse.json(
      {
        error:
          "No active employees with a phone number match this announcement's audience.",
        noPhone,
      },
      { status: 400 }
    );
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const config = await getSmsConfig();
  const companyName = (await db.company.findFirst())?.name ?? "BH HR";

  // Compose the message text. SMS is length-constrained; WhatsApp gets
  // the full body. URGENT announcements get a visible prefix.
  const titleLine = `${announcement.priority === "URGENT" ? "[URGENT] " : ""}${announcement.title}`;
  const fullBody = [
    titleLine,
    "",
    announcement.body,
    "",
    `— ${companyName} HR`,
  ].join("\n");
  const messageText =
    channel === "SMS" && fullBody.length > SMS_MAX_LEN
      ? `${fullBody.slice(0, SMS_MAX_LEN - 1).trimEnd()}…`
      : fullBody;

  const results: {
    employeeId: string;
    employeeName: string;
    recipientTo: string;
    ok: boolean;
    error?: string;
  }[] = [];

  let sent = 0;
  let failed = 0;

  for (const emp of employees) {
    const to = emp.normalizedPhone;
    let ok = true;
    let error: string | undefined;

    if (config) {
      const r = await sendMessageViaGateway(config, {
        to,
        body: messageText,
        channel,
      });
      ok = r.delivered;
      error = r.error;
      if (!r.delivered) failed += 1;
      else sent += 1;
      await new Promise((res) => setTimeout(res, 200)); // gentle on the gateway
    } else {
      sent += 1;
    }

    results.push({
      employeeId: emp.id,
      employeeName: emp.fullName,
      recipientTo: to,
      ok,
      error,
    });

    await db.messageLog.create({
      data: {
        channel,
        employeeId: emp.id,
        announcementId: announcement.id,
        recipientTo: to,
        body: messageText,
        status: config ? (ok ? "SENT" : "FAILED") : "SENT",
        errorMessage: config
          ? ok
            ? `Delivered via gateway (${config.source === "database" ? "Settings" : "env"}) — ${channel} blast`
            : error ?? "Gateway delivery failed"
          : `Simulated send (no SMS gateway configured) — ${channel} blast "${announcement.title}"`,
        sentById: user?.id ?? null,
        sentAt: new Date(),
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "ANNOUNCEMENT_SMS_BLAST",
      entityType: "Announcement",
      entityId: announcement.id,
      description: `Sent ${channel} for announcement "${announcement.title}" to ${employees.length} employee(s): ${sent} ${config ? "delivered" : "simulated"}, ${failed} failed.`,
      metadata: JSON.stringify({
        announcementId: announcement.id,
        title: announcement.title,
        channel,
        audience: deptId ? "DEPARTMENT" : "ALL",
        departmentId: deptId ?? null,
        recipients: employees.length,
        noPhone,
        sent,
        failed,
        mode: config ? "gateway" : "simulated",
      }),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      mode: config ? "gateway" : "simulated",
      channel,
      title: announcement.title,
      recipients: employees.length,
      noPhone,
      sent,
      failed,
      results,
    },
    { status: 200 }
  );
}
