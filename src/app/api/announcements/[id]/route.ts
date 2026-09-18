import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET    /api/announcements/[id]
// PATCH  /api/announcements/[id]
// DELETE /api/announcements/[id]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const announcement = await db.announcement.findUnique({
    where: { id },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }
  return NextResponse.json(announcement);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const VALID_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : existing.title,
        body: body.body !== undefined ? String(body.body).trim() : existing.body,
        priority:
          body.priority !== undefined && VALID_PRIORITIES.includes(body.priority)
            ? body.priority
            : existing.priority,
        departmentId:
          body.departmentId !== undefined
            ? body.departmentId || null
            : existing.departmentId,
        audience:
          body.departmentId !== undefined
            ? body.departmentId
              ? "DEPARTMENT"
              : "ALL"
            : existing.audience,
        pinned: body.pinned !== undefined ? Boolean(body.pinned) : existing.pinned,
        expiresAt:
          body.expiresAt !== undefined
            ? body.expiresAt
              ? new Date(body.expiresAt)
              : null
            : existing.expiresAt,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    return NextResponse.json(announcement);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update announcement" },
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
    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }
}
