import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payroll = await db.payroll.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });
  if (!payroll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(payroll);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Recompute net if salary components changed
  const existing = await db.payroll.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const basic = body.basicSalary ?? existing.basicSalary;
  const allowances = body.allowances ?? existing.allowances;
  const deductions = body.deductions ?? existing.deductions;
  const tax = body.tax ?? existing.tax;
  const netSalary = body.netSalary ?? basic + allowances - deductions - tax;

  const updated = await db.payroll.update({
    where: { id },
    data: {
      basicSalary: basic,
      allowances,
      deductions,
      tax,
      netSalary,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
      status: body.status,
      note: body.note,
      payslipDocId: body.payslipDocId,
    },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });

  await db.activity.create({
    data: {
      employeeId: updated.employeeId,
      type: "UPDATED",
      title: `Payroll ${body.status ?? "Updated"}`,
      description: `Payroll for ${updated.payrollMonth} (${updated.employee.fullName}) updated.`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payroll = await db.payroll.findUnique({ where: { id } });
  if (!payroll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.payroll.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "PAYROLL_DELETE",
      entityType: "Payroll",
      entityId: id,
      description: `Deleted payroll record for ${payroll.employeeId} (${payroll.payrollMonth})`,
    },
  });

  return NextResponse.json({ ok: true });
}
