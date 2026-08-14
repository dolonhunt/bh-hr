import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const date = searchParams.get("date") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (date) {
    // Match the calendar day
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    where.date = { gte: start, lte: end };
  }
  if (departmentId || search) {
    where.employee = {};
    if (departmentId) where.employee.departmentId = departmentId;
    if (search) {
      where.employee.OR = [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
        { officialEmail: { contains: search } },
      ];
    }
  }

  const [total, items] = await Promise.all([
    db.attendance.count({ where }),
    db.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true, designation: true },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Compute working hours + late from checkIn/checkOut if provided
  let workingHours: number | null = null;
  let late = false;
  let lateMinutes = 0;
  let overtime = 0;

  if (body.checkIn && body.checkOut) {
    const inTime = new Date(body.checkIn);
    const outTime = new Date(body.checkOut);
    const diffMs = outTime.getTime() - inTime.getTime();
    if (diffMs > 0) {
      workingHours = Math.round((diffMs / 3600000) * 100) / 100;
      if (workingHours > 9) overtime = Math.round((workingHours - 9) * 100) / 100;
    }
  }
  // Determine late if check-in past 09:15 of the day
  if (body.checkIn) {
    const inTime = new Date(body.checkIn);
    const cutoff = new Date(inTime);
    cutoff.setHours(9, 15, 0, 0);
    if (inTime.getTime() > cutoff.getTime()) {
      late = true;
      lateMinutes = Math.round((inTime.getTime() - cutoff.getTime()) / 60000);
    }
  }

  const status = body.status || (late ? "LATE" : "PRESENT");

  const attendance = await db.attendance.create({
    data: {
      employeeId: body.employeeId,
      date: body.date ? new Date(body.date) : new Date(),
      checkIn: body.checkIn ? new Date(body.checkIn) : null,
      checkOut: body.checkOut ? new Date(body.checkOut) : null,
      workingHours,
      late,
      lateMinutes,
      overtime,
      status,
      note: body.note || null,
    },
    include: {
      employee: { include: { department: true, designation: true } },
    },
  });

  await db.activity.create({
    data: {
      employeeId: body.employeeId,
      type: "CREATED",
      title: "Attendance Recorded",
      description: `Attendance marked as ${status} for ${attendance.employee.fullName}.`,
    },
  });

  return NextResponse.json(attendance, { status: 201 });
}
