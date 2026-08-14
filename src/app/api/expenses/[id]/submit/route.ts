import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseMeta, toExpenseDTO } from "../../route";

// POST /api/expenses/[id]/submit
// Transition DRAFT → PENDING. Creates an Activity log entry.
export async function POST(
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
  const meta = parseExpenseMeta(activity.description);
  if (!meta) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (meta.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Cannot submit an expense that is ${meta.status}. Only DRAFT expenses can be submitted.` },
      { status: 400 }
    );
  }

  meta.status = "PENDING";
  meta.submittedAt = new Date().toISOString();

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  // Activity log entry (audit-style record visible on employee timeline).
  await db.activity.create({
    data: {
      type: "EXPENSE_SUBMITTED",
      title: "Expense Submitted",
      employeeId: meta.employeeId,
      description: `${meta.employeeName} submitted a ${meta.type.toLowerCase()} expense of ${meta.currency} ${meta.amount} for approval.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_SUBMIT",
      entityType: "Expense",
      entityId: id,
      description: `Submitted ${meta.type.toLowerCase()} expense for ${meta.employeeName} (${meta.currency} ${meta.amount}).`,
    },
  });

  const dto = toExpenseDTO(updated);
  return NextResponse.json(dto);
}
