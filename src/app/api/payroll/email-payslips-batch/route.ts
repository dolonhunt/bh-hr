import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPayslipEmail } from "@/lib/payslip-email";
import { getSmtpConfig } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/payroll/email-payslips-batch
// Body: { month, employeeIds?: string[] }
//
// Emails the payslip PDF to every employee with a payroll record for the
// given month (optionally restricted to `employeeIds`). Per-employee
// failures are collected — the batch continues on error. When SMTP is not
// configured the sends are simulated (fast, fully logged) so the flow is
// demo-safe.
//
// Response: { ok, mode, month, totals: { attempted, sent, failed, skippedNoEmail },
//             results: [{ employeeId, employeeName, recipientTo?, ok, error?, emailLogId? }] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const month: string = body.month;
  const employeeIds: string[] | undefined = Array.isArray(body.employeeIds)
    ? body.employeeIds.filter((x: unknown) => typeof x === "string")
    : undefined;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }

  // Load payroll rows for the month (+ employees with contact info).
  const payrolls = await db.payroll.findMany({
    where: {
      payrollMonth: month,
      ...(employeeIds && employeeIds.length
        ? { employeeId: { in: employeeIds } }
        : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          officialEmail: true,
          personalEmail: true,
          status: true,
        },
      },
    },
    orderBy: { employeeId: "asc" },
  });

  const eligible = payrolls.filter(
    (p) => p.employee && (p.employee.officialEmail || p.employee.personalEmail)
  );
  const skippedNoEmail = payrolls.length - eligible.length;

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const smtp = await getSmtpConfig();

  const results: {
    employeeId: string;
    employeeName: string;
    recipientTo?: string;
    ok: boolean;
    error?: string;
    emailLogId?: string;
  }[] = [];

  let sent = 0;
  let failed = 0;

  // Sequential processing keeps SMTP servers happy (no parallel burst) and
  // keeps PDF rendering memory-stable in serverless environments.
  for (const p of eligible) {
    try {
      const r = await sendPayslipEmail({
        employeeId: p.employeeId,
        month,
        createPayrollIfMissing: false, // batch only emails existing payroll rows
        writeActivity: false, // one activity entry per employee would flood the feed
      });
      if (r.ok) {
        sent += 1;
        results.push({
          employeeId: p.employeeId,
          employeeName: p.employee.fullName,
          recipientTo: r.recipientTo,
          ok: true,
          emailLogId: r.emailLogId,
        });
      } else {
        failed += 1;
        results.push({
          employeeId: p.employeeId,
          employeeName: p.employee.fullName,
          recipientTo: r.recipientTo,
          ok: false,
          error: r.error,
        });
      }
      // Small pause between real SMTP sends to stay polite / avoid limits.
      if (smtp) await new Promise((res) => setTimeout(res, 250));
    } catch (e: unknown) {
      failed += 1;
      results.push({
        employeeId: p.employeeId,
        employeeName: p.employee?.fullName ?? "Unknown",
        ok: false,
        error: e instanceof Error ? e.message : "Unexpected error",
      });
    }
  }

  const deliveredLabel = smtp ? "delivered" : "simulated";

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "PAYSLIP_BATCH_EMAILED",
      entityType: "Payroll",
      entityId: month,
      description: `Batch payslip email for ${month}: ${sent} ${deliveredLabel}, ${failed} failed${
        skippedNoEmail ? `, ${skippedNoEmail} skipped (no email)` : ""
      }.`,
      metadata: JSON.stringify({
        month,
        mode: smtp ? "smtp" : "simulated",
        attempted: eligible.length,
        sent,
        failed,
        skippedNoEmail,
      }),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      mode: smtp ? "smtp" : "simulated",
      month,
      totals: {
        attempted: eligible.length,
        sent,
        failed,
        skippedNoEmail,
      },
      results,
    },
    { status: 200 }
  );
}
