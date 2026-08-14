import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toDTO,
  ASSET_CONSTANTS,
  type AssetMeta,
  type AssetCondition,
} from "../../route";

const { VALID_CONDITIONS } = ASSET_CONSTANTS;

function parseMeta(description: string | null): AssetMeta {
  const fallback: AssetMeta = {
    name: "",
    type: "OTHER",
    serialNumber: "",
    condition: "GOOD",
    status: "AVAILABLE",
    notes: null,
    assignedToId: null,
    assignedToName: null,
    assignedDate: null,
    returnDate: null,
    expectedReturnDate: null,
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      name: String(parsed.name ?? ""),
      type: (parsed.type as AssetMeta["type"]) ?? "OTHER",
      serialNumber: String(parsed.serialNumber ?? ""),
      condition: (parsed.condition as AssetCondition) ?? "GOOD",
      status: (parsed.status as AssetMeta["status"]) ?? "AVAILABLE",
      notes: parsed.notes ?? null,
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

export async function POST(
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

  if (meta.status !== "ASSIGNED" && !meta.assignedToId) {
    return NextResponse.json(
      { error: "Asset is not currently assigned" },
      { status: 400 }
    );
  }

  // Optional new condition on return
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

  // Append notes (do not overwrite existing notes)
  const returnNote =
    body.notes === null || body.notes === ""
      ? null
      : String(body.notes);

  if (returnNote) {
    const existingNotes = meta.notes ?? "";
    meta.notes = existingNotes
      ? `${existingNotes}\n[Return] ${returnNote}`
      : `[Return] ${returnNote}`;
  }

  const returnDate = new Date().toISOString();
  const returnedByEmployeeId = meta.assignedToId;
  const returnedByEmployeeName = meta.assignedToName;

  meta.assignedToId = null;
  meta.assignedToName = null;
  meta.assignedDate = null;
  meta.expectedReturnDate = null;
  meta.returnDate = returnDate;
  meta.status = "AVAILABLE";

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: meta.name,
      description: JSON.stringify(meta),
      employeeId: null,
    },
  });

  await db.auditLog.create({
    data: {
      action: "ASSET_RETURN",
      entityType: "Asset",
      entityId: id,
      description: `Returned asset "${meta.name}" (condition: ${meta.condition})${
        returnedByEmployeeName ? ` from ${returnedByEmployeeName}` : ""
      }.`,
    },
  });

  // Activity log of type ASSET_RETURNED (per spec)
  await db.activity.create({
    data: {
      type: "ASSET_RETURNED",
      employeeId: returnedByEmployeeId ?? null,
      title: `Asset returned: ${meta.name}`,
      description: JSON.stringify({
        assetId: id,
        assetName: meta.name,
        assetType: meta.type,
        serialNumber: meta.serialNumber,
        employeeId: returnedByEmployeeId,
        employeeName: returnedByEmployeeName,
        returnDate,
        condition: meta.condition,
        notes: returnNote,
      }),
    },
  });

  const dto = toDTO(updated);
  return NextResponse.json(dto, { status: 201 });
}
