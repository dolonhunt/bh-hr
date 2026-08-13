import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.designation.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      departmentId: body.departmentId,
      status: body.status,
    },
  });

  await db.auditLog.create({
    data: {
      action: "DESIGNATION_UPDATE",
      entityType: "Designation",
      entityId: id,
      description: `Updated designation ${updated.name}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const designation = await db.designation.findUnique({ where: { id } });
  if (!designation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await db.designation.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await db.auditLog.create({
    data: {
      action: "DESIGNATION_ARCHIVE",
      entityType: "Designation",
      entityId: id,
      description: `Archived designation ${designation.name}`,
    },
  });

  return NextResponse.json({ ok: true, archived: updated });
}
