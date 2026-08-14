import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTimesheetMeta, toTimesheetDTO } from "../../route";

// POST /api/timesheets/[id]/submit
// Transition DRAFT → SUBMITTED.
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
  if (!activity || activity.type !== "TIMESHEET") {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  const meta = parseTimesheetMeta(activity.description);
  if (!meta) {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  if (meta.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: `Cannot submit an entry that is ${meta.status}. Only DRAFT entries can be submitted.`,
      },
      { status: 400 }
    );
  }

  meta.status = "SUBMITTED";
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

  await db.activity.create({
    data: {
      type: "TIMESHEET_SUBMITTED",
      title: "Timesheet Submitted",
      employeeId: meta.employeeId,
      description: `${meta.employeeName} submitted a timesheet entry (${meta.hours}h on ${meta.task}) for approval.`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_SUBMIT",
      entityType: "Timesheet",
      entityId: id,
      description: `Submitted timesheet entry for ${meta.employeeName} (${meta.hours}h on ${meta.task}).`,
    },
  });

  const dto = toTimesheetDTO(updated);
  return NextResponse.json(dto);
}
