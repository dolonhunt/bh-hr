import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Announcements / Notice Board
// GET  /api/announcements?includeExpired=true&departmentId=&priority=&search=
// POST /api/announcements
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeExpired = searchParams.get("includeExpired") === "true";
  const departmentId = searchParams.get("departmentId") || "";
  const priority = searchParams.get("priority") || "";
  const search = searchParams.get("search") || "";

  const where: any = {};
  const orClauses: any[] = [];
  if (!includeExpired) {
    orClauses.push({ expiresAt: null }, { expiresAt: { gte: new Date() } });
  }
  if (search) {
    orClauses.push({ title: { contains: search } }, { body: { contains: search } });
  }
  if (orClauses.length > 0) where.OR = orClauses;
  if (departmentId) where.departmentId = departmentId;
  if (priority) where.priority = priority;

  const [total, items] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      include: { department: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json(
        { error: "Title and body are required." },
        { status: 400 }
      );
    }

    const VALID_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
    const priority = VALID_PRIORITIES.includes(body.priority)
      ? body.priority
      : "NORMAL";

    const announcement = await db.announcement.create({
      data: {
        title: String(body.title).trim(),
        body: String(body.body).trim(),
        priority,
        audience: body.departmentId ? "DEPARTMENT" : "ALL",
        departmentId: body.departmentId || null,
        pinned: Boolean(body.pinned),
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    // Audit log
    const user = await db.user.findFirst({ where: { role: "HR_ADMIN" } });
    if (user) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "Announcement",
          entityId: announcement.id,
          description: `Published announcement "${announcement.title}" (priority: ${priority})`,
          ipAddress: "system",
        },
      });
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create announcement" },
      { status: 500 }
    );
  }
}
