import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalEmployees,
    presentToday,
    onLeaveToday,
    lateToday,
    pendingLeave,
    docsGenerated,
    docsSent,
    failedEmails,
    recentEmployees,
    pendingLeaveReqs,
    recentDocuments,
    attendanceTrend,
    departmentDist,
    leaveTrend,
  ] = await Promise.all([
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.attendance.count({ where: { date: today, status: "PRESENT" } }),
    db.attendance.count({ where: { date: today, status: "LEAVE" } }),
    db.attendance.count({ where: { date: today, status: "LATE" } }),
    db.leaveRequest.count({ where: { status: "PENDING" } }),
    db.generatedDocument.count(),
    db.emailLog.count({ where: { status: "SENT" } }),
    db.emailLog.count({ where: { status: "FAILED" } }),
    db.employee.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { department: true, role: true, designation: true },
    }),
    db.leaveRequest.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { appliedAt: "desc" },
      include: { employee: true, leaveType: true },
    }),
    db.generatedDocument.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { employee: true },
    }),
    db.attendance.groupBy({
      by: ["date", "status"],
      where: { date: { gte: new Date(today.getTime() - 7 * 86400000) } },
      _count: true,
    }),
    db.employee.groupBy({ by: ["departmentId"], _count: true }),
    db.leaveRequest.groupBy({ by: ["status"], _count: true }),
  ]);

  const departments = await db.department.findMany();
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const deptDistribution = departmentDist
    .filter((d) => d.departmentId)
    .map((d) => ({
      name: deptMap[d.departmentId!]?.name ?? "Unknown",
      count: d._count,
      color: deptMap[d.departmentId!]?.color ?? "#10b981",
    }));

  const trend: {
    date: string;
    present: number;
    late: number;
    leave: number;
    absent: number;
  }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    const find = (s: string) =>
      attendanceTrend.find(
        (a) => a.date.toISOString().slice(0, 10) === dayKey && a.status === s
      )?._count ?? 0;
    trend.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      present: find("PRESENT"),
      late: find("LATE"),
      leave: find("LEAVE"),
      absent: find("ABSENT"),
    });
  }

  return NextResponse.json({
    kpis: {
      totalEmployees,
      presentToday,
      onLeaveToday,
      lateToday,
      pendingLeave,
      docsGenerated,
      docsSent,
      failedEmails,
    },
    recentEmployees,
    pendingLeaveReqs,
    recentDocuments,
    attendanceTrend: trend,
    deptDistribution,
    leaveTrend: leaveTrend.map((l) => ({ status: l.status, count: l._count })),
  });
}
