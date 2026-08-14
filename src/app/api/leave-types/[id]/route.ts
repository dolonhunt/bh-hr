import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.leaveType.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      defaultDays: body.defaultDays !== undefined ? Number(body.defaultDays) : undefined,
      paid: body.paid,
      color: body.color,
      status: body.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leaveType = await db.leaveType.findUnique({ where: { id } });
  if (!leaveType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Archive instead of hard delete to preserve leave request history
  const updated = await db.leaveType.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ ok: true, archived: updated });
}
