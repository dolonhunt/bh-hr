import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const departmentId = searchParams.get("departmentId") || "";

  const where: any = {};
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
  }

  const [total, items] = await Promise.all([
    db.designation.count({ where }),
    db.designation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const designation = await db.designation.create({
    data: {
      name: body.name,
      description: body.description || null,
      departmentId: body.departmentId || null,
      status: body.status || "ACTIVE",
    },
  });

  await db.auditLog.create({
    data: {
      action: "DESIGNATION_CREATE",
      entityType: "Designation",
      entityId: designation.id,
      description: `Created designation ${designation.name}`,
    },
  });

  return NextResponse.json(designation, { status: 201 });
}
