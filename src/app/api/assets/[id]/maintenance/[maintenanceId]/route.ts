import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDTO } from "../../../route";
import {
  toMaintenanceDTO,
  parseMaintenanceMeta,
  MAINTENANCE_CONSTANTS,
  type MaintenanceMeta,
  type MaintenanceStatus,
} from "../route";

const { VALID_STATUSES } = MAINTENANCE_CONSTANTS;

// GET handler at the parent path handles list+create.
// This file only needs PATCH + DELETE per the task spec.

// PATCH /api/assets/[id]/maintenance/[maintenanceId]
//   body: { status?, notes?, endDate?, cost? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; maintenanceId: string }> }
) {
  const { id, maintenanceId } = await params;
  const body = await req.json();

  // Confirm asset exists.
  const asset = await db.activity.findUnique({ where: { id } });
  if (!asset || asset.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Fetch the maintenance record.
  const existing = await db.activity.findUnique({
    where: { id: maintenanceId },
  });
  if (
    !existing ||
    existing.type !== "ASSET_MAINTENANCE" ||
    existing.title !== id
  ) {
    return NextResponse.json(
      { error: "Maintenance record not found for this asset" },
      { status: 404 }
    );
  }

  const meta = parseMaintenanceMeta(existing.description) ?? ({
    assetId: id,
    assetName: toDTO(asset)?.name ?? asset.title,
    type: "MAINTENANCE",
    description: "",
    cost: 0,
    vendor: null,
    startDate: new Date().toISOString(),
    endDate: null,
    status: "SCHEDULED",
    notes: null,
  } as MaintenanceMeta);

  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as MaintenanceStatus;
    if (!VALID_STATUSES.includes(s)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    meta.status = s;
    // Auto-set endDate when transitioning to COMPLETED (if not explicitly provided).
    if (s === "COMPLETED" && !body.endDate && !meta.endDate) {
      meta.endDate = new Date().toISOString();
    }
    // Clear endDate if cancelled and previously set.
    if (s === "CANCELLED" && body.endDate === undefined) {
      // keep endDate as-is; user may still want a record of when it was cancelled.
    }
  }

  if (body.notes !== undefined) {
    meta.notes =
      body.notes === null || body.notes === ""
        ? null
        : String(body.notes);
  }

  if (body.endDate !== undefined) {
    meta.endDate = body.endDate ? new Date(body.endDate).toISOString() : null;
  }

  if (body.cost !== undefined) {
    const raw = body.cost;
    meta.cost =
      typeof raw === "number" && isFinite(raw)
        ? Math.max(0, raw)
        : typeof raw === "string" && raw.trim() !== "" && !isNaN(Number(raw))
          ? Math.max(0, Number(raw))
          : 0;
  }

  const updated = await db.activity.update({
    where: { id: maintenanceId },
    data: { description: JSON.stringify(meta) },
  });

  await db.auditLog.create({
    data: {
      action: "ASSET_MAINTENANCE_UPDATE",
      entityType: "Asset",
      entityId: id,
      description: `Updated maintenance record for asset "${asset.title}" (status: ${meta.status}).`,
    },
  });

  const dto = toMaintenanceDTO(updated);
  return NextResponse.json(dto);
}

// DELETE /api/assets/[id]/maintenance/[maintenanceId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; maintenanceId: string }> }
) {
  const { id, maintenanceId } = await params;

  const asset = await db.activity.findUnique({ where: { id } });
  if (!asset || asset.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const existing = await db.activity.findUnique({
    where: { id: maintenanceId },
  });
  if (
    !existing ||
    existing.type !== "ASSET_MAINTENANCE" ||
    existing.title !== id
  ) {
    return NextResponse.json(
      { error: "Maintenance record not found for this asset" },
      { status: 404 }
    );
  }

  await db.activity.delete({ where: { id: maintenanceId } });

  await db.auditLog.create({
    data: {
      action: "ASSET_MAINTENANCE_DELETE",
      entityType: "Asset",
      entityId: id,
      description: `Deleted a maintenance record for asset "${asset.title}".`,
    },
  });

  return NextResponse.json({ ok: true });
}
