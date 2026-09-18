import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Company Holidays / Work Calendar
// GET  /api/holidays?year=2026&upcoming=true&limit=5
// POST /api/holidays
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const upcoming = searchParams.get("upcoming") === "true";
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

  const where: any = {};
  if (upcoming) {
    where.date = { gte: new Date() };
  } else if (year) {
    const y = Number(year);
    if (!Number.isNaN(y)) {
      where.date = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
      };
    }
  }

  const items = await db.holiday.findMany({
    where,
    orderBy: { date: upcoming ? "asc" : "asc" },
    take: limit,
  });

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name?.trim() || !body.date) {
      return NextResponse.json(
        { error: "Name and date are required." },
        { status: 400 }
      );
    }

    const VALID_TYPES = ["PUBLIC", "OPTIONAL", "COMPANY"];
    const type = VALID_TYPES.includes(body.type) ? body.type : "PUBLIC";

    const holiday = await db.holiday.create({
      data: {
        name: String(body.name).trim(),
        date: new Date(body.date),
        type,
        description: body.description || null,
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A holiday with this name already exists on that date." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create holiday" },
      { status: 500 }
    );
  }
}
