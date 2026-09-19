import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSmtpConfig, sendViaSmtp, textToEmailHtml } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low priority",
  NORMAL: "Notice",
  HIGH: "Important",
  URGENT: "URGENT",
};

// POST /api/announcements/[id]/email-blast
// Body: { departmentId?: string | null }  — narrows ALL-audience announcements
// to one department when provided.
//
// Emails the announcement to every ACTIVE employee with an address on file
// (announcement.audience === "DEPARTMENT" restricts to its department).
// Real SMTP when configured; simulated (fully logged) otherwise.
// One EmailLog per recipient — the Email History view stays auditable.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let narrowDepartmentId: string | null | undefined = undefined;
  try {
    const b = await req.json();
    narrowDepartmentId = b?.departmentId ?? undefined;
  } catch {
    // no body → keep announcement's own audience
  }

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
    narrowDepartmentId !== undefined ? narrowDepartmentId : announcement.departmentId;

  const employees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(deptId ? { departmentId: deptId } : {}),
      OR: [{ officialEmail: { not: null } }, { personalEmail: { not: null } }],
    },
    select: {
      id: true,
      fullName: true,
      officialEmail: true,
      personalEmail: true,
      department: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0) {
    return NextResponse.json(
      { error: "No active employees with an email address match this announcement's audience." },
      { status: 400 }
    );
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const smtp = await getSmtpConfig();
  const companyName = (await db.company.findFirst())?.name ?? "BH HR";

  const priorityTag = PRIORITY_LABEL[announcement.priority] ?? "Notice";
  const audienceLabel = deptId
    ? `Department announcement · ${(await db.department.findUnique({ where: { id: deptId }, select: { name: true } }))?.name ?? "Department"}`
    : "Company-wide announcement";

  const emailText = [
    announcement.body,
    "",
    "—",
    `${audienceLabel}`,
    `${companyName} · HR Team`,
  ].join("\n");

  const html = textToEmailHtml(announcement.body, {
    heading: `${announcement.priority === "URGENT" ? "🔴 " : ""}${announcement.title}`,
    footer: `${audienceLabel} · ${companyName} HR · ${priorityTag}`,
  });

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
    const to = emp.officialEmail || emp.personalEmail || "";
    if (!to) continue;
    if (smtp) {
      const r = await sendViaSmtp(smtp, {
        to,
        subject: `${announcement.priority === "URGENT" ? "[URGENT] " : ""}${announcement.title}`,
        text: emailText,
        html,
      });
      if (r.delivered) {
        sent += 1;
        results.push({ employeeId: emp.id, employeeName: emp.fullName, recipientTo: to, ok: true });
      } else {
        failed += 1;
        results.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          recipientTo: to,
          ok: false,
          error: r.error,
        });
      }
      await new Promise((res) => setTimeout(res, 250)); // gentle on the SMTP server
    } else {
      sent += 1;
      results.push({ employeeId: emp.id, employeeName: emp.fullName, recipientTo: to, ok: true });
    }

    await db.emailLog.create({
      data: {
        employeeId: emp.id,
        recipientTo: to,
        subject: `${announcement.priority === "URGENT" ? "[URGENT] " : ""}${announcement.title}`,
        body: emailText,
        status: smtp ? (results[results.length - 1].ok ? "SENT" : "FAILED") : "SENT",
        errorMessage: smtp
          ? results[results.length - 1].ok
            ? `Delivered via SMTP (${smtp.host}:${smtp.port}) — announcement blast`
            : results[results.length - 1].error ?? "SMTP delivery failed"
          : `Simulated send (no SMTP configured) — announcement blast "${announcement.title}"`,
        sentById: user?.id ?? null,
        sentAt: new Date(),
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "ANNOUNCEMENT_EMAIL_BLAST",
      entityType: "Announcement",
      entityId: announcement.id,
      description: `Emailed announcement "${announcement.title}" to ${employees.length} employee(s): ${sent} ${smtp ? "delivered" : "simulated"}, ${failed} failed.`,
      metadata: JSON.stringify({
        announcementId: announcement.id,
        title: announcement.title,
        audience: deptId ? "DEPARTMENT" : "ALL",
        departmentId: deptId ?? null,
        recipients: employees.length,
        sent,
        failed,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      mode: smtp ? "smtp" : "simulated",
      title: announcement.title,
      recipients: employees.length,
      sent,
      failed,
      results,
    },
    { status: 200 }
  );
}
