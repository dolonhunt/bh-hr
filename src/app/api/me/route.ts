import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/auth-middleware";

// ============================================================
// GET /api/me — Self-service aggregate for the logged-in user.
//
// Returns the user plus the linked employee's personal HR data:
//   profile, leave balances, recent leave requests, payslips,
//   this-month attendance summary, pending counts.
//
// If the user's email matches an Employee's officialEmail (or
// personalEmail) and no link exists yet, the link is created
// automatically so the My HR portal works out of the box.
//
// PATCH /api/me — Link / unlink the employee profile.
//   body: { linkedEmployeeId: string | null }
// ============================================================

export async function GET(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  let user = await db.user.findUnique({
    where: { id: auth.userId },
    include: {
      linkedEmployee: {
        include: { department: true, designation: true, role: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Auto-link when the login email matches an employee email.
  let autoLinked = false;
  if (!user.linkedEmployeeId) {
    const match = await db.employee.findFirst({
      where: {
        OR: [{ officialEmail: user.email }, { personalEmail: user.email }],
      },
      select: { id: true },
    });
    if (match) {
      await db.user.update({
        where: { id: user.id },
        data: { linkedEmployeeId: match.id },
      });
      user = await db.user.findUnique({
        where: { id: user.id },
        include: {
          linkedEmployee: {
            include: { department: true, designation: true, role: true },
          },
        },
      });
      autoLinked = true;
    }
  }

  const emp = user.linkedEmployee;

  if (!emp) {
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      employee: null,
      autoLinked,
    });
  }

  // ---- Aggregate the employee's own HR data --------------------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    leaveTypes,
    recentLeaveRequests,
    payrolls,
    monthAttendance,
    documentsCount,
    manager,
    allMyLeave,
    pendingLeaveCount,
  ] = await Promise.all([
    db.leaveType.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.leaveRequest.findMany({
      where: { employeeId: emp.id },
      include: { leaveType: { select: { id: true, name: true, color: true } } },
      orderBy: { appliedAt: "desc" },
      take: 6,
    }),
    db.payroll.findMany({
      where: { employeeId: emp.id },
      orderBy: { payrollMonth: "desc" },
      take: 6,
    }),
    db.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: monthStart } },
      select: { status: true },
    }),
    db.generatedDocument.count({ where: { employeeId: emp.id } }),
    emp.reportingManagerId
      ? db.employee.findUnique({
          where: { id: emp.reportingManagerId },
          select: { id: true, fullName: true, photo: true, employeeId: true },
        })
      : Promise.resolve(null),
    db.leaveRequest.findMany({
      where: {
        employeeId: emp.id,
        status: { in: ["APPROVED", "PENDING"] },
      },
      select: { leaveTypeId: true, status: true, days: true },
    }),
    db.leaveRequest.count({ where: { employeeId: emp.id, status: "PENDING" } }),
  ]);

  // Leave balances: allocated (defaultDays) minus approved/pending usage.
  const approvedByType = new Map<string, number>();
  const pendingByType = new Map<string, number>();
  for (const lr of allMyLeave) {
    const map = lr.status === "APPROVED" ? approvedByType : pendingByType;
    map.set(lr.leaveTypeId, (map.get(lr.leaveTypeId) ?? 0) + lr.days);
  }

  const leaveBalances = leaveTypes.map((lt) => {
    const used = approvedByType.get(lt.id) ?? 0;
    const pending = pendingByType.get(lt.id) ?? 0;
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      color: lt.color,
      allocated: lt.defaultDays,
      used,
      pending,
      remaining: Math.max(0, lt.defaultDays - used - pending),
    };
  });

  // Attendance summary for the current month.
  const attCounts: Record<string, number> = {};
  for (const a of monthAttendance) {
    attCounts[a.status] = (attCounts[a.status] ?? 0) + 1;
  }
  const marked = monthAttendance.length;
  const presentish =
    (attCounts.PRESENT ?? 0) +
    (attCounts.LATE ?? 0) +
    (attCounts.REMOTE ?? 0) +
    (attCounts.HALF_DAY ?? 0) * 0.5;
  const attendanceRate = marked > 0 ? Math.round((presentish / marked) * 100) : 0;

  const totalLeaveAllocated = leaveBalances.reduce((s, b) => s + b.allocated, 0);
  const totalLeaveRemaining = leaveBalances.reduce((s, b) => s + b.remaining, 0);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    autoLinked,
    employee: {
      id: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      photo: emp.photo,
      email: emp.officialEmail ?? emp.personalEmail,
      phone: emp.phone,
      department: emp.department
        ? { id: emp.department.id, name: emp.department.name }
        : null,
      designation: emp.designation
        ? { id: emp.designation.id, name: emp.designation.name }
        : null,
      employmentType: emp.employmentType,
      employmentStatus: emp.employmentStatus,
      joiningDate: emp.joiningDate,
      workLocation: emp.workLocation,
      bloodGroup: emp.bloodGroup,
      dateOfBirth: emp.dateOfBirth,
      manager,
    },
    stats: {
      totalLeaveAllocated,
      totalLeaveRemaining,
      attendanceRate,
      pendingLeaveCount,
      payslipsCount: payrolls.length,
      documentsCount,
      monthAttendance: {
        marked,
        present: attCounts.PRESENT ?? 0,
        late: attCounts.LATE ?? 0,
        absent: attCounts.ABSENT ?? 0,
        leave: attCounts.LEAVE ?? 0,
        remote: attCounts.REMOTE ?? 0,
      },
    },
    leaveBalances,
    recentLeaveRequests: recentLeaveRequests.map((lr) => ({
      id: lr.id,
      leaveTypeName: lr.leaveType?.name ?? "Leave",
      color: lr.leaveType?.color ?? null,
      startDate: lr.startDate,
      endDate: lr.endDate,
      days: lr.days,
      status: lr.status,
      appliedAt: lr.appliedAt,
    })),
    payslips: payrolls.map((p) => ({
      id: p.id,
      payrollMonth: p.payrollMonth,
      netSalary: p.netSalary,
      basicSalary: p.basicSalary,
      allowances: p.allowances,
      deductions: p.deductions,
      tax: p.tax,
      status: p.status,
      paymentDate: p.paymentDate,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.linkedEmployeeId === "undefined") {
    return NextResponse.json(
      { error: "linkedEmployeeId is required (string or null to unlink)." },
      { status: 400 }
    );
  }

  const { linkedEmployeeId } = body;

  if (linkedEmployeeId !== null) {
    const emp = await db.employee.findUnique({
      where: { id: String(linkedEmployeeId) },
      select: { id: true, fullName: true, employeeId: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
  }

  const user = await db.user.update({
    where: { id: auth.userId },
    data: { linkedEmployeeId },
    include: {
      linkedEmployee: { include: { department: true, designation: true } },
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      action: "UPDATE",
      entityType: "User",
      entityId: user.id,
      description:
        linkedEmployeeId === null
          ? "Unlinked employee profile from account"
          : `Linked employee profile ${user.linkedEmployee?.employeeId ?? ""} to account`,
    },
  });

  return NextResponse.json({
    ok: true,
    linkedEmployeeId: user.linkedEmployeeId,
    linkedEmployee: user.linkedEmployee
      ? {
          id: user.linkedEmployee.id,
          fullName: user.linkedEmployee.fullName,
          employeeId: user.linkedEmployee.employeeId,
        }
      : null,
  });
}
