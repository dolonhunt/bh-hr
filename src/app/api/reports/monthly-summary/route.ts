import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildMonthlyReportPdf,
  collectMonthlyStats,
  getReportRecipients,
  sendMonthlyReport,
} from "@/lib/monthly-report";

// =============================================================
// POST /api/reports/monthly-summary
//   { month?: "YYYY-MM"       (default: current month)
//     recipients?: "a@b.c, d@e.f"  (falls back to Setting monthlyReportRecipients)
//     send?: boolean          (true = email; false/omitted = PDF download) }
// =============================================================

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const month: string =
    typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : currentMonth();
  const send: boolean = body.send === true;

  const company = await db.company.findFirst({ orderBy: { createdAt: "asc" } });

  if (!send) {
    // PDF preview download (no email)
    const [stats, user] = await Promise.all([
      collectMonthlyStats(month),
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

    try {
      await db.auditLog.create({
        data: {
          userId: user?.id ?? null,
          action: "REPORT_GENERATE",
          entityType: "Report",
          description: `Generated monthly HR summary PDF preview for ${month} (no email)`,
          metadata: JSON.stringify({ month, pdfSizeBytes: pdfBuffer.length }),
        },
      });
    } catch {
      // non-fatal
    }

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hr-summary-${month}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Email mode
  const recipients = await getReportRecipients(
    typeof body.recipients === "string" ? body.recipients : null
  );
  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error:
          "No recipients — add at least one email in Settings → Automation, or pass recipients in the request.",
      },
      { status: 400 }
    );
  }

  const result = await sendMonthlyReport({
    month,
    recipients,
    triggeredBy: "manual",
  });

  return NextResponse.json({
    ok: true,
    month: result.monthLabel,
    mode: result.mode,
    pdfSizeBytes: result.pdfSizeBytes,
    results: result.results,
  });
}
