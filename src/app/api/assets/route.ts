import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Assets are stored in the Activity model (no schema change needed):
//   type        = "ASSET"
//   title       = asset name
//   description = JSON string {
//                   name,
//                   type,             // LAPTOP | MONITOR | PHONE | TABLET | KEYBOARD | MOUSE | HEADSET | DESK | CHAIR | PRINTER | CAMERA | OTHER
//                   serialNumber,
//                   condition,        // NEW | GOOD | FAIR | DAMAGED
//                   status,           // AVAILABLE | ASSIGNED | RETURNED | RETIRED
//                   notes,
//                   assignedToId,     // string | null
//                   assignedToName,   // string | null  (denormalised for fast display)
//                   assignedDate,     // ISO | null
//                   returnDate,       // ISO | null
//                   expectedReturnDate // ISO | null
//                 }
//   employeeId  = the assigned employee (or null if available)
//   createdAt   = when the asset record was created
// ============================================================

export type AssetType =
  | "LAPTOP"
  | "MONITOR"
  | "PHONE"
  | "TABLET"
  | "KEYBOARD"
  | "MOUSE"
  | "HEADSET"
  | "DESK"
  | "CHAIR"
  | "PRINTER"
  | "CAMERA"
  | "OTHER";

export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "DAMAGED";
export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "RETURNED"
  | "RETIRED";

export interface AssetDTO {
  id: string;
  name: string;
  type: AssetType;
  serialNumber: string;
  condition: AssetCondition;
  purchaseValue: number;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDate: string | null;
  returnDate: string | null;
  expectedReturnDate: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
}

interface AssetMeta {
  name: string;
  type: AssetType;
  serialNumber: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
  purchaseValue: number;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDate: string | null;
  returnDate: string | null;
  expectedReturnDate: string | null;
}

export type { AssetMeta };

const VALID_TYPES: AssetType[] = [
  "LAPTOP",
  "MONITOR",
  "PHONE",
  "TABLET",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
  "DESK",
  "CHAIR",
  "PRINTER",
  "CAMERA",
  "OTHER",
];

const VALID_CONDITIONS: AssetCondition[] = ["NEW", "GOOD", "FAIR", "DAMAGED"];
const VALID_STATUSES: AssetStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "RETURNED",
  "RETIRED",
];

function parseMeta(description: string | null): AssetMeta | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    const pv =
      typeof parsed.purchaseValue === "number" &&
      isFinite(parsed.purchaseValue) &&
      parsed.purchaseValue >= 0
        ? parsed.purchaseValue
        : typeof parsed.purchaseValue === "string" &&
            parsed.purchaseValue.trim() !== "" &&
            !isNaN(Number(parsed.purchaseValue))
          ? Number(parsed.purchaseValue)
          : 1000;
    return {
      name: String(parsed.name ?? ""),
      type: (parsed.type as AssetType) ?? "OTHER",
      serialNumber: String(parsed.serialNumber ?? ""),
      condition: (parsed.condition as AssetCondition) ?? "GOOD",
      status: (parsed.status as AssetStatus) ?? "AVAILABLE",
      notes: parsed.notes ?? null,
      purchaseValue: pv,
      assignedToId: parsed.assignedToId ?? null,
      assignedToName: parsed.assignedToName ?? null,
      assignedDate: parsed.assignedDate ?? null,
      returnDate: parsed.returnDate ?? null,
      expectedReturnDate: parsed.expectedReturnDate ?? null,
    };
  } catch {
    return null;
  }
}

export function toDTO(a: any): AssetDTO | null {
  const m = parseMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    name: m.name || a.title,
    type: m.type,
    serialNumber: m.serialNumber,
    condition: m.condition,
    purchaseValue: m.purchaseValue,
    assignedToId: m.assignedToId ?? a.employeeId ?? null,
    assignedToName: m.assignedToName ?? null,
    assignedDate: m.assignedDate ?? null,
    returnDate: m.returnDate ?? null,
    expectedReturnDate: m.expectedReturnDate ?? null,
    status: m.status,
    notes: m.notes,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

export const ASSET_CONSTANTS = {
  VALID_TYPES,
  VALID_CONDITIONS,
  VALID_STATUSES,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const status = (searchParams.get("status") || "").toUpperCase();
  const type = (searchParams.get("type") || "").toUpperCase();
  const search = (searchParams.get("search") || "").toLowerCase();

  const where: any = { type: "ASSET" };
  if (employeeId) where.employeeId = employeeId;

  const activities = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  let assets = activities
    .map(toDTO)
    .filter((a): a is AssetDTO => a !== null);

  if (status) assets = assets.filter((a) => a.status === status);
  if (type) assets = assets.filter((a) => a.type === type);
  if (search) {
    assets = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        a.serialNumber.toLowerCase().includes(search) ||
        (a.assignedToName ?? "").toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ items: assets, total: assets.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = (body.name ?? "").toString().trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const type = String(body.type ?? "OTHER").toUpperCase() as AssetType;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const condition = String(
    body.condition ?? "GOOD"
  ).toUpperCase() as AssetCondition;
  if (!VALID_CONDITIONS.includes(condition)) {
    return NextResponse.json(
      {
        error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const status: AssetStatus = VALID_STATUSES.includes(
    String(body.status ?? "").toUpperCase() as AssetStatus
  )
    ? (String(body.status).toUpperCase() as AssetStatus)
    : "AVAILABLE";

  const serialNumber = String(body.serialNumber ?? "").trim();
  const notes =
    body.notes === null || body.notes === ""
      ? null
      : String(body.notes ?? null);

  const rawPv = body.purchaseValue;
  const purchaseValue =
    typeof rawPv === "number" && isFinite(rawPv) && rawPv >= 0
      ? rawPv
      : typeof rawPv === "string" && rawPv.trim() !== "" && !isNaN(Number(rawPv))
        ? Number(rawPv)
        : 1000;

  const meta: AssetMeta = {
    name,
    type,
    serialNumber,
    condition,
    status,
    notes,
    purchaseValue,
    assignedToId: null,
    assignedToName: null,
    assignedDate: null,
    returnDate: null,
    expectedReturnDate: null,
  };

  const activity = await db.activity.create({
    data: {
      type: "ASSET",
      title: name,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "ASSET_CREATE",
      entityType: "Asset",
      entityId: activity.id,
      description: `Created asset "${name}" (${type}, serial: ${serialNumber || "—"}).`,
    },
  });

  const dto = toDTO(activity);
  return NextResponse.json(dto, { status: 201 });
}
