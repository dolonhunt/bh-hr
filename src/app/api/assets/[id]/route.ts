import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toDTO,
  ASSET_CONSTANTS,
  type AssetMeta,
  type AssetType,
  type AssetCondition,
  type AssetStatus,
} from "../route";

const { VALID_TYPES, VALID_CONDITIONS, VALID_STATUSES } = ASSET_CONSTANTS;

function parseMeta(description: string | null): AssetMeta {
  const fallback: AssetMeta = {
    name: "",
    type: "OTHER",
    serialNumber: "",
    condition: "GOOD",
    status: "AVAILABLE",
    notes: null,
    purchaseValue: 1000,
    assignedToId: null,
    assignedToName: null,
    assignedDate: null,
    returnDate: null,
    expectedReturnDate: null,
  };
  if (!description) return fallback;
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
    return { ...fallback };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity || activity.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const dto = toDTO(activity);
  if (!dto) {
    return NextResponse.json(
      { error: "Asset metadata is corrupt" },
      { status: 500 }
    );
  }
  return NextResponse.json(dto);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const meta = parseMeta(existing.description);

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    meta.name = n;
  }
  if (body.type !== undefined) {
    const t = String(body.type).toUpperCase() as AssetType;
    if (!VALID_TYPES.includes(t)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.type = t;
  }
  if (body.serialNumber !== undefined) {
    meta.serialNumber = String(body.serialNumber ?? "").trim();
  }
  if (body.condition !== undefined) {
    const c = String(body.condition).toUpperCase() as AssetCondition;
    if (!VALID_CONDITIONS.includes(c)) {
      return NextResponse.json(
        {
          error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }
    meta.condition = c;
  }
  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as AssetStatus;
    if (!VALID_STATUSES.includes(s)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    meta.status = s;
  }
  if (body.notes !== undefined) {
    meta.notes =
      body.notes === null || body.notes === ""
        ? null
        : String(body.notes);
  }
  if (body.purchaseValue !== undefined) {
    const raw = body.purchaseValue;
    const pv =
      typeof raw === "number" && isFinite(raw) && raw >= 0
        ? raw
        : typeof raw === "string" && raw.trim() !== "" && !isNaN(Number(raw))
          ? Number(raw)
          : 1000;
    meta.purchaseValue = pv;
  }

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: meta.name,
      description: JSON.stringify(meta),
      employeeId: meta.assignedToId,
    },
  });

  await db.auditLog.create({
    data: {
      action: "ASSET_UPDATE",
      entityType: "Asset",
      entityId: id,
      description: `Updated asset "${meta.name}".`,
    },
  });

  const dto = toDTO(updated);
  return NextResponse.json(dto);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const meta = parseMeta(existing.description);

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "ASSET_DELETE",
      entityType: "Asset",
      entityId: id,
      description: `Deleted asset "${meta.name || existing.title}".`,
    },
  });

  return NextResponse.json({ ok: true });
}
