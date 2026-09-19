import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeLop, lopNoteSuffix } from "@/lib/lop";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const payrollMonth = searchParams.get("payrollMonth") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: any = {};
  if (payrollMonth) where.payrollMonth = payrollMonth;
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (departmentId || search) {
    where.employee = {};
    if (departmentId) where.employee.departmentId = departmentId;
    if (search) {
      where.employee.OR = [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }
  }

  const [total, items] = await Promise.all([
    db.payroll.count({ where }),
    db.payroll.findMany({
      where,
      include: {
        employee: { include: { department: true, designation: true } },
      },
      orderBy: [{ payrollMonth: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Compute net salary if not provided
  const basic = Number(body.basicSalary) || 0;
  const allowances = Number(body.allowances) || 0;
  const deductions = Number(body.deductions) || 0;
  const tax = Number(body.tax) || 0;

  // Auto-load from employee if employeeId + payrollMonth provided but salary fields missing
  let employee = null;
  if (body.employeeId) {
    employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      include: { department: true, designation: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
  }

  // Optional unpaid-leave (LOP) deduction — computed server-side so the
  // applied amount always matches the leave records, never client input.
  let finalDeductions = deductions || employee?.deductions || 0;
  let note = body.note || null;
  let lopInfo: { lopDays: number; suggestedDeduction: number } | null = null;
  if (body.applyLop && body.employeeId && body.payrollMonth) {
    const lop = await computeLop(body.employeeId, String(body.payrollMonth));
    if (lop && lop.lopDays > 0) {
      finalDeductions = (Number(finalDeductions) || 0) + lop.suggestedDeduction;
      note = note ? `${note} · ${lopNoteSuffix(lop)}` : lopNoteSuffix(lop);
      lopInfo = {
        lopDays: lop.lopDays,
        suggestedDeduction: lop.suggestedDeduction,
      };
    }
  }

  const netSalary =
    body.netSalary ?? basic + allowances - finalDeductions - tax;

  const payroll = await db.payroll.create({
    data: {
      employeeId: body.employeeId,
      payrollMonth: body.payrollMonth,
      basicSalary: basic || employee?.basicSalary || 0,
      allowances: allowances || employee?.allowances || 0,
      deductions: finalDeductions,
      tax: tax || employee?.tax || 0,
      netSalary,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      status: body.status || "DRAFT",
      note,
    },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });

  await db.activity.create({
    data: {
      employeeId: body.employeeId,
      type: "CREATED",
      title: "Payroll Created",
      description: lopInfo
        ? `Payroll for ${payroll.payrollMonth} created for ${payroll.employee.fullName} (incl. ${lopInfo.lopDays} LOP day(s) — ৳${lopInfo.suggestedDeduction}).`
        : `Payroll for ${payroll.payrollMonth} created for ${payroll.employee.fullName}.`,
    },
  });

  return NextResponse.json({ ...payroll, lop: lopInfo }, { status: 201 });
}
