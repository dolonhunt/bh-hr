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
      description: `Updated employee ${updated.fullName}`,
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
