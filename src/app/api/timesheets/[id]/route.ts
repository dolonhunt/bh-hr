import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseTimesheetMeta,
  toTimesheetDTO,
  type TimesheetMeta,
} from "../route";

// GET /api/timesheets/[id]  → fetch a single timesheet entry
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
  if (!activity || activity.type !== "TIMESHEET") {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  const dto = toTimesheetDTO(activity);
  if (!dto) {
    return NextResponse.json({ error: "Timesheet entry not found" }, { status: 404 });
  }
  return NextResponse.json(dto);
}

// PATCH /api/timesheets/[id]  → update an entry (only if DRAFT)
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
        error: `Cannot edit an entry that is ${meta.status}. Only DRAFT entries can be edited.`,
      },
      { status: 400 }
    );
  }

  if (body.task !== undefined) {
    const t = String(body.task).trim();
    if (!t) {
      return NextResponse.json(
        { error: "task cannot be empty" },
        { status: 400 }
      );
    }
    meta.task = t;
  }
  if (body.hours !== undefined) {
    const h =
      typeof body.hours === "number" && isFinite(body.hours)
        ? body.hours
        : Number(body.hours) || 0;
    if (h <= 0 || h > 24) {
      return NextResponse.json(
        { error: "hours must be a positive number up to 24" },
        { status: 400 }
      );
    }
    meta.hours = h;
  }
  if (body.date !== undefined) {
    meta.date = body.date ? new Date(body.date).toISOString() : meta.date;
  }
  if (body.projectId !== undefined) {
    meta.projectId =
      body.projectId === null || body.projectId === ""
        ? null
        : String(body.projectId);
  }
  if (body.projectName !== undefined) {
    meta.projectName =
      body.projectName === null || body.projectName === ""
        ? null
        : String(body.projectName).trim() || null;
  }
  if (body.description !== undefined) {
    meta.description =
      body.description === null || body.description === ""
        ? null
        : String(body.description);
  }
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
      title: meta.projectName ?? "",
      employeeId: meta.employeeId,
      description: JSON.stringify(meta as TimesheetMeta),
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_UPDATE",
      entityType: "Timesheet",
      entityId: id,
      description: `Updated timesheet entry for ${meta.employeeName} (${meta.hours}h on ${meta.task}).`,
    },
  });

  const dto = toTimesheetDTO(updated);
  return NextResponse.json(dto);
}

// DELETE /api/timesheets/[id]  → delete an entry (only if DRAFT)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
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
        error: `Cannot delete an entry that is ${meta.status}. Only DRAFT entries can be deleted.`,
      },
      { status: 400 }
    );
  }

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_DELETE",
      entityType: "Timesheet",
      entityId: id,
      description: `Deleted timesheet entry for ${meta.employeeName}.`,
    },
  });

  return NextResponse.json({ ok: true });
}
