import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseMeta, toExpenseDTO } from "../../route";

// POST /api/expenses/[id]/approve
// Transition PENDING → APPROVED. Body: { notes?, approverName? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

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
  if (meta.status !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot approve an expense that is ${meta.status}. Only PENDING expenses can be approved.` },
      { status: 400 }
    );
  }

  meta.status = "APPROVED";
  meta.approvedAt = new Date().toISOString();
  meta.approvedBy = String(body.approverName ?? "HR Admin").trim() || "HR Admin";
  if (body.notes !== undefined && body.notes !== null && body.notes !== "") {
    meta.notes = String(body.notes);
  }
  meta.rejectReason = null;

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.activity.create({
    data: {
      type: "EXPENSE_APPROVED",
      title: "Expense Approved",
      employeeId: meta.employeeId,
      description: `${meta.employeeName}'s ${meta.type.toLowerCase()} expense of ${meta.currency} ${meta.amount} was approved by ${meta.approvedBy}.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_APPROVE",
      entityType: "Expense",
      entityId: id,
      description: `Approved ${meta.type.toLowerCase()} expense for ${meta.employeeName} (${meta.currency} ${meta.amount}).`,
    },
  });

  const dto = toExpenseDTO(updated);
  return NextResponse.json(dto);
}
