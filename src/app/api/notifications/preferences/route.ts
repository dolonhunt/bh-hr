import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ALL_NOTIFICATION_TYPES,
  getNotificationPreferences,
  type NotificationType,
} from "@/lib/notifications";

// GET /api/notifications/preferences
// Returns `{ types: { LEAVE_PENDING: true, BIRTHDAY_UPCOMING: false, ... } }`
export async function GET() {
  const prefs = await getNotificationPreferences();
  return NextResponse.json({ types: prefs });
}

// PATCH /api/notifications/preferences
// Body: { types: { LEAVE_PENDING: true, BIRTHDAY_UPCOMING: false, ... } }
// Any missing types default to true (already handled by reader).
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const incoming = body?.types;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json(
      { error: "Body must be { types: { ... } }" },
      { status: 400 }
    );
  }

  const current = await getNotificationPreferences();
  const next: Record<NotificationType, boolean> = { ...current };

  for (const t of ALL_NOTIFICATION_TYPES) {
    if (incoming[t] !== undefined) {
      next[t] = Boolean(incoming[t]);
    }
  }

  await db.setting.upsert({
    where: { key: "notification_preferences" },
    create: { key: "notification_preferences", value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });

  await db.auditLog.create({
    data: {
      action: "NOTIFICATION_PREFERENCES_UPDATE",
      entityType: "Setting",
      description: `Updated notification preferences: ${
        Object.entries(next)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ") || "none enabled"
      }`,
    },
  });

  return NextResponse.json({ types: next });
}
