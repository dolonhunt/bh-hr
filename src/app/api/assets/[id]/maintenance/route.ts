import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDTO } from "../../route";

// ============================================================
// Asset Maintenance / Repair Tracking
//
// Maintenance records are stored in the Activity model:
//
//   type        = "ASSET_MAINTENANCE"
//   title       = <assetActivityId>   ← stored for efficient querying
//   description = JSON {
//                   assetId,          // redundant copy of asset activity ID
//                   assetName,        // denormalised for display
//                   type,             // REPAIR | MAINTENANCE | UPGRADE | INSPECTION | REPLACEMENT
//                   description,      // free-text work description
//                   cost,             // number
//                   vendor,           // string | null
//                   startDate,        // ISO
//                   endDate,          // ISO | null
//                   status,           // SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
//                   notes             // string | null
//                 }
//   employeeId  = null   (FK constraints prevent storing asset IDs here)
//
// We use the `title` field as the indexed join key back to the asset.
// ============================================================

export type MaintenanceType =
  | "REPAIR"
  | "MAINTENANCE"
  | "UPGRADE"
  | "INSPECTION"
  | "REPLACEMENT";

export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface MaintenanceMeta {
  assetId: string;
  assetName: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  vendor: string | null;
  startDate: string;
  endDate: string | null;
  status: MaintenanceStatus;
  notes: string | null;
}

export interface MaintenanceDTO {
  id: string;
  assetId: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  vendor: string | null;
  startDate: string;
  endDate: string | null;
  status: MaintenanceStatus;
  notes: string | null;
  createdAt: string;
}

const VALID_TYPES: MaintenanceType[] = [
  "REPAIR",
  "MAINTENANCE",
  "UPGRADE",
  "INSPECTION",
  "REPLACEMENT",
];

const VALID_STATUSES: MaintenanceStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const MAINTENANCE_CONSTANTS = {
  VALID_TYPES,
  VALID_STATUSES,
};

export function parseMaintenanceMeta(
  description: string | null
): MaintenanceMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    const status = (p.status as MaintenanceStatus) ?? "SCHEDULED";
    return {
      assetId: String(p.assetId ?? ""),
      assetName: String(p.assetName ?? ""),
      type: (p.type as MaintenanceType) ?? "MAINTENANCE",
      description: String(p.description ?? ""),
      cost:
        typeof p.cost === "number" && isFinite(p.cost)
          ? p.cost
          : Number(p.cost ?? 0) || 0,
      vendor: p.vendor ?? null,
      startDate: p.startDate ?? new Date().toISOString(),
      endDate: p.endDate ?? null,
      status: VALID_STATUSES.includes(status) ? status : "SCHEDULED",
      notes: p.notes ?? null,
    };
  } catch {
    return null;
  }
}

export function toMaintenanceDTO(a: any): MaintenanceDTO | null {
  const m = parseMaintenanceMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    assetId: m.assetId || a.title,
    type: m.type,
    description: m.description,
    cost: m.cost,
    vendor: m.vendor,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.status,
    notes: m.notes,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

// GET /api/assets/[id]/maintenance  → list maintenance records for an asset
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Confirm asset exists.
  const asset = await db.activity.findUnique({ where: { id } });
  if (!asset || asset.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const records = await db.activity.findMany({
    where: { type: "ASSET_MAINTENANCE", title: id },
    orderBy: { createdAt: "desc" },
  });

  const items = records
    .map(toMaintenanceDTO)
    .filter((x): x is MaintenanceDTO => x !== null);

  // Summary block for KPI cards.
  const totalCost = items
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const activeCount = items.filter(
    (r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS"
  ).length;
  const completedCount = items.filter((r) => r.status === "COMPLETED").length;
  const cancelledCount = items.filter(
    (r) => r.status === "CANCELLED"
  ).length;

  return NextResponse.json({
    items,
    total: items.length,
    summary: {
      totalCost,
      activeCount,
      completedCount,
      cancelledCount,
    },
  });
}

// POST /api/assets/[id]/maintenance  → create a maintenance record
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Validate asset exists.
  const asset = await db.activity.findUnique({ where: { id } });
  if (!asset || asset.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const assetDTO = toDTO(asset);
  const assetName = assetDTO?.name ?? asset.title;

  // Validate type
  const type = String(body.type ?? "MAINTENANCE").toUpperCase() as MaintenanceType;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const description = String(body.description ?? "").trim();
  if (!description) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const rawCost = body.cost;
  const cost =
    typeof rawCost === "number" && isFinite(rawCost)
      ? Math.max(0, rawCost)
      : typeof rawCost === "string" &&
          rawCost.trim() !== "" &&
          !isNaN(Number(rawCost))
        ? Math.max(0, Number(rawCost))
        : 0;

  const vendor =
    body.vendor === null || body.vendor === ""
      ? null
      : String(body.vendor ?? null);

  if (!body.startDate) {
    return NextResponse.json(
      { error: "startDate is required" },
      { status: 400 }
    );
  }
  const startDate = new Date(body.startDate).toISOString();

  const endDate = body.endDate
    ? new Date(body.endDate).toISOString()
    : null;

  const notes =
    body.notes === null || body.notes === ""
      ? null
      : String(body.notes ?? null);

  const status: MaintenanceStatus = "SCHEDULED";

  const meta: MaintenanceMeta = {
    assetId: id,
    assetName,
    type,
    description,
    cost,
    vendor,
    startDate,
    endDate,
    status,
    notes,
  };

  const activity = await db.activity.create({
    data: {
      type: "ASSET_MAINTENANCE",
      title: id, // asset's activity ID, used as join key
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "ASSET_MAINTENANCE_CREATE",
      entityType: "Asset",
      entityId: id,
      description: `Logged ${type.toLowerCase()} for asset "${assetName}" (${formatCurrencySafe(
        cost
      )})${vendor ? ` via vendor "${vendor}"` : ""}.`,
    },
  });

  const dto = toMaintenanceDTO(activity);
  return NextResponse.json(dto, { status: 201 });
}

function formatCurrencySafe(n: number): string {
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)}`;
}
