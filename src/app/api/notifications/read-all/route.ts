import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateNotifications } from "@/lib/notifications";

// POST /api/notifications/read-all
// Marks ALL currently-generated notifications as read.
// We re-compute the live notification list, then upsert a Setting
// row for each id. Already-read rows are no-ops.
export async function POST() {
  const items = await generateNotifications();
  const now = new Date().toISOString();

  if (items.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 });
  }

  // SQLite is fast enough that we can do these in parallel within a tx.
  await db.$transaction(
    items.map((n) =>
      db.setting.upsert({
        where: { key: `notification_read_${n.id}` },
        create: { key: `notification_read_${n.id}`, value: now },
        update: { value: now },
      })
    )
  );

  return NextResponse.json({ ok: true, marked: items.length });
}
