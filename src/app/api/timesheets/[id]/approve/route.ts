import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTimesheetMeta, toTimesheetDTO } from "../../route";

// POST /api/timesheets/[id]/approve
// Transition SUBMITTED → APPROVED. Body: { approverName? }
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
        error: `Cannot approve an entry that is ${meta.status}. Only SUBMITTED entries can be approved.`,
      },
      { status: 400 }
    );
  }

  const approverName =
    String(body.approverName ?? "HR Admin").trim() || "HR Admin";

  meta.status = "APPROVED";
  meta.approvedAt = new Date().toISOString();
  meta.approvedBy = approverName;
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
      type: "TIMESHEET_APPROVED",
      title: "Timesheet Approved",
      employeeId: meta.employeeId,
      description: `${meta.employeeName}'s timesheet entry (${meta.hours}h on ${meta.task}) was approved by ${approverName}.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_APPROVE",
      entityType: "Timesheet",
      entityId: id,
      description: `Approved timesheet entry for ${meta.employeeName} (${meta.hours}h on ${meta.task}).`,
    },
  });

  const dto = toTimesheetDTO(updated);
  return NextResponse.json(dto);
}
