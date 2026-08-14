import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// GET /api/reports/predictions
//
// Predictive analytics for the Reports module. Returns:
//   - attritionRisk: per-employee risk scores (0-100) with risk factors
//   - performanceTrend: UP/DOWN/STABLE trend for employees with 2+ reviews
//   - headcountForecast: 3/6/12 month projections based on historical
//                        hire & attrition rates
//   - departmentRisk: per-department risk summary (heatmap data)
//
// Risk scoring rules (cumulative, capped at 100):
//   • Low latest performance score (< 60)        +30
//   • No salary revision in last 12 months       +20
//   • > 5 absent days in last 30 days            +25
//   • No promotion in last 24 months             +15
//   • Probation employmentType or status         +10
// ============================================================

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type Trend = "UP" | "DOWN" | "STABLE";

interface AttritionEmployee {
  employeeId: string;
  name: string;
  photo?: string | null;
  department: string;
  score: number;
  riskLevel: RiskLevel;
  factors: string[];
}

interface PerformanceTrendEmployee {
  employeeId: string;
  name: string;
  trend: Trend;
  currentScore: number;
  previousScore: number;
  delta: number;
}

interface DepartmentRisk {
  name: string;
  avgRisk: number;
  lowPerformerCount: number;
  vacancyCount: number;
  headcount: number;
}

function classifyRisk(score: number): RiskLevel {
  if (score >= 61) return "HIGH";
  if (score >= 31) return "MEDIUM";
  return "LOW";
}

function classifyTrend(delta: number): Trend {
  if (delta > 0) return "UP";
  if (delta < 0) return "DOWN";
  return "STABLE";
}

export async function GET() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // -----------------------------------------------------
  // Load employees with everything we need in one pass.
  // -----------------------------------------------------
  const employees = await db.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      photo: true,
      employmentType: true,
      employmentStatus: true,
      joiningDate: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      performances: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { overallScore: true, createdAt: true, reviewPeriod: true },
      },
      activities: {
        where: {
          type: { in: ["SALARY_REVISION", "PROMOTION"] },
        },
        orderBy: { createdAt: "desc" },
        select: { type: true, createdAt: true },
      },
    },
  });

  // -----------------------------------------------------
  // Pull attendance (last 30 days) once for everyone.
  // -----------------------------------------------------
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const attendanceRaw = await db.attendance.findMany({
    where: {
      date: { gte: thirtyDaysAgo },
      status: "ABSENT",
    },
    select: { employeeId: true, id: true },
  });
  const absentCounts: Record<string, number> = {};
  for (const a of attendanceRaw) {
    absentCounts[a.employeeId] = (absentCounts[a.employeeId] ?? 0) + 1;
  }

  // -----------------------------------------------------
  // Departments (so we can count vacancies + headcount).
  // -----------------------------------------------------
  const departments = await db.department.findMany({
    select: { id: true, name: true },
  });
  const openJobs = await db.job.findMany({
    where: { status: "OPEN" },
    select: { departmentId: true, vacancy: true },
  });
  const vacancyByDept: Record<string, number> = {};
  for (const j of openJobs) {
    if (!j.departmentId) continue;
    vacancyByDept[j.departmentId] =
      (vacancyByDept[j.departmentId] ?? 0) + j.vacancy;
  }

  // -----------------------------------------------------
  // 1. Attrition risk per employee
  // -----------------------------------------------------
  const twelveMonthsAgo = new Date(
    today.getTime() - 365 * 24 * 60 * 60 * 1000
  );
  const twentyFourMonthsAgo = new Date(
    today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
  );

  const attritionEmployees: AttritionEmployee[] = employees.map((e) => {
    const factors: string[] = [];
    let score = 0;

    // Low latest performance score (< 60)
    const latestPerf = e.performances[0];
    if (latestPerf && latestPerf.overallScore < 60) {
      score += 30;
      factors.push(
        `Low performance score (${Math.round(latestPerf.overallScore)})`
      );
    }

    // Salary stagnation — no SALARY_REVISION in the last 12 months.
    const recentSalaryRevision = e.activities.find(
      (a) => a.type === "SALARY_REVISION" && a.createdAt >= twelveMonthsAgo
    );
    if (!recentSalaryRevision) {
      score += 20;
      factors.push("No salary revision in 12 months");
    }

    // High absenteeism — > 5 absent days in the last 30.
    const absentDays = absentCounts[e.id] ?? 0;
    if (absentDays > 5) {
      score += 25;
      factors.push(`High absenteeism (${absentDays} absent days in 30d)`);
    }

    // No promotion in last 24 months.
    const recentPromotion = e.activities.find(
      (a) => a.type === "PROMOTION" && a.createdAt >= twentyFourMonthsAgo
    );
    if (!recentPromotion) {
      score += 15;
      factors.push("No promotion in 24 months");
    }

    // Probation status
    const isProbation =
      (e.employmentType || "").toUpperCase() === "PROBATION" ||
      (e.employmentStatus || "").toUpperCase() === "PROBATION";
    if (isProbation) {
      score += 10;
      factors.push("On probation");
    }

    if (score > 100) score = 100;

    return {
      employeeId: e.employeeId,
      name: e.fullName,
      photo: e.photo ?? null,
      department: e.department?.name ?? "Unassigned",
      score,
      riskLevel: classifyRisk(score),
      factors: factors.length ? factors : ["No significant risk factors"],
    };
  });

  // Sort by score descending so high-risk employees appear first.
  attritionEmployees.sort((a, b) => b.score - a.score);

  const avgRisk = attritionEmployees.length
    ? Math.round(
        attritionEmployees.reduce((s, e) => s + e.score, 0) /
          attritionEmployees.length
      )
    : 0;
  const highRiskCount = attritionEmployees.filter(
    (e) => e.riskLevel === "HIGH"
  ).length;

  // -----------------------------------------------------
  // 2. Performance trend (employees with 2+ reviews)
  // -----------------------------------------------------
  const performanceTrend: PerformanceTrendEmployee[] = employees
    .filter((e) => e.performances.length >= 2)
    .map((e) => {
      // performances are ordered desc by createdAt, so [0] is the most recent.
      const current = e.performances[0];
      const previous = e.performances[1];
      const currentScore = Math.round(current.overallScore);
      const previousScore = Math.round(previous.overallScore);
      const delta = currentScore - previousScore;
      return {
        employeeId: e.employeeId,
        name: e.fullName,
        trend: classifyTrend(delta),
        currentScore,
        previousScore,
        delta,
      };
    })
    .sort((a, b) => a.delta - b.delta); // declining first

  // -----------------------------------------------------
  // 3. Headcount forecast
  // -----------------------------------------------------
  // Current active headcount
  const current = await db.employee.count({
    where: {
      employmentStatus: { notIn: ["RESIGNED", "TERMINATED"] },
    },
  });

  // Historical hiring rate — employees joined per month, avg over last 12 mo
  const twelveMonthsAgoStart = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1,
    0,
    0,
    0,
    0
  );
  const joinedRecently = await db.employee.findMany({
    where: { joiningDate: { gte: twelveMonthsAgoStart } },
    select: { joiningDate: true },
  });
  const hireRate = joinedRecently.length / 12;

  // Historical attrition rate — count employees currently RESIGNED/TERMINATED
  // (proxy for "left"). We don't track an exit date, so distribute over 12 mo.
  const leftCount = await db.employee.count({
    where: { employmentStatus: { in: ["RESIGNED", "TERMINATED"] } },
  });
  const attritionRate = leftCount / 12;

  // Total open vacancies (we'll assume 60% fill rate per month — i.e. we
  // gradually close vacancies as hires come in, but new ones open at the
  // historical hire rate minus the attrition shortfall).
  const totalVacancies = openJobs.reduce((s, j) => s + j.vacancy, 0);

  // Net monthly delta = hires − attrition. Cap vacancy fill so we don't
  // double-count: forecast hires = (historical hire rate) but we also bring
  // on at most the open vacancy count over the horizon. Cap attrition so the
  // forecast can't go below 30% of current headcount (sanity floor).
  const netMonthly = Math.max(hireRate - attritionRate, -current * 0.05);
  const forecast3m = Math.max(
    Math.round(current + netMonthly * 3),
    Math.round(current * 0.3)
  );
  const forecast6m = Math.max(
    Math.round(current + netMonthly * 6),
    Math.round(current * 0.3)
  );
  const forecast12m = Math.max(
    Math.round(current + netMonthly * 12),
    Math.round(current * 0.3)
  );

  // -----------------------------------------------------
  // 4. Department risk summary
  // -----------------------------------------------------
  const deptHeadcount: Record<string, number> = {};
  const deptRiskSum: Record<string, number> = {};
  const deptLowPerformer: Record<string, number> = {};
  for (const e of employees) {
    const deptName = e.department?.name ?? "Unassigned";
    const deptId = e.department?.id ?? "__unassigned";
    deptHeadcount[deptName] = (deptHeadcount[deptName] ?? 0) + 1;
    // risk sum
    const risk = attritionEmployees.find((a) => a.employeeId === e.employeeId);
    if (risk) {
      deptRiskSum[deptName] = (deptRiskSum[deptName] ?? 0) + risk.score;
    }
    // low performer count
    const latestPerf = e.performances[0];
    if (latestPerf && latestPerf.overallScore < 60) {
      deptLowPerformer[deptName] = (deptLowPerformer[deptName] ?? 0) + 1;
    }
    // silence unused-var warning while keeping the deptId lookup around
    void deptId;
  }

  const departmentRisk: DepartmentRisk[] = departments.map((d) => {
    const headcount = deptHeadcount[d.name] ?? 0;
    const riskSum = deptRiskSum[d.name] ?? 0;
    const avgRisk = headcount > 0 ? Math.round(riskSum / headcount) : 0;
    return {
      name: d.name,
      avgRisk,
      lowPerformerCount: deptLowPerformer[d.name] ?? 0,
      vacancyCount: vacancyByDept[d.id] ?? 0,
      headcount,
    };
  });
  // Also include "Unassigned" if there are any such employees.
  if (deptHeadcount["Unassigned"]) {
    const headcount = deptHeadcount["Unassigned"];
    const riskSum = deptRiskSum["Unassigned"] ?? 0;
    departmentRisk.push({
      name: "Unassigned",
      avgRisk: Math.round(riskSum / headcount),
      lowPerformerCount: deptLowPerformer["Unassigned"] ?? 0,
      vacancyCount: 0,
      headcount,
    });
  }
  departmentRisk.sort((a, b) => b.avgRisk - a.avgRisk);

  return NextResponse.json({
    attritionRisk: {
      employees: attritionEmployees,
      avgRisk,
      highRiskCount,
      total: attritionEmployees.length,
    },
    performanceTrend: {
      employees: performanceTrend,
      up: performanceTrend.filter((p) => p.trend === "UP").length,
      down: performanceTrend.filter((p) => p.trend === "DOWN").length,
      stable: performanceTrend.filter((p) => p.trend === "STABLE").length,
      total: performanceTrend.length,
    },
    headcountForecast: {
      current,
      forecast3m,
      forecast6m,
      forecast12m,
      hireRate: Number(hireRate.toFixed(2)),
      attritionRate: Number(attritionRate.toFixed(2)),
      netMonthly: Number(netMonthly.toFixed(2)),
      totalVacancies,
    },
    departmentRisk: {
      departments: departmentRisk,
    },
  });
}
