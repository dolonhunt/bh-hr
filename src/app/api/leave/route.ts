import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const leaveTypeId = searchParams.get("leaveTypeId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: any = {};
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (search) {
    where.employee = {
      OR: [
        { fullName: { contains: search } },
        { employeeId: { contains: search } },
      ],
    };
  }

  const [total, items] = await Promise.all([
    db.leaveRequest.count({ where }),
    db.leaveRequest.findMany({
      where,
      include: {
        employee: { include: { department: true, designation: true } },
        leaveType: true,
      },
      orderBy: { appliedAt: "desc" },
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

  // Compute days inclusive
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  const days = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  );

  const leave = await db.leaveRequest.create({
    data: {
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      startDate,
      endDate,
      days,
      reason: body.reason,
      attachment: body.attachment || null,
      status: body.status || "PENDING",
      appliedAt: new Date(),
    },
    include: {
      employee: { include: { department: true, designation: true } },
      leaveType: true,
    },
  });

  await db.activity.create({
    data: {
      employeeId: body.employeeId,
      type: "CREATED",
      title: "Leave Request Submitted",
      description: `${leave.employee.fullName} requested ${days} day(s) of ${leave.leaveType.name}.`,
    },
  });

  return NextResponse.json(leave, { status: 201 });
}
