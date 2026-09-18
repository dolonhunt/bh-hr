import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH  /api/holidays/[id]
// DELETE /api/holidays/[id]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.holiday.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    const VALID_TYPES = ["PUBLIC", "OPTIONAL", "COMPANY"];

    const holiday = await db.holiday.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        date: body.date ? new Date(body.date) : existing.date,
        type:
          body.type !== undefined && VALID_TYPES.includes(body.type)
            ? body.type
            : existing.type,
        description:
          body.description !== undefined ? body.description : existing.description,
      },
    });

    return NextResponse.json(holiday);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update holiday" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.holiday.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }
}
