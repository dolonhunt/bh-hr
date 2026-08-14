import { NextRequest, NextResponse } from "next/server";
import {
  generateNotifications,
  type NotificationType,
} from "@/lib/notifications";

// ============================================================
// GET /api/notifications
//
// Notifications are generated DYNAMICALLY from the current data
// state — they are NOT stored as their own table. See
// `/src/lib/notifications.ts` for the generation logic.
//
// Read state is stored in the Setting table as one row per read
// notification id:
//   key = `notification_read_{id}`
//   value = ISO timestamp when marked read
//
// Notification preferences (which types are enabled) are stored
// under Setting key `notification_preferences` as JSON.
//
// Query params:
//   ?type=LEAVE_PENDING      filter by notification type
//   ?unreadOnly=true         only return unread notifications
//   ?page=1                  pagination (50 per page)
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type")?.toUpperCase() as NotificationType | "";
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = 50;

  let items = await generateNotifications();

  if (type) {
    items = items.filter((n) => n.type === type);
  }
  if (unreadOnly) {
    items = items.filter((n) => !n.read);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const unreadCount = items.filter((n) => !n.read).length;

  return NextResponse.json({
    items: pageItems,
    total,
    page,
    pageSize,
    unreadCount,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
