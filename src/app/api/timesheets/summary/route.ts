import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTimesheetMeta } from "../route";

// ============================================================
// Timesheet summary endpoint
//
// GET /api/timesheets/summary?from=&to=&employeeId=
// Returns:
//   - totalHours       (number, sum of all matching entries)
//   - entryCount       (number)
//   - byProject        [{ projectName, hours, entries }]
//   - byEmployee       [{ employeeId, employeeName, photo, hours, entries }] (sorted desc)
//   - dailyTotals      [{ date, hours, entries }] (sorted asc)
//   - avgHoursPerDay   (number)
//   - distinctDays     (number)
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const where: any = { type: "TIMESHEET" };
  if (employeeId) where.employeeId = employeeId;

  const records = await db.activity.findMany({
    where,
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let items = records
    .map((a) => {
      const m = parseTimesheetMeta(a.description);
      if (!m) return null;
      return {
        id: a.id,
        employeeId: m.employeeId || a.employeeId || "",
        employeeName: m.employeeName || a.employee?.fullName || "",
        employeePhoto: m.employeePhoto ?? a.employee?.photo ?? null,
        projectName: m.projectName,
        task: m.task,
        date: m.date,
        hours: m.hours,
        status: m.status,
        createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (from) {
    const f = new Date(from).getTime();
    items = items.filter((x) => new Date(x.date).getTime() >= f);
  }
  if (to) {
    const t = new Date(to).getTime();
    items = items.filter((x) => new Date(x.date).getTime() <= t);
  }

  const totalHours = items.reduce((s, x) => s + x.hours, 0);
  const entryCount = items.length;

  // By project (group by projectName, "Unknown" if null)
  const projectMap = new Map<string, { hours: number; entries: number }>();
  for (const x of items) {
    const key = x.projectName ?? "Unknown";
    const cur = projectMap.get(key) ?? { hours: 0, entries: 0 };
    cur.hours += x.hours;
    cur.entries += 1;
    projectMap.set(key, cur);
  }
  const byProject = Array.from(projectMap.entries())
    .map(([projectName, v]) => ({ projectName, hours: v.hours, entries: v.entries }))
    .sort((a, b) => b.hours - a.hours);

  // By employee
  const empMap = new Map<
    string,
    { employeeName: string; photo: string | null; hours: number; entries: number }
  >();
  for (const x of items) {
    const cur = empMap.get(x.employeeId) ?? {
      employeeName: x.employeeName,
      photo: x.employeePhoto,
      hours: 0,
      entries: 0,
    };
    cur.hours += x.hours;
    cur.entries += 1;
    empMap.set(x.employeeId, cur);
  }
  const byEmployee = Array.from(empMap.entries())
    .map(([employeeId, v]) => ({ employeeId, ...v }))
    .sort((a, b) => b.hours - a.hours);

  // Daily totals
  const dayMap = new Map<string, { hours: number; entries: number }>();
  for (const x of items) {
    const d = new Date(x.date);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const cur = dayMap.get(key) ?? { hours: 0, entries: 0 };
    cur.hours += x.hours;
    cur.entries += 1;
    dayMap.set(key, cur);
  }
  const dailyTotals = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, hours: v.hours, entries: v.entries }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const distinctDays = dailyTotals.length;
  const avgHoursPerDay =
    distinctDays > 0 ? Math.round((totalHours / distinctDays) * 100) / 100 : 0;

  return NextResponse.json({
    totalHours: Math.round(totalHours * 100) / 100,
    entryCount,
    distinctDays,
    avgHoursPerDay,
    byProject,
    byEmployee,
    dailyTotals,
    from: from || null,
    to: to || null,
  });
}
