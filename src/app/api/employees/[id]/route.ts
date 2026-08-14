import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      role: true,
      designation: true,
      manager: true,
      subordinates: { include: { department: true, designation: true } },
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
      },
      leaveRequests: {
        orderBy: { appliedAt: "desc" },
        take: 10,
        include: { leaveType: true },
      },
      payrolls: {
        orderBy: { payrollMonth: "desc" },
        take: 12,
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { template: true },
      },
      performances: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!employee)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Fetch current employee BEFORE updating, so we can diff salary fields.
  const prior = await db.employee.findUnique({ where: { id } });
  if (!prior) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.employee.update({
    where: { id },
    data: {
      fullName: body.fullName,
      firstName: body.fullName?.split(" ")[0],
      lastName: body.fullName?.split(" ").slice(1).join(" ") || null,
      photo: body.photo,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender,
      phone: body.phone,
      personalEmail: body.personalEmail,
      officialEmail: body.officialEmail,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      zipCode: body.zipCode,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      emergencyRelation: body.emergencyRelation,
      departmentId: body.departmentId,
      roleId: body.roleId,
      designationId: body.designationId,
      employmentType: body.employmentType,
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
      confirmationDate: body.confirmationDate
        ? new Date(body.confirmationDate)
        : undefined,
      employmentStatus: body.employmentStatus,
      workLocation: body.workLocation,
      basicSalary: body.basicSalary,
      allowances: body.allowances,
      deductions: body.deductions,
      tax: body.tax,
      bankName: body.bankName,
      bankAccount: body.bankAccount,
      bankIfsc: body.bankIfsc,
      paymentMethod: body.paymentMethod,
      reportingManagerId: body.reportingManagerId,
    },
  });

  // Salary revision tracking: compare old vs new values for the 4 payroll fields.
  // If any changed, write an Activity entry of type "SALARY_REVISION".
  const numOrZero = (v: unknown): number =>
    typeof v === "number" && !isNaN(v) ? v : typeof v === "string" && v !== "" ? Number(v) || 0 : 0;

  const oldBasic = numOrZero(prior.basicSalary);
  const newBasic = numOrZero(body.basicSalary);
  const oldAllowances = numOrZero(prior.allowances);
  const newAllowances = numOrZero(body.allowances);
  const oldDeductions = numOrZero(prior.deductions);
  const newDeductions = numOrZero(body.deductions);
  const oldTax = numOrZero(prior.tax);
  const newTax = numOrZero(body.tax);

  const salaryChanged =
    oldBasic !== newBasic ||
    oldAllowances !== newAllowances ||
    oldDeductions !== newDeductions ||
    oldTax !== newTax;

  if (salaryChanged) {
    const revisionReason =
      typeof body.revisionReason === "string" && body.revisionReason.trim()
        ? body.revisionReason.trim()
        : null;

    await db.activity.create({
      data: {
        employeeId: id,
        type: "SALARY_REVISION",
        title: "Salary Revised",
        description: JSON.stringify({
          oldBasicSalary: oldBasic,
          newBasicSalary: newBasic,
          oldAllowances,
          newAllowances,
          oldDeductions,
          newDeductions,
          oldTax,
          newTax,
          reason: revisionReason,
          changedBy: "HR_ADMIN",
        }),
      },
    });
  }

  await db.activity.create({
    data: {
      employeeId: id,
      type: "UPDATED",
      title: "Employee Updated",
      description: `${updated.fullName}'s profile was updated.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EMPLOYEE_UPDATE",
      entityType: "Employee",
      entityId: id,
      description: salaryChanged
        ? `Updated employee ${updated.fullName} (incl. salary revision)`
        : `Updated employee ${updated.fullName}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.employee.findUnique({ where: { id } });
  await db.employee.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "EMPLOYEE_DELETE",
      entityType: "Employee",
      entityId: id,
      description: `Deleted employee ${employee?.fullName ?? id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
