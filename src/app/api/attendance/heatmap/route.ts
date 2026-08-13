import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/attendance/heatmap?employeeId=&months=3
// Returns daily attendance data for the last N months (default 3).
//
// Each item: { date, status, workingHours, count? }
//   - When employeeId is provided: count is 1 (single record per day).
//   - When aggregated (no employeeId): the day's "status" is the
//     highest-intensity status across all employees that day, and count
//     is the number of attendance records for that day. Days with no
//     records at all are NOT returned — the frontend treats them as empty.
//
// Intensity mapping (used by the frontend for color):
//   PRESENT=4, LATE=3, REMOTE=3, HALF_DAY=2, LEAVE=1, ABSENT=0, HOLIDAY=-1

const INTENSITY: Record<string, number> = {
  PRESENT: 4,
  LATE: 3,
  REMOTE: 3,
  HALF_DAY: 2,
  LEAVE: 1,
  ABSENT: 0,
  HOLIDAY: -1,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const monthsRaw = parseInt(searchParams.get("months") || "3", 10);
  const months = Number.isFinite(monthsRaw) && monthsRaw > 0 && monthsRaw <= 24
    ? monthsRaw
    : 3;

  // Build the date window: today → today - (months * ~30 days).
  // We use the first day of the month N months ago to align with calendar
  // columns and make the heatmap look tidy.
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1, 0, 0, 0, 0);

  const where: any = {
    date: { gte: start, lte: today },
  };
  if (employeeId) where.employeeId = employeeId;

  const records = await db.attendance.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      date: true,
      status: true,
      workingHours: true,
    },
  });

  if (employeeId) {
    // Individual mode: one record per day (usually).
    // Deduplicate by date just in case.
    const byDate = new Map<string, { date: string; status: string; workingHours: number | null }>();
    for (const r of records) {
      const key = localDateKey(r.date);
      // Keep the highest-intensity record for the day if there are duplicates.
      const existing = byDate.get(key);
      if (!existing || (INTENSITY[r.status] ?? -1) > (INTENSITY[existing.status] ?? -1)) {
        byDate.set(key, {
          date: key,
          status: r.status,
          workingHours: r.workingHours,
        });
      }
    }
    const items = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({
      mode: "individual",
      employeeId,
      months,
      startDate: localDateKey(start),
      endDate: localDateKey(today),
      items,
    });
  }

  // Aggregated mode: group by date, pick highest-intensity status, count records.
  const grouped = new Map<
    string,
    { status: string; workingHoursSum: number; count: number }
  >();
  for (const r of records) {
    const key = localDateKey(r.date);
    const cur = grouped.get(key);
    if (!cur) {
      grouped.set(key, {
        status: r.status,
        workingHoursSum: r.workingHours ?? 0,
        count: 1,
      });
    } else {
      cur.count += 1;
      cur.workingHoursSum += r.workingHours ?? 0;
      if ((INTENSITY[r.status] ?? -1) > (INTENSITY[cur.status] ?? -1)) {
        cur.status = r.status;
      }
    }
  }

  const items = Array.from(grouped.entries())
    .map(([date, v]) => ({
      date,
      status: v.status,
      workingHours: v.count > 0 ? Math.round((v.workingHoursSum / v.count) * 100) / 100 : null,
      count: v.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    mode: "aggregated",
    employeeId: null,
    months,
    startDate: localDateKey(start),
    endDate: localDateKey(today),
    items,
  });
}

// Convert a Date to a "YYYY-MM-DD" string using LOCAL time (avoids UTC shifting
// a date back by one day in negative timezones).
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
