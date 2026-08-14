import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leave/calendar?month=YYYY-MM
// Returns all approved + pending leave requests that overlap the given month.
// Each item: { id, employeeId, employeeName, employeePhoto, leaveTypeName,
// leaveTypeColor, startDate, endDate, days, status }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month") || "";

  // Validate / parse the month param. Default to current month.
  let year: number;
  let monthIdx: number; // 0-indexed
  if (/^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    monthIdx = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  // Month window: first day 00:00 local → last day 23:59:59.999 local
  // We treat dates as wall-clock dates (no timezone shifting) — matches how
  // leave requests are stored/visualised in the UI.
  const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

  // Leave requests overlap the month if startDate <= monthEnd AND endDate >= monthStart.
  // We only show APPROVED + PENDING (REJECTED is hidden, per spec).
  const records = await db.leaveRequest.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: {
      employee: true,
      leaveType: true,
    },
    orderBy: [{ startDate: "asc" }, { appliedAt: "asc" }],
  });

  const items = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employee?.fullName ?? "Unknown",
    employeePhoto: r.employee?.photo ?? null,
    leaveTypeName: r.leaveType?.name ?? "Leave",
    leaveTypeColor: r.leaveType?.color ?? "#10b981",
    startDate: r.startDate,
    endDate: r.endDate,
    days: r.days,
    status: r.status,
  }));

  return NextResponse.json({
    month: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
    items,
  });
}
