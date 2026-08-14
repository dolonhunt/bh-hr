import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// GET /api/salary-revisions?employeeId=...
// Returns salary revision history for an employee, ordered desc by date.
// Stored as Activity rows of type "SALARY_REVISION".
// Each row's description holds a JSON string with old/new salary fields.
// ============================================================

interface RevisionPayload {
  oldBasicSalary: number;
  newBasicSalary: number;
  oldAllowances: number;
  newAllowances: number;
  oldDeductions: number;
  newDeductions: number;
  oldTax: number;
  newTax: number;
  reason?: string | null;
  changedBy?: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId query parameter is required" },
      { status: 400 }
    );
  }

  const activities = await db.activity.findMany({
    where: {
      employeeId,
      type: "SALARY_REVISION",
    },
    orderBy: { createdAt: "desc" },
  });

  const items = activities.map((a) => {
    let payload: RevisionPayload | null = null;
    try {
      payload = a.description ? (JSON.parse(a.description) as RevisionPayload) : null;
    } catch {
      payload = null;
    }
    const oldNet =
      (payload?.oldBasicSalary ?? 0) +
      (payload?.oldAllowances ?? 0) -
      (payload?.oldDeductions ?? 0) -
      (payload?.oldTax ?? 0);
    const newNet =
      (payload?.newBasicSalary ?? 0) +
      (payload?.newAllowances ?? 0) -
      (payload?.newDeductions ?? 0) -
      (payload?.newTax ?? 0);
    return {
      id: a.id,
      employeeId: a.employeeId,
      oldBasicSalary: payload?.oldBasicSalary ?? 0,
      newBasicSalary: payload?.newBasicSalary ?? 0,
      oldAllowances: payload?.oldAllowances ?? 0,
      newAllowances: payload?.newAllowances ?? 0,
      oldDeductions: payload?.oldDeductions ?? 0,
      newDeductions: payload?.newDeductions ?? 0,
      oldTax: payload?.oldTax ?? 0,
      newTax: payload?.newTax ?? 0,
      oldNetSalary: oldNet,
      newNetSalary: newNet,
      reason: payload?.reason ?? null,
      changedBy: payload?.changedBy ?? null,
      changedAt: a.createdAt,
    };
  });

  return NextResponse.json({ items, total: items.length });
}
