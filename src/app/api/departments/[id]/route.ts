import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.department.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
      headId: body.headId,
      status: body.status,
    },
  });

  await db.auditLog.create({
    data: {
      action: "DEPARTMENT_UPDATE",
      entityType: "Department",
      entityId: id,
      description: `Updated department ${updated.name}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Archive instead of hard delete to preserve employee references
  const dept = await db.department.findUnique({ where: { id } });
  if (!dept) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await db.department.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await db.auditLog.create({
    data: {
      action: "DEPARTMENT_ARCHIVE",
      entityType: "Department",
      entityId: id,
      description: `Archived department ${dept.name}`,
    },
  });

  return NextResponse.json({ ok: true, archived: updated });
}
