import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExpenseMeta, toExpenseDTO } from "../../route";

// POST /api/expenses/[id]/reject
// Transition PENDING → REJECTED. Body: { reason, approverName? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const reason = String(body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "reason is required to reject an expense" },
      { status: 400 }
    );
  }

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
      { error: `Cannot reject an expense that is ${meta.status}. Only PENDING expenses can be rejected.` },
      { status: 400 }
    );
  }

  const approverName =
    String(body.approverName ?? "HR Admin").trim() || "HR Admin";

  meta.status = "REJECTED";
  meta.approvedAt = new Date().toISOString();
  meta.approvedBy = approverName;
  meta.rejectReason = reason;

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
      type: "EXPENSE_REJECTED",
      title: "Expense Rejected",
      employeeId: meta.employeeId,
      description: `${meta.employeeName}'s ${meta.type.toLowerCase()} expense of ${meta.currency} ${meta.amount} was rejected by ${approverName}: ${reason}`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "EXPENSE_REJECT",
      entityType: "Expense",
      entityId: id,
      description: `Rejected ${meta.type.toLowerCase()} expense for ${meta.employeeName}. Reason: ${reason}`,
    },
  });

  const dto = toExpenseDTO(updated);
  return NextResponse.json(dto);
}
