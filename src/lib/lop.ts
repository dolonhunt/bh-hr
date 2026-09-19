// =============================================================
// Loss-of-Pay (LOP) — unpaid-leave proration helpers
// =============================================================
//
// Shared by /api/payroll/unpaid-leave (preview) and the payroll
// creation routes (POST /api/payroll, batch-create, generate-payslip)
// so the client preview and the server-applied deduction can never
// diverge.
//
// Rules:
//  * A month's working days exclude the Fri/Sat Bangladesh weekend
//    and company holidays (Holiday table).
//  * Only APPROVED leave requests whose leave type is marked
//    unpaid (LeaveType.paid = false) count towards LOP.
//  * Leave days are counted per working day inside the month's
//    overlap — weekends/holidays inside a leave span are NOT paid
//    days, so they are not deducted either.
//  * Per-day rate = basicSalary / workingDaysInMonth (rounded 2dp).
//    Suggested deduction = perDayRate * lopDays (rounded 2dp).

import { db } from "@/lib/db";

export const WEEKEND_DAYS = [5, 6]; // Friday, Saturday — Bangladesh weekend

export interface LopLeaveContribution {
  leaveRequestId: string;
  typeName: string;
  daysInMonth: number;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LopResult {
  month: string; // "YYYY-MM"
  basicSalary: number;
  workingDaysInMonth: number;
  lopDays: number; // approved unpaid working days in this month
  perDayRate: number;
  suggestedDeduction: number;
  contributions: LopLeaveContribution[];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function monthBounds(month: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return null;
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
  return { start, end };
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Compute holiday-aware, weekend-aware unpaid-leave (LOP) numbers for
 * an employee in a payroll month.
 */
export async function computeLop(
  employeeId: string,
  month: string
): Promise<LopResult | null> {
  const bounds = monthBounds(month);
  if (!bounds) return null;
  const { start, end } = bounds;

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { basicSalary: true },
  });
  if (!employee) return null;

  // Leaves overlapping the month: approved + unpaid leave type only.
  const leaves = await db.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: { leaveType: { select: { name: true, paid: true } } },
  });

  // Holidays overlapping the month.
  const holidays = await db.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });
  const holidaySet = new Set(
    holidays.map((h) => new Date(h.date).toDateString())
  );

  const isWorkingDay = (d: Date) =>
    !WEEKEND_DAYS.includes(d.getDay()) && !holidaySet.has(d.toDateString());

  // Working days in the whole month.
  const workingDaysInMonth = eachDay(start, end).filter(isWorkingDay).length;

  // Count approved unpaid working days per leave request within the month.
  const contributions: LopLeaveContribution[] = [];
  let lopDays = 0;
  for (const lr of leaves) {
    if (lr.leaveType?.paid !== false) continue;
    const overlapStart = lr.startDate > start ? lr.startDate : start;
    const overlapEnd = lr.endDate < end ? lr.endDate : end;
    if (overlapStart > overlapEnd) continue;
    const days = eachDay(overlapStart, overlapEnd).filter(isWorkingDay).length;
    if (days <= 0) continue;
    lopDays += days;
    contributions.push({
      leaveRequestId: lr.id,
      typeName: lr.leaveType?.name ?? "Unpaid",
      daysInMonth: days,
      startDate: lr.startDate.toISOString(),
      endDate: lr.endDate.toISOString(),
      reason: lr.reason,
    });
  }

  const basicSalary = Number(employee.basicSalary) || 0;
  const perDayRate =
    workingDaysInMonth > 0 ? round2(basicSalary / workingDaysInMonth) : 0;
  const suggestedDeduction = round2(perDayRate * lopDays);

  return {
    month,
    basicSalary,
    workingDaysInMonth,
    lopDays,
    perDayRate,
    suggestedDeduction,
    contributions,
  };
}

/**
 * Build the payroll `note` suffix used when an LOP deduction is applied,
 * e.g. "LOP: 2 unpaid working day(s) deducted (৳9,450.00)".
 */
export function lopNoteSuffix(lop: LopResult): string {
  const days = lop.lopDays === 1 ? "day" : "days";
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(lop.suggestedDeduction);
  return `LOP: ${lop.lopDays} unpaid working ${days} deducted (৳${amount})`;
}
