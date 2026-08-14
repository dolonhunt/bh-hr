import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Dashboard widget layout — per-user customization stored in the
// Setting table under key `dashboard_layout`. Value is a JSON
// string:
//
//   { widgets: [{ id: "kpi_employees", visible: true, order: 0 }, ...] }
//
// The canonical widget catalog lives below so we can rehydrate
// missing entries when new widgets ship.
// ============================================================

export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
}

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: "hero_banner", visible: true, order: 0 },
  { id: "kpi_row", visible: true, order: 1 },
  { id: "attendance_chart", visible: true, order: 2 },
  { id: "dept_distribution", visible: true, order: 3 },
  { id: "quick_actions", visible: true, order: 4 },
  { id: "recent_employees", visible: true, order: 5 },
  { id: "pending_leave", visible: true, order: 6 },
  { id: "recent_documents", visible: true, order: 7 },
];

export const WIDGET_IDS = DEFAULT_WIDGETS.map((w) => w.id);

// Reconcile stored layout with the canonical catalog — preserves
// user's visibility/order for known widgets, fills in defaults for
// any missing widget, drops any unknown widget id.
function reconcile(stored: DashboardWidgetConfig[] | undefined | null): DashboardWidgetConfig[] {
  if (!Array.isArray(stored)) return DEFAULT_WIDGETS.map((w) => ({ ...w }));
  const storedMap = new Map<string, DashboardWidgetConfig>();
  for (const w of stored) {
    if (typeof w?.id === "string") storedMap.set(w.id, w);
  }
  return DEFAULT_WIDGETS.map((dflt, idx) => {
    const s = storedMap.get(dflt.id);
    if (!s) return { ...dflt, order: idx };
    return {
      id: dflt.id,
      visible: typeof s.visible === "boolean" ? s.visible : dflt.visible,
      order: typeof s.order === "number" ? s.order : idx,
    };
  });
}

export async function GET() {
  const row = await db.setting.findUnique({
    where: { key: "dashboard_layout" },
  });
  let stored: DashboardWidgetConfig[] | null = null;
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      stored = Array.isArray(parsed?.widgets) ? parsed.widgets : null;
    } catch {
      stored = null;
    }
  }
  const widgets = reconcile(stored);
  return NextResponse.json({ widgets });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body?.widgets) ? body.widgets : null;
  if (!incoming) {
    return NextResponse.json(
      { error: "Body must be { widgets: [...] }" },
      { status: 400 }
    );
  }

  // Reconcile + re-number orders to ensure a clean 0..N sequence
  // preserving the user's chosen relative order.
  const reconciled = reconcile(incoming);
  reconciled.sort((a, b) => a.order - b.order);
  reconciled.forEach((w, idx) => (w.order = idx));

  const layout: DashboardLayout = { widgets: reconciled };
  await db.setting.upsert({
    where: { key: "dashboard_layout" },
    create: { key: "dashboard_layout", value: JSON.stringify(layout) },
    update: { value: JSON.stringify(layout) },
  });

  await db.auditLog.create({
    data: {
      action: "DASHBOARD_LAYOUT_UPDATE",
      entityType: "Setting",
      description: `Updated dashboard layout: ${
        reconciled.filter((w) => w.visible).length
      } of ${reconciled.length} widgets visible`,
    },
  });

  return NextResponse.json(layout);
}
