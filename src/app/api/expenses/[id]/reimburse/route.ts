import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseMeta, toExpenseDTO } from "../../route";

// POST /api/expenses/[id]/reimburse
// Transition APPROVED → REIMBURSED. Body: { reimbursementDate?, paymentRef?, approverName? }
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
  if (meta.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Cannot reimburse an expense that is ${meta.status}. Only APPROVED expenses can be reimbursed.` },
      { status: 400 }
    );
  }

  const approverName =
    String(body.approverName ?? "HR Admin").trim() || "HR Admin";
  const reimbursementDate = body.reimbursementDate
    ? new Date(body.reimbursementDate).toISOString()
    : new Date().toISOString();
  const paymentRef =
    body.paymentRef === null || body.paymentRef === ""
      ? null
      : String(body.paymentRef ?? null);

  meta.status = "REIMBURSED";
  meta.reimbursementDate = reimbursementDate;
  meta.paymentRef = paymentRef;
  if (!meta.approvedBy) meta.approvedBy = approverName;

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
      type: "EXPENSE_REIMBURSED",
      title: "Expense Reimbursed",
      employeeId: meta.employeeId,
      description: `${meta.employeeName}'s ${meta.type.toLowerCase()} expense of ${meta.currency} ${meta.amount} was reimbursed${paymentRef ? ` (ref: ${paymentRef})` : ""}.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_REIMBURSE",
      entityType: "Expense",
      entityId: id,
      description: `Reimbursed ${meta.type.toLowerCase()} expense for ${meta.employeeName} (${meta.currency} ${meta.amount})${paymentRef ? `. Payment ref: ${paymentRef}` : ""}.`,
    },
  });

  const dto = toExpenseDTO(updated);
  return NextResponse.json(dto);
}
