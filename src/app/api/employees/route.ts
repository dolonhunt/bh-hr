import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: any = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { employeeId: { contains: search } },
      { officialEmail: { contains: search } },
      { personalEmail: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (status) where.employmentStatus = status;

  const [total, items] = await Promise.all([
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      include: {
        department: true,
        role: true,
        designation: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const empCount = await db.employee.count();
  const newEmpId = `EMP${String(empCount + 1).padStart(3, "0")}`;

  const employee = await db.employee.create({
    data: {
      employeeId: newEmpId,
      fullName: body.fullName,
      firstName: body.fullName.split(" ")[0],
      lastName: body.fullName.split(" ").slice(1).join(" ") || null,
      photo: body.photo || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      gender: body.gender || null,
      phone: body.phone || null,
      personalEmail: body.personalEmail || null,
      officialEmail: body.officialEmail || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      zipCode: body.zipCode || null,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      emergencyRelation: body.emergencyRelation || null,
      departmentId: body.departmentId || null,
      roleId: body.roleId || null,
      designationId: body.designationId || null,
      employmentType: body.employmentType || "FULL_TIME",
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
      confirmationDate: body.confirmationDate
        ? new Date(body.confirmationDate)
        : null,
      employmentStatus: body.employmentStatus || "ACTIVE",
      workLocation: body.workLocation || null,
      basicSalary: body.basicSalary || 0,
      allowances: body.allowances || 0,
      deductions: body.deductions || 0,
      tax: body.tax || 0,
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
      bankIfsc: body.bankIfsc || null,
      paymentMethod: body.paymentMethod || "BANK_TRANSFER",
    },
  });

  await db.activity.create({
    data: {
      employeeId: employee.id,
      type: "CREATED",
      title: "Employee Created",
      description: `${employee.fullName} (${employee.employeeId}) added to HR system.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EMPLOYEE_CREATE",
      entityType: "Employee",
      entityId: employee.id,
      description: `Created employee ${employee.fullName} (${employee.employeeId})`,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
