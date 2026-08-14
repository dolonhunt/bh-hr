import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leave/balances?employeeId=<cuid>
//
// Returns leave balances per employee per leave type:
//   allocated  -> from LeaveType.defaultDays
//   used       -> sum of `days` from APPROVED leave requests
//   pending    -> sum of `days` from PENDING leave requests
//   remaining  -> allocated - used - pending
//
// If no `employeeId` is provided, balances are computed for every employee.
//
// Response shape:
//   { items: [{ employeeId, employeeName, employeePhoto, leaveTypeId,
//               leaveTypeName, leaveTypeColor, allocated, used, pending,
//               remaining }] }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";

  // Load leave types (every employee has an allocation per leave type)
  const leaveTypes = await db.leaveType.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  // Load employees (filtered if requested). We only need a few fields.
  const employeeWhere: any = {};
  if (employeeId) employeeWhere.id = employeeId;

  const employees = await db.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      photo: true,
      status: true,
    },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0 || leaveTypes.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Aggregate leave requests per (employee, leaveType) grouped by status.
  // We only need APPROVED + PENDING for the sums.
  const employeeIds = employees.map((e) => e.id);

  const leaveRequests = await db.leaveRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: { in: ["APPROVED", "PENDING"] },
    },
    select: {
      employeeId: true,
      leaveTypeId: true,
      status: true,
      days: true,
    },
  });

  // Map: `${employeeId}|${leaveTypeId}` -> { used, pending }
  const sums = new Map<string, { used: number; pending: number }>();
  for (const lr of leaveRequests) {
    const key = `${lr.employeeId}|${lr.leaveTypeId}`;
    const entry = sums.get(key) ?? { used: 0, pending: 0 };
    if (lr.status === "APPROVED") entry.used += lr.days;
    else if (lr.status === "PENDING") entry.pending += lr.days;
    sums.set(key, entry);
  }

  // Build the flat items list: one entry per (employee × leave type)
  const items: Array<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    employeePhoto: string | null;
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeColor: string;
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
  }> = [];

  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const key = `${emp.id}|${lt.id}`;
      const sumsEntry = sums.get(key) ?? { used: 0, pending: 0 };
      const allocated = lt.defaultDays ?? 0;
      const used = round2(sumsEntry.used);
      const pending = round2(sumsEntry.pending);
      const remaining = round2(allocated - used - pending);
      items.push({
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        employeeName: emp.fullName,
        employeePhoto: emp.photo ?? null,
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeColor: lt.color ?? "#10b981",
        allocated,
        used,
        pending,
        remaining,
      });
    }
  }

  return NextResponse.json({ items });
}

function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
