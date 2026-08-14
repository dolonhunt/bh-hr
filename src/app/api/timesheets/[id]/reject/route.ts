import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTimesheetMeta, toTimesheetDTO } from "../../route";

// POST /api/timesheets/[id]/reject
// Transition SUBMITTED → REJECTED. Body: { reason, approverName? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const reason = String(body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "reason is required to reject a timesheet entry" },
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
  if (!activity || activity.type !== "TIMESHEET") {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  const meta = parseTimesheetMeta(activity.description);
  if (!meta) {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  if (meta.status !== "SUBMITTED") {
    return NextResponse.json(
      {
        error: `Cannot reject an entry that is ${meta.status}. Only SUBMITTED entries can be rejected.`,
      },
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
      type: "TIMESHEET_REJECTED",
      title: "Timesheet Rejected",
      employeeId: meta.employeeId,
      description: `${meta.employeeName}'s timesheet entry (${meta.hours}h on ${meta.task}) was rejected by ${approverName}: ${reason}`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_REJECT",
      entityType: "Timesheet",
      entityId: id,
      description: `Rejected timesheet entry for ${meta.employeeName}. Reason: ${reason}`,
    },
  });

  const dto = toTimesheetDTO(updated);
  return NextResponse.json(dto);
}
