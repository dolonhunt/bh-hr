import { db } from "@/lib/db";
import PDFDocument from "pdfkit";
import { getSmtpConfig, sendViaSmtp, textToEmailHtml } from "@/lib/mailer";

// ============================================================
// Monthly HR Summary Report
//
// Shared pipeline used by:
//   * POST /api/reports/monthly-summary  (HR "Send now" / PDF preview)
//   * GET  /api/cron/monthly-report      (Vercel Cron, 1st of the month)
//
// Collects month-scoped stats (headcount, attendance, leave, payroll)
// and renders a branded multi-section A4 PDF.
// ============================================================

export interface MonthlyStats {
  month: string; // YYYY-MM
  headcount: {
    active: number;
    onLeave: number;
    inactive: number;
    joinersThisMonth: number;
    byDepartment: Array<{ name: string; count: number }>;
  };
  attendance: {
    recorded: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  leave: {
    requests: number;
    byStatus: Array<{ status: string; count: number; days: number }>;
    byType: Array<{ name: string; color: string | null; approvedDays: number }>;
  };
  payroll: {
    records: number;
    totalNet: number;
    byStatus: Array<{ status: string; count: number; totalNet: number }>;
  };
}

export function fmtMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0); // exclusive
  return { start, end };
}

export function previousMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth()).padStart(2, "0")}`;
}

// ------------------------------------------------------------
// Stats collection
// ------------------------------------------------------------

export async function collectMonthlyStats(
  month: string
): Promise<MonthlyStats> {
  const { start, end } = monthRange(month);

  const [
    allEmployees,
    joiners,
    attendanceGrouped,
    leaveGrouped,
    leaveByTypeRaw,
    payrolls,
  ] = await Promise.all([
    db.employee.findMany({
      select: {
        employmentStatus: true,
        department: { select: { name: true } },
      },
    }),
    db.employee.count({
      where: { joiningDate: { gte: start, lt: end } },
    }),
    db.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    db.leaveRequest.groupBy({
      by: ["status"],
      where: { startDate: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { days: true },
    }),
    db.leaveRequest.findMany({
      where: { startDate: { gte: start, lt: end }, status: "APPROVED" },
      select: {
        days: true,
        leaveType: { select: { name: true, color: true } },
      },
    }),
    db.payroll.findMany({
      where: { payrollMonth: month },
      select: { status: true, netSalary: true },
    }),
  ]);

  // Headcount
  const active = allEmployees.filter((e) => e.employmentStatus === "ACTIVE")
    .length;
  const onLeave = allEmployees.filter((e) => e.employmentStatus === "ON_LEAVE")
    .length;
  const inactive = allEmployees.length - active - onLeave;

  const deptMap = new Map<string, number>();
  for (const e of allEmployees) {
    if (e.employmentStatus !== "ACTIVE") continue;
    const name = e.department?.name ?? "— No Department —";
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
  }
  const byDepartment = Array.from(deptMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Attendance
  const byStatus = attendanceGrouped
    .map((g) => ({ status: g.status, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // Leave
  const leaveStatusOrder = ["APPROVED", "PENDING", "REJECTED", "CANCELLED"];
  const leaveByStatusMap = new Map<string, { count: number; days: number }>();
  for (const g of leaveGrouped) {
    leaveByStatusMap.set(g.status, {
      count: g._count._all,
      days: g._sum.days ?? 0,
    });
  }
  const leaveByStatus = Array.from(leaveByStatusMap.entries())
    .map(([status, v]) => ({ status, ...v }))
    .sort(
      (a, b) =>
        leaveStatusOrder.indexOf(a.status) - leaveStatusOrder.indexOf(b.status)
    );

  const typeMap = new Map<string, { color: string | null; days: number }>();
  for (const lr of leaveByTypeRaw) {
    const name = lr.leaveType?.name ?? "Unknown";
    const cur = typeMap.get(name) ?? {
      color: lr.leaveType?.color ?? null,
      days: 0,
    };
    cur.days += lr.days;
    typeMap.set(name, cur);
  }
  const leaveByType = Array.from(typeMap.entries())
    .map(([name, v]) => ({ name, color: v.color, approvedDays: v.days }))
    .sort((a, b) => b.approvedDays - a.approvedDays)
    .slice(0, 6);

  // Payroll
  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const payStatusMap = new Map<string, { count: number; totalNet: number }>();
  for (const p of payrolls) {
    const cur = payStatusMap.get(p.status) ?? { count: 0, totalNet: 0 };
    cur.count += 1;
    cur.totalNet += p.netSalary;
    payStatusMap.set(p.status, cur);
  }
  const payrollByStatus = Array.from(payStatusMap.entries())
    .map(([status, v]) => ({ status, ...v }))
    .sort((a, b) => b.count - a.count);

  const totalLeaveRequests = leaveGrouped.reduce((s, g) => s + g._count._all, 0);

  return {
    month,
    headcount: {
      active,
      onLeave,
      inactive,
      joinersThisMonth: joiners,
      byDepartment,
    },
    attendance: { recorded: byStatus.reduce((s, r) => s + r.count, 0), byStatus },
    leave: { requests: totalLeaveRequests, byStatus: leaveByStatus, byType: leaveByType },
    payroll: { records: payrolls.length, totalNet, byStatus: payrollByStatus },
  };
}

// ------------------------------------------------------------
// PDF builder
// ------------------------------------------------------------

const C = {
  primary: "#10b981",
  primaryDark: "#047857",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  headerBg: "#f3f4f6",
  rowAlt: "#f9fafb",
  amber: "#d97706",
  rose: "#e11d48",
};

function money(n: number): string {
  return `BDT ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export async function buildMonthlyReportPdf(opts: {
  stats: MonthlyStats;
  company: { name: string; address?: string | null; email?: string | null; phone?: string | null } | null;
  generatedAt: Date;
}): Promise<Buffer> {
  const { stats, company, generatedAt } = opts;
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        // bottom margin small enough that footer text at pageHeight-30 fits
        // above page.maxY() — otherwise pdfkit adds a blank page per footer.
        margins: { top: 56, bottom: 16, left: 48, right: 48 },
        bufferPages: true,
        info: {
          Title: `HR Summary — ${fmtMonthLabel(stats.month)}`,
          Author: "BH HR",
          Subject: "Monthly HR Summary Report",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 48;
      const contentWidth = pageWidth - margin * 2;
      const monthLabel = fmtMonthLabel(stats.month);

      // ---- Header band ----
      doc.rect(0, 0, pageWidth, 96).fillColor(C.primary).fill();
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("Monthly HR Summary", margin, 24, { width: contentWidth });
      doc
        .font("Helvetica")
        .fontSize(11)
        .opacity(0.9)
        .text(
          `${company?.name ?? "BH HR"} · ${monthLabel}`,
          margin,
          56,
          { width: contentWidth }
        )
        .opacity(1);

      // Generated line
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.textMuted)
        .text(
          `Generated on ${generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at ${generatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
          margin,
          104,
          { width: contentWidth, align: "right" }
        );

      let y = 128;

      const sectionTitle = (title: string) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor(C.text)
          .text(title, margin, y, { width: contentWidth });
        doc
          .moveTo(margin, y + 17)
          .lineTo(margin + 140, y + 17)
          .strokeColor(C.primary)
          .lineWidth(1.5)
          .stroke();
        y += 28;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 80) {
          doc.addPage();
          y = margin + 8;
        }
      };

      // ---- KPI strip (4 boxes) ----
      const kpis = [
        { label: "ACTIVE EMPLOYEES", value: String(stats.headcount.active) },
        {
          label: "NEW JOINERS",
          value: String(stats.headcount.joinersThisMonth),
        },
        {
          label: "LEAVE REQUESTS",
          value: String(stats.leave.requests),
        },
        {
          label: "PAYROLL (NET)",
          value: money(stats.payroll.totalNet),
        },
      ];
      const gap = 10;
      const boxW = (contentWidth - gap * 3) / 4;
      const boxH = 54;
      kpis.forEach((k, i) => {
        const bx = margin + i * (boxW + gap);
        doc
          .rect(bx, y, boxW, boxH)
          .fillColor(C.rowAlt)
          .fill();
        doc
          .rect(bx, y, boxW, 3)
          .fillColor(C.primary)
          .fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor(C.text)
          .text(k.value, bx + 8, y + 12, { width: boxW - 16 });
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(C.textMuted)
          .text(k.label, bx + 8, y + 34, { width: boxW - 16 });
      });
      y += boxH + 22;

      // ---- Headcount by department ----
      sectionTitle("Headcount by Department");
      ensureSpace(30 + stats.headcount.byDepartment.length * 20);
      const maxCount = Math.max(...stats.headcount.byDepartment.map((d) => d.count), 1);
      const barMaxW = contentWidth - 220;
      stats.headcount.byDepartment.forEach((d, idx) => {
        if (idx % 2 === 1) {
          doc.rect(margin, y - 3, contentWidth, 20).fillColor(C.rowAlt).fill();
        }
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(C.text)
          .text(d.name, margin + 6, y + 1, { width: 130, ellipsis: true });
        const barW = Math.max((d.count / maxCount) * barMaxW, 4);
        doc
          .rect(margin + 145, y + 1, barW, 12)
          .fillColor(C.primary)
          .fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(C.textMuted)
          .text(String(d.count), margin + 150 + barW, y + 1, { width: 40 });
        y += 20;
      });
      y += 14;

      // ---- Attendance ----
      sectionTitle("Attendance");
      ensureSpace(60);
      const totalDays = stats.attendance.recorded || 1;
      const presentish = stats.attendance.byStatus
        .filter((s) => ["PRESENT", "REMOTE", "HALF_DAY"].includes(s.status))
        .reduce((s, r) => s + r.count, 0);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.text)
        .text(
          `${stats.attendance.recorded} attendance records in ${monthLabel} — ${Math.round((presentish / totalDays) * 100)}% present (incl. remote & half-day).`,
          margin,
          y,
          { width: contentWidth }
        );
      y += 22;

      // horizontal segmented bar
      const segColors: Record<string, string> = {
        PRESENT: C.primary,
        REMOTE: "#34d399",
        HALF_DAY: "#fbbf24",
        LATE: "#f59e0b",
        LEAVE: "#94a3b8",
        ABSENT: C.rose,
        HOLIDAY: "#cbd5e1",
      };
      let segX = margin;
      stats.attendance.byStatus.forEach((s) => {
        const w = (s.count / totalDays) * contentWidth;
        if (w <= 0) return;
        doc
          .rect(segX, y, w, 14)
          .fillColor(segColors[s.status] ?? "#a3a3a3")
          .fill();
        segX += w;
      });
      y += 20;

      // legend (two columns)
      const legendItems = stats.attendance.byStatus;
      const colW = contentWidth / 2;
      legendItems.forEach((s, i) => {
        const lx = margin + (i % 2) * colW;
        const ly = y + Math.floor(i / 2) * 16;
        doc
          .rect(lx, ly + 2, 8, 8)
          .fillColor(segColors[s.status] ?? "#a3a3a3")
          .fill();
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(
            `${s.status.replace("_", " ")} — ${s.count}`,
            lx + 14,
            ly,
            { width: colW - 14 }
          );
      });
      y += Math.ceil(legendItems.length / 2) * 16 + 14;

      // ---- Leave ----
      sectionTitle("Leave");
      ensureSpace(70);
      if (stats.leave.byStatus.length === 0) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(C.textMuted)
          .text("No leave requests started this month.", margin, y, {
            width: contentWidth,
          });
        y += 24;
      } else {
        // mini table
        const cols = [
          { label: "STATUS", w: 140 },
          { label: "REQUESTS", w: 90 },
          { label: "DAYS", w: 90 },
        ];
        let lx = margin;
        const rowH = 20;
        cols.forEach((c) => {
          doc
            .rect(lx, y, c.w, rowH)
            .fillColor(C.headerBg)
            .fill();
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(C.text)
            .text(c.label, lx + 6, y + 6, { width: c.w - 10 });
          lx += c.w;
        });
        y += rowH;
        stats.leave.byStatus.forEach((r, idx) => {
          if (idx % 2 === 1) {
            doc
              .rect(margin, y, cols.reduce((s, c) => s + c.w, 0), rowH)
              .fillColor(C.rowAlt)
              .fill();
          }
          lx = margin;
          const statusColor =
            r.status === "APPROVED"
              ? C.primaryDark
              : r.status === "PENDING"
                ? C.amber
                : r.status === "REJECTED"
                  ? C.rose
                  : C.textMuted;
          const cells = [
            { text: r.status, font: "Helvetica-Bold", color: statusColor },
            { text: String(r.count), font: "Helvetica" },
            { text: String(r.days), font: "Helvetica" },
          ];
          cells.forEach((cell, ci) => {
            doc
              .font(cell.font as any)
              .fontSize(8.5)
              .fillColor(cell.color ?? C.text)
              .text(cell.text, lx + 6, y + 6, {
                width: cols[ci].w - 10,
              });
            lx += cols[ci].w;
          });
          y += rowH;
        });
        y += 8;

        if (stats.leave.byType.length > 0) {
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor(C.textMuted)
            .text(
              `Approved days by type: ${stats.leave.byType
                .map((t) => `${t.name} ${t.approvedDays}d`)
                .join(" · ")}`,
              margin,
              y,
              { width: contentWidth }
            );
          y += 22;
        }
      }

      // ---- Payroll ----
      sectionTitle("Payroll");
      ensureSpace(80);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.text)
        .text(
          `${stats.payroll.records} payroll record${stats.payroll.records === 1 ? "" : "s"} for ${monthLabel} — total net ${money(stats.payroll.totalNet)}.`,
          margin,
          y,
          { width: contentWidth }
        );
      y += 22;
      if (stats.payroll.byStatus.length > 0) {
        const chips = stats.payroll.byStatus.map(
          (s) => `${s.status}: ${s.count} (${money(s.totalNet)})`
        );
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(C.textMuted)
          .text(chips.join("   ·   "), margin, y, { width: contentWidth });
        y += 24;
      }

      // ---- Footnotes ----
      ensureSpace(60);
      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor(C.border)
        .lineWidth(0.5)
        .stroke();
      y += 10;
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor(C.textMuted)
        .text(
          "This report is generated automatically by BH HR. Figures cover the stated month only; headcount is as of generation time.",
          margin,
          y,
          { width: contentWidth }
        );

      // ---- Footers ----
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const footerY = pageHeight - 36;
        doc
          .moveTo(margin, footerY)
          .lineTo(pageWidth - margin, footerY)
          .strokeColor(C.border)
          .lineWidth(0.5)
          .stroke();
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.textMuted)
          .text(
            `${company?.name ?? "BH HR"} · HR Summary · ${monthLabel}`,
            margin,
            footerY + 6,
            { width: contentWidth / 2 }
          );
        doc.text(`Page ${i + 1} of ${range.count}`, pageWidth / 2, footerY + 6, {
          width: contentWidth / 2,
          align: "right",
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ------------------------------------------------------------
// Recipients + delivery helper (shared by API + cron)
// ------------------------------------------------------------

export async function getReportRecipients(override?: string | null): Promise<string[]> {
  let raw = (override ?? "").trim();
  if (!raw) {
    const setting = await db.setting.findUnique({
      where: { key: "monthlyReportRecipients" },
    });
    raw = setting?.value ?? "";
  }
  return raw
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

export interface ReportSendResult {
  to: string;
  ok: boolean;
  error?: string;
  emailLogId?: string;
  mode: "smtp" | "simulated";
}

export async function sendMonthlyReport(opts: {
  month: string;
  recipients: string[];
  triggeredBy: "manual" | "cron";
}): Promise<{
  results: ReportSendResult[];
  pdfSizeBytes: number;
  monthLabel: string;
  mode: "smtp" | "simulated";
}> {
  const { month, recipients, triggeredBy } = opts;
  const monthLabel = fmtMonthLabel(month);

  const [stats, company, smtp, user] = await Promise.all([
    collectMonthlyStats(month),
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
    getSmtpConfig(),
    db.user.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  const pdfBuffer = await buildMonthlyReportPdf({
    stats,
    company: company
      ? {
          name: company.name,
          address: company.address,
          email: company.email,
          phone: company.phone,
        }
      : null,
    generatedAt: new Date(),
  });

  const companyName = company?.name ?? "BH HR";
  const subject = `HR Summary Report — ${monthLabel}`;
  const body = [
    `Dear HR team,`,
    ``,
    `Please find attached the monthly HR summary for ${monthLabel}.`,
    ``,
    `Highlights:`,
    `- Active employees: ${stats.headcount.active}`,
    `- New joiners: ${stats.headcount.joinersThisMonth}`,
    `- Leave requests: ${stats.leave.requests}`,
    `- Payroll (net): ${money(stats.payroll.totalNet)}`,
    ``,
    `Regards,`,
    `${companyName} (automated via BH HR)`,
  ].join("\n");

  const attachmentName = `hr-summary-${month}.pdf`;
  const results: ReportSendResult[] = [];

  for (const to of recipients) {
    let status: "SENT" | "FAILED" = "SENT";
    let note: string;
    let mode: "smtp" | "simulated" = smtp ? "smtp" : "simulated";

    if (smtp) {
      const result = await sendViaSmtp(smtp, {
        to,
        subject,
        text: body,
        html: textToEmailHtml(body, {
          heading: `HR Summary · ${monthLabel}`,
          footer: `Sent via BH HR · ${companyName}`,
        }),
        attachments: [
          {
            filename: attachmentName,
            content: Buffer.from(pdfBuffer),
            contentType: "application/pdf",
          },
        ],
      });
      if (result.delivered) {
        note = `Delivered via SMTP (${smtp.host}:${smtp.port})`;
      } else {
        status = "FAILED";
        note = result.error ?? "SMTP delivery failed";
      }
    } else {
      note = `Simulated send (no SMTP configured). ${pdfBuffer.length} byte PDF attachment generated.`;
    }

    const log = await db.emailLog.create({
      data: {
        documentId: null,
        employeeId: null,
        recipientTo: to,
        subject,
        body,
        attachmentName,
        status,
        errorMessage: status === "SENT" ? null : note,
        sentById: user?.id ?? null,
        sentAt: new Date(),
      },
    });

    results.push({ to, ok: status === "SENT", error: status === "SENT" ? undefined : note, emailLogId: log.id, mode });
  }

  // Last-run marker (for the Settings card)
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  await db.setting.upsert({
    where: { key: "monthlyReportLastRun" },
    create: {
      key: "monthlyReportLastRun",
      value: JSON.stringify({
        at: new Date().toISOString(),
        month,
        triggeredBy,
        sent,
        failed,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
    update: {
      value: JSON.stringify({
        at: new Date().toISOString(),
        month,
        triggeredBy,
        sent,
        failed,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "HR_REPORT_EMAILED",
      entityType: "Report",
      description: `Monthly HR summary for ${monthLabel} (${triggeredBy}): ${sent} sent, ${failed} failed — ${smtp ? "SMTP" : "simulated"}.`,
      metadata: JSON.stringify({
        month,
        triggeredBy,
        recipients,
        sent,
        failed,
        pdfSizeBytes: pdfBuffer.length,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
  });

  return {
    results,
    pdfSizeBytes: pdfBuffer.length,
    monthLabel,
    mode: smtp ? "smtp" : "simulated",
  };
}
