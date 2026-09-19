import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getReportRecipients, previousMonth, sendMonthlyReport } from "@/lib/monthly-report";

// =============================================================
// GET /api/cron/monthly-report
//
// Vercel Cron target (vercel.json → crons, schedule "0 6 1 * *"):
// on the 1st of each month it emails the previous month's HR
// summary to the configured recipients (Settings → Automation).
//
// Auth: Vercel Cron sends "Authorization: Bearer $CRON_SECRET".
//   * If CRON_SECRET is set on the deployment, requests must present
//     the matching bearer token (401 otherwise).
//   * If CRON_SECRET is not set (e.g. local dev), the endpoint allows
//     the request but reports authMode: "open" so misconfigurations
//     are visible in the response.
//
// Skips gracefully (200 + skipped: true) when the automation is
// disabled or no recipients are configured — never throws to cron.
// =============================================================

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const authMode = secret ? "bearer" : "open";

  if (secret && presented !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enabledSetting = await db.setting.findUnique({
      where: { key: "monthlyReportEnabled" },
    });
    const enabled = enabledSetting?.value === "true";

    if (!enabled) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "monthlyReportEnabled is not true (Settings → Automation)",
        authMode,
      });
    }

    const recipients = await getReportRecipients(null);
    if (recipients.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "no recipients configured (Setting monthlyReportRecipients)",
        authMode,
      });
    }

    const month = previousMonth();
    const result = await sendMonthlyReport({
      month,
      recipients,
      triggeredBy: "cron",
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      month: result.monthLabel,
      mode: result.mode,
      sent: result.results.filter((r) => r.ok).length,
      failed: result.results.filter((r) => !r.ok).length,
      results: result.results,
      authMode,
    });
  } catch (err: any) {
    // Cron endpoints should answer 200-ish even on failure so Vercel
    // doesn't retry-storm; details go to the response + stderr.
    console.error("[cron/monthly-report] failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
