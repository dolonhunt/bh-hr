import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDTO, type AssetMeta } from "../../route";

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
      condition: (parsed.condition as AssetMeta["condition"]) ?? "GOOD",
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

  const employeeId = (body.employeeId ?? "").toString().trim();
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      photo: true,
    },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "ASSET") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const meta = parseMeta(existing.description);
  if (meta.status === "ASSIGNED" && meta.assignedToId === employeeId) {
    return NextResponse.json(
      { error: "Asset is already assigned to this employee" },
      { status: 400 }
    );
  }
  if (meta.status === "RETIRED") {
    return NextResponse.json(
      { error: "Cannot assign a retired asset" },
      { status: 400 }
    );
  }

  const assignedDate = body.assignedDate
    ? new Date(body.assignedDate).toISOString()
    : new Date().toISOString();

  const expectedReturnDate = body.expectedReturnDate
    ? new Date(body.expectedReturnDate).toISOString()
    : null;

  meta.assignedToId = employee.id;
  meta.assignedToName = employee.fullName;
  meta.assignedDate = assignedDate;
  meta.expectedReturnDate = expectedReturnDate;
  meta.returnDate = null;
  meta.status = "ASSIGNED";

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: meta.name,
      description: JSON.stringify(meta),
      employeeId: employee.id,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      action: "ASSET_ASSIGN",
      entityType: "Asset",
      entityId: id,
      description: `Assigned asset "${meta.name}" to ${employee.fullName} (${employee.employeeId}).`,
    },
  });

  // Activity log of type ASSET_ASSIGNED (per spec)
  await db.activity.create({
    data: {
      type: "ASSET_ASSIGNED",
      employeeId: employee.id,
      title: `Asset assigned: ${meta.name}`,
      description: JSON.stringify({
        assetId: id,
        assetName: meta.name,
        assetType: meta.type,
        serialNumber: meta.serialNumber,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeCode: employee.employeeId,
        assignedDate,
        expectedReturnDate,
      }),
    },
  });

  const dto = toDTO(updated);
  return NextResponse.json(dto, { status: 201 });
}
