import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: any = {};
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    db.leaveType.count({ where }),
    db.leaveType.findMany({
      where,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const leaveType = await db.leaveType.create({
    data: {
      name: body.name,
      code: body.code,
      defaultDays: Number(body.defaultDays) || 0,
      paid: body.paid ?? true,
      color: body.color || "#10b981",
      status: body.status || "ACTIVE",
    },
  });

  return NextResponse.json(leaveType, { status: 201 });
}
