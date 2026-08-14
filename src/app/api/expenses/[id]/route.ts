import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseExpenseMeta,
  toExpenseDTO,
  EXPENSE_TYPES,
  type ExpenseType,
  type ExpenseMeta,
} from "../route";

// GET /api/expenses/[id]  → fetch a single expense
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });
  if (!activity || activity.type !== "EXPENSE") {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  const dto = toExpenseDTO(activity);
  if (!dto) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json(dto);
}

// PATCH /api/expenses/[id]  → update an expense (only if DRAFT)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });
  if (!activity || activity.type !== "EXPENSE") {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  const meta = parseExpenseMeta(activity.description);
  if (!meta) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (meta.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: `Cannot edit an expense that is ${meta.status}. Only DRAFT expenses can be edited.`,
      },
      { status: 400 }
    );
  }

  // Apply field updates.
  if (body.type !== undefined) {
    const t = String(body.type).toUpperCase() as ExpenseType;
    if (!EXPENSE_TYPES.includes(t)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${EXPENSE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.type = t;
  }
  if (body.description !== undefined) {
    const d = String(body.description).trim();
    if (!d) {
      return NextResponse.json(
        { error: "description cannot be empty" },
        { status: 400 }
      );
    }
    meta.description = d;
  }
  if (body.amount !== undefined) {
    const a =
      typeof body.amount === "number" && isFinite(body.amount)
        ? body.amount
        : Number(body.amount) || 0;
    if (a <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    meta.amount = a;
  }
  if (body.currency !== undefined) {
    meta.currency = String(body.currency ?? "BDT").toUpperCase() || "BDT";
  }
  if (body.date !== undefined) {
    meta.date = body.date ? new Date(body.date).toISOString() : meta.date;
  }
  if (body.receipt !== undefined) {
    meta.receipt =
      body.receipt === null || body.receipt === ""
        ? null
        : String(body.receipt);
  }
  if (body.notes !== undefined) {
    meta.notes =
      body.notes === null || body.notes === ""
        ? null
        : String(body.notes);
  }
  // Allow employee reassignment in DRAFT.
  if (body.employeeId !== undefined && body.employeeId !== meta.employeeId) {
    const newEmpId = String(body.employeeId).trim();
    if (newEmpId) {
      const newEmp = await db.employee.findUnique({
        where: { id: newEmpId },
        select: { id: true, fullName: true, employeeId: true, photo: true },
      });
      if (!newEmp) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }
      meta.employeeId = newEmp.id;
      meta.employeeName = newEmp.fullName;
      meta.employeePhoto = newEmp.photo ?? null;
    }
  }

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: meta.type, // keep title in sync with type
      employeeId: meta.employeeId,
      description: JSON.stringify(meta as ExpenseMeta),
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_UPDATE",
      entityType: "Expense",
      entityId: id,
      description: `Updated ${meta.type.toLowerCase()} expense for ${meta.employeeName}.`,
    },
  });

  const dto = toExpenseDTO(updated);
  return NextResponse.json(dto);
}

// DELETE /api/expenses/[id]  → delete an expense (only if DRAFT)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      employee: {
        select: { fullName: true },
      },
    },
  });
  if (!activity || activity.type !== "EXPENSE") {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  const meta = parseExpenseMeta(activity.description);
  if (!meta) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (meta.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: `Cannot delete an expense that is ${meta.status}. Only DRAFT expenses can be deleted.`,
      },
      { status: 400 }
    );
  }

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_DELETE",
      entityType: "Expense",
      entityId: id,
      description: `Deleted ${meta.type.toLowerCase()} expense for ${meta.employeeName}.`,
    },
  });

  return NextResponse.json({ ok: true });
}
