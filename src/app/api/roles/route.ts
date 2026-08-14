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
    db.role.count({ where }),
    db.role.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const role = await db.role.create({
    data: {
      name: body.name,
      description: body.description || null,
      status: body.status || "ACTIVE",
    },
  });

  await db.auditLog.create({
    data: {
      action: "ROLE_CREATE",
      entityType: "Role",
      entityId: role.id,
      description: `Created role ${role.name}`,
    },
  });

  return NextResponse.json(role, { status: 201 });
}
