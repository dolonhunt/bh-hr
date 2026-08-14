import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/notifications/[id]/read
// Marks a single notification as read by storing a Setting row with
// key `notification_read_{id}` and value = ISO timestamp.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Notification id is required" },
      { status: 400 }
    );
  }
  const key = `notification_read_${id}`;
  // The Setting table has @unique on key — upsert avoids the
  // race-condition where two clients mark read simultaneously.
  await db.setting.upsert({
    where: { key },
    create: { key, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
  return NextResponse.json({ ok: true, id, read: true });
}
