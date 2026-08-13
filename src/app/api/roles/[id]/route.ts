import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.role.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      status: body.status,
    },
  });

  await db.auditLog.create({
    data: {
      action: "ROLE_UPDATE",
      entityType: "Role",
      entityId: id,
      description: `Updated role ${updated.name}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const role = await db.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await db.role.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await db.auditLog.create({
    data: {
      action: "ROLE_ARCHIVE",
      entityType: "Role",
      entityId: id,
      description: `Archived role ${role.name}`,
    },
  });

  return NextResponse.json({ ok: true, archived: updated });
}
