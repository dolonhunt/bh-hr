import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attendance = await db.attendance.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(attendance);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Recompute derived fields if checkIn/checkOut changed
  const existing = await db.attendance.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const checkIn = body.checkIn ? new Date(body.checkIn) : existing.checkIn;
  const checkOut = body.checkOut ? new Date(body.checkOut) : existing.checkOut;

  let workingHours = existing.workingHours;
  let late = existing.late;
  let lateMinutes = existing.lateMinutes;
  let overtime = existing.overtime;

  if (checkIn && checkOut) {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    if (diffMs > 0) {
      workingHours = Math.round((diffMs / 3600000) * 100) / 100;
      overtime = workingHours > 9 ? Math.round((workingHours - 9) * 100) / 100 : 0;
    }
  }
  if (body.checkIn && checkIn) {
    const cutoff = new Date(checkIn);
    cutoff.setHours(9, 15, 0, 0);
    if (checkIn.getTime() > cutoff.getTime()) {
      late = true;
      lateMinutes = Math.round((checkIn.getTime() - cutoff.getTime()) / 60000);
    } else {
      late = false;
      lateMinutes = 0;
    }
  }

  const updated = await db.attendance.update({
    where: { id },
    data: {
      checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
      checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      workingHours,
      late,
      lateMinutes,
      overtime,
      status: body.status,
      note: body.note,
    },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.attendance.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "ATTENDANCE_DELETE",
      entityType: "Attendance",
      entityId: id,
      description: `Deleted attendance record ${id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
