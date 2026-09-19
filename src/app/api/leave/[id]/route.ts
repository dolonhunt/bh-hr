import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leave = await db.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true, designation: true } },
      leaveType: true,
    },
  });
  if (!leave) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(leave);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // If status is being changed to APPROVED/REJECTED, set decidedAt + approverId
  const isDecision =
    body.status === "APPROVED" || body.status === "REJECTED" || body.status === "CANCELLED";

  // ----- Hard-block over-allocation (optional, Settings → Leave Types) -----
  // When the `leaveApprovalHardBlock` setting is "true", approving a request
  // that would exceed the employee's allocated balance is rejected here,
  // server-side. Committed days = APPROVED + PENDING (this request included).
  if (body.status === "APPROVED") {
    const hardBlock = await db.setting.findUnique({
      where: { key: "leaveApprovalHardBlock" },
    });
    if (hardBlock?.value === "true") {
      const request = await db.leaveRequest.findUnique({
        where: { id },
        include: { leaveType: true },
      });
      if (request) {
        const siblings = await db.leaveRequest.groupBy({
          by: ["status"],
          _sum: { days: true },
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            id: { not: request.id },
            status: { in: ["APPROVED", "PENDING"] },
          },
        });
        const used = siblings.find((s) => s.status === "APPROVED")?._sum.days ?? 0;
        const pendingOther = siblings.find((s) => s.status === "PENDING")?._sum.days ?? 0;
        const allocated = request.leaveType.defaultDays ?? 0;
        const committed = used + pendingOther + (request.days ?? 0);
        const remainingAfter = allocated - committed;
        if (remainingAfter < 0) {
          return NextResponse.json(
            {
              error: `Blocked: approving this ${request.leaveType.name} request exceeds ${request.leaveType.name} balance by ${Math.abs(remainingAfter)} day(s) (allocated ${allocated}, used ${used}, pending ${pendingOther + (request.days ?? 0)}). Turn off "Block over-allocation" in Settings → Leave Types to allow override.`,
              code: "OVER_ALLOCATION",
              allocated,
              used,
              pending: pendingOther + (request.days ?? 0),
              remainingAfter,
            },
            { status: 409 }
          );
        }
      }
    }
  }

  const updated = await db.leaveRequest.update({
    where: { id },
    data: {
      status: body.status,
      approverNote: body.approverNote,
      approverId: body.approverId ?? (isDecision ? "system" : undefined),
      decidedAt: isDecision ? new Date() : undefined,
      // Also allow editing basic fields if not a decision
      reason: body.reason,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      days: body.days,
      attachment: body.attachment,
      leaveTypeId: body.leaveTypeId,
    },
    include: {
      employee: { include: { department: true, designation: true } },
      leaveType: true,
    },
  });

  await db.activity.create({
    data: {
      employeeId: updated.employeeId,
      type: body.status === "APPROVED" ? "LEAVE_APPROVED" : body.status === "REJECTED" ? "LEAVE_REJECTED" : "UPDATED",
      title: `Leave ${body.status}`,
      description: `${updated.employee.fullName}'s ${updated.leaveType.name} request was ${body.status.toLowerCase()}.`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leave = await db.leaveRequest.findUnique({ where: { id } });
  if (!leave) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.leaveRequest.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "LEAVE_DELETE",
      entityType: "LeaveRequest",
      entityId: id,
      description: `Deleted leave request for ${leave.employeeId}`,
    },
  });

  return NextResponse.json({ ok: true });
}
