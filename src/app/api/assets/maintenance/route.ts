import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toMaintenanceDTO,
  type MaintenanceStatus,
  type MaintenanceType,
} from "../[id]/maintenance/route";

// ============================================================
// Global maintenance summary endpoint.
//
// GET /api/assets/maintenance  → returns all maintenance records
// across every asset, plus a portfolio-level summary block used by
// the Maintenance KPI card on the main Assets page.
//
// This endpoint is the global companion to the per-asset
// /api/assets/[id]/maintenance route. It exists so the Assets
// page can show portfolio KPIs without N+1 queries.
// ============================================================

export async function GET() {
  const records = await db.activity.findMany({
    where: { type: "ASSET_MAINTENANCE" },
    orderBy: { createdAt: "desc" },
  });

  const items = records
    .map(toMaintenanceDTO)
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const totalCost = items
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const activeCount = items.filter(
    (r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS"
  ).length;
  const completedCount = items.filter(
    (r) => r.status === "COMPLETED"
  ).length;
  const cancelledCount = items.filter(
    (r) => r.status === "CANCELLED"
  ).length;

  // Distinct asset IDs that have any maintenance records.
  const assetIdsWithMaintenance = Array.from(
    new Set(items.map((r) => r.assetId))
  );

  // Compute "Assets Needing Maintenance": distinct assets in DAMAGED condition.
  const damagedAssets = await db.activity.findMany({
    where: { type: "ASSET" },
    select: { id: true, description: true },
  });
  const damagedAssetIds = new Set<string>();
  for (const a of damagedAssets) {
    try {
      const meta = JSON.parse(a.description ?? "{}");
      if (meta.condition === "DAMAGED") damagedAssetIds.add(a.id);
    } catch {
      // ignore corrupt rows
    }
  }

  // Per-asset cost breakdown (top spenders).
  const costByAsset: Record<string, number> = {};
  for (const r of items) {
    if (r.status === "COMPLETED") {
      costByAsset[r.assetId] = (costByAsset[r.assetId] ?? 0) + (Number(r.cost) || 0);
    }
  }
  const topAssets = Object.entries(costByAsset)
    .map(([assetId, cost]) => ({ assetId, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // Type distribution (REPAIR / MAINTENANCE / UPGRADE / INSPECTION / REPLACEMENT)
  const typeDistribution: Record<MaintenanceType, number> = {
    REPAIR: 0,
    MAINTENANCE: 0,
    UPGRADE: 0,
    INSPECTION: 0,
    REPLACEMENT: 0,
  };
  for (const r of items) {
    if (r.status !== "CANCELLED") {
      typeDistribution[r.type] = (typeDistribution[r.type] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    items,
    total: items.length,
    summary: {
      totalCost,
      activeCount,
      completedCount,
      cancelledCount,
      assetsWithMaintenanceCount: assetIdsWithMaintenance.length,
      damagedAssetCount: damagedAssetIds.size,
      typeDistribution,
      topAssets,
    },
  });
}
