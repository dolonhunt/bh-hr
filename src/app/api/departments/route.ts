import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
  }

  const [total, items] = await Promise.all([
    db.department.count({ where }),
    db.department.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const dept = await db.department.create({
    data: {
      name: body.name,
      description: body.description || null,
      color: body.color || "#10b981",
      headId: body.headId || null,
      status: body.status || "ACTIVE",
    },
  });

  await db.auditLog.create({
    data: {
      action: "DEPARTMENT_CREATE",
      entityType: "Department",
      entityId: dept.id,
      description: `Created department ${dept.name}`,
    },
  });

  return NextResponse.json(dept, { status: 201 });
}
