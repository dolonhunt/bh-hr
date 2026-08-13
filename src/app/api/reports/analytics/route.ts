import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reports/analytics
// Returns aggregate analytics for the enhanced Reports dashboard:
//   - Employee growth (last 12 months, monthly hires)
//   - Attendance rate trend (last 30 days, % present)
//   - Leave utilization by type (pie data)
//   - Payroll distribution by department (bar data)
//   - Document generation trend (last 6 months, count by type)
//   - Performance score distribution (histogram)
//   - Recruitment funnel (count at each pipeline stage)
//   - Top-level KPIs (total employees, avg attendance rate, total payroll this
//     month, documents generated this month).
export async function GET() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // ----- Date helpers -----
  const monthsBack = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - n, 1, 0, 0, 0, 0);
    return d;
  };
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  // =========================================================
  // 1. Employee growth — last 12 months of hires
  // =========================================================
  const twelveMonthsAgo = monthsBack(11);
  const employees = await db.employee.findMany({
    where: { joiningDate: { gte: twelveMonthsAgo } },
    select: { joiningDate: true, status: true },
  });
  const growthBuckets: { month: string; hires: number; cumulative: number }[] =
    [];
  let cumulative = 0;
  // Pre-count anyone who joined before the 12-month window so the cumulative
  // line starts at the right baseline.
  const beforeWindow = await db.employee.count({
    where: { joiningDate: { lt: twelveMonthsAgo } },
  });
  cumulative = beforeWindow;
  for (let i = 11; i >= 0; i--) {
    const m = monthsBack(i);
    const next = new Date(m);
    next.setMonth(next.getMonth() + 1);
    const hires = employees.filter((e) => {
      if (!e.joiningDate) return false;
      const j = new Date(e.joiningDate);
      return j >= m && j < next;
    }).length;
    cumulative += hires;
    growthBuckets.push({ month: monthLabel(m), hires, cumulative });
  }

  // =========================================================
  // 2. Attendance rate trend — last 30 days, % present
  // =========================================================
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 days inclusive
  const attendanceRaw = await db.attendance.groupBy({
    by: ["date", "status"],
    where: { date: { gte: thirtyDaysAgo } },
    _count: true,
  });
  const attendanceTrend: { date: string; rate: number; present: number; total: number }[] =
    [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRows = attendanceRaw.filter(
      (a) => a.date.toISOString().slice(0, 10) === key
    );
    const present = dayRows
      .filter((a) => a.status === "PRESENT" || a.status === "LATE")
      .reduce((s, a) => s + a._count, 0);
    const total = dayRows.reduce((s, a) => s + a._count, 0);
    const rate = total === 0 ? 0 : Math.round((present / total) * 100);
    attendanceTrend.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate,
      present,
      total,
    });
  }

  // =========================================================
  // 3. Leave utilization by type (pie)
  // =========================================================
  const leaveByTypeRaw = await db.leaveRequest.groupBy({
    by: ["leaveTypeId"],
    _count: true,
    _sum: { days: true },
  });
  const leaveTypes = await db.leaveType.findMany();
  const leaveTypeMap = Object.fromEntries(leaveTypes.map((l) => [l.id, l]));
  const leaveUtilization = leaveByTypeRaw
    .filter((l) => l.leaveTypeId && leaveTypeMap[l.leaveTypeId])
    .map((l) => ({
      name: leaveTypeMap[l.leaveTypeId].name,
      value: l._sum.days ?? 0,
      count: l._count,
      color: leaveTypeMap[l.leaveTypeId].color ?? "#10b981",
    }))
    .sort((a, b) => b.value - a.value);

  // =========================================================
  // 4. Payroll distribution by department (horizontal bar)
  // =========================================================
  const currentMonth = monthKey(now);
  const payrollsThisMonth = await db.payroll.findMany({
    where: { payrollMonth: currentMonth },
    include: { employee: { include: { department: true } } },
  });
  const departments = await db.department.findMany();
  const deptNameById: Record<string, string> = Object.fromEntries(
    departments.map((d) => [d.id, d.name])
  );
  const payrollByDeptMap: Record<string, number> = {};
  for (const p of payrollsThisMonth) {
    const deptName = p.employee?.department?.name ?? "Unassigned";
    payrollByDeptMap[deptName] = (payrollByDeptMap[deptName] ?? 0) + p.netSalary;
  }
  const payrollByDepartment = Object.entries(payrollByDeptMap)
    .map(([name, netSalary]) => ({ name, netSalary: Math.round(netSalary) }))
    .sort((a, b) => b.netSalary - a.netSalary);

  // =========================================================
  // 5. Document generation trend — last 6 months, count by type
  // =========================================================
  const sixMonthsAgo = monthsBack(5);
  const docsRecent = await db.generatedDocument.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { type: true, createdAt: true },
  });
  // Identify the doc types we want as stacked series (cap to top 6 by volume
  // so the chart stays readable; everything else collapses into "Other").
  const typeCounts: Record<string, number> = {};
  for (const d of docsRecent) {
    typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1;
  }
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);
  const docTrend: Record<string, any>[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = monthsBack(i);
    const next = new Date(m);
    next.setMonth(next.getMonth() + 1);
    const row: Record<string, any> = { month: monthLabel(m) };
    for (const t of topTypes) row[t] = 0;
    row.Other = 0;
    for (const d of docsRecent) {
      if (d.createdAt >= m && d.createdAt < next) {
        if (topTypes.includes(d.type)) row[d.type] += 1;
        else row.Other += 1;
      }
    }
    docTrend.push(row);
  }

  // =========================================================
  // 6. Performance score distribution (histogram)
  // =========================================================
  const performances = await db.performance.findMany({
    select: { overallScore: true },
  });
  const perfBuckets = [
    { range: "0-40", min: 0, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-75", min: 61, max: 75, count: 0 },
    { range: "76-85", min: 76, max: 85, count: 0 },
    { range: "86-100", min: 86, max: 100, count: 0 },
  ];
  for (const p of performances) {
    const b = perfBuckets.find((b) => p.overallScore >= b.min && p.overallScore <= b.max);
    if (b) b.count += 1;
  }

  // =========================================================
  // 7. Recruitment funnel (candidate count by stage)
  // =========================================================
  const funnelStages = [
    "APPLIED",
    "SCREENING",
    "SHORTLISTED",
    "INTERVIEW",
    "SELECTED",
    "OFFER",
    "HIRED",
  ];
  const candidatesByStageRaw = await db.candidate.groupBy({
    by: ["status"],
    _count: true,
  });
  const candidatesByStageMap: Record<string, number> = Object.fromEntries(
    candidatesByStageRaw.map((c) => [c.status, c._count])
  );
  // For a true funnel we want cumulative counts (a candidate in INTERVIEW has
  // already passed SCREENING+SHORTLISTED). So we count "all candidates who
  // reached stage X or beyond".
  const stageIndex: Record<string, number> = Object.fromEntries(
    funnelStages.map((s, i) => [s, i])
  );
  const allCandidates = await db.candidate.findMany({ select: { status: true } });
  const recruitmentFunnel = funnelStages.map((stage, idx) => {
    const reached = allCandidates.filter(
      (c) => (stageIndex[c.status] ?? 0) >= idx && c.status !== "REJECTED"
    ).length;
    const atStage = candidatesByStageMap[stage] ?? 0;
    return { stage, count: reached, atStage };
  });

  // =========================================================
  // 8. Top-level KPIs
  // =========================================================
  const [
    totalEmployees,
    totalPayrollThisMonth,
    docsGeneratedThisMonth,
  ] = await Promise.all([
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.payroll.aggregate({
      where: { payrollMonth: currentMonth },
      _sum: { netSalary: true },
    }),
    db.generatedDocument.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    }),
  ]);

  // Average attendance rate over the 30-day trend.
  const avgAttendanceRate = attendanceTrend.length
    ? Math.round(
        attendanceTrend.reduce((s, t) => s + t.rate, 0) /
          attendanceTrend.length
      )
    : 0;

  return NextResponse.json({
    kpis: {
      totalEmployees,
      avgAttendanceRate,
      totalPayrollThisMonth: Math.round(totalPayrollThisMonth._sum.netSalary ?? 0),
      docsGeneratedThisMonth,
    },
    employeeGrowth: growthBuckets,
    attendanceTrend,
    leaveUtilization,
    payrollByDepartment,
    documentTrend: { data: docTrend, types: topTypes },
    performanceDistribution: perfBuckets.map((b) => ({
      range: b.range,
      count: b.count,
    })),
    recruitmentFunnel,
  });
}
