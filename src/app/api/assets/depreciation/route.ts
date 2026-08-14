import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDTO, type AssetType } from "../route";

// ============================================================
// GET /api/assets/depreciation
//   Returns a depreciation summary for every asset.
//
//   Per-asset shape:
//     {
//       id, name, type, serialNumber,
//       purchaseValue,            // number
//       depreciationRate,         // 0..1 (annual fraction)
//       age,                      // years since createdAt (float)
//       annualDepreciation,       // purchaseValue * depreciationRate (max total)
//       totalDepreciation,        // min(purchaseValue - currentValue, purchaseValue)
//       currentValue              // max(0, purchaseValue * (1 - rate)^years)
//     }
// ============================================================

const DEPRECIATION_RATES: Record<AssetType, number> = {
  LAPTOP: 0.33,
  MONITOR: 0.25,
  PHONE: 0.4,
  TABLET: 0.35,
  DESK: 0.1,
  CHAIR: 0.15,
  OTHER: 0.2,
  // Asset types not explicitly specced default to OTHER's rate.
  KEYBOARD: 0.2,
  MOUSE: 0.2,
  HEADSET: 0.2,
  PRINTER: 0.2,
  CAMERA: 0.2,
};

function rateFor(type: string): number {
  const t = String(type).toUpperCase() as AssetType;
  return DEPRECIATION_RATES[t] ?? 0.2;
}

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

function ageYears(createdAt: Date | string | null | undefined): number {
  if (!createdAt) return 0;
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (isNaN(d.getTime())) return 0;
  const ms = Date.now() - d.getTime();
  if (ms <= 0) return 0;
  return ms / MS_PER_YEAR;
}

function currentValue(purchaseValue: number, rate: number, years: number): number {
  if (purchaseValue <= 0) return 0;
  const cv = purchaseValue * Math.pow(1 - rate, years);
  return Math.max(0, Math.min(cv, purchaseValue));
}

export async function GET() {
  const activities = await db.activity.findMany({
    where: { type: "ASSET" },
    orderBy: { createdAt: "desc" },
  });

  const items = activities
    .map((a) => {
      const dto = toDTO(a);
      if (!dto) return null;
      const rate = rateFor(dto.type);
      const age = ageYears(dto.createdAt);
      const cv = currentValue(dto.purchaseValue, rate, age);
      const totalDep = Math.min(dto.purchaseValue, dto.purchaseValue - cv);
      return {
        id: dto.id,
        name: dto.name,
        type: dto.type,
        serialNumber: dto.serialNumber,
        purchaseValue: dto.purchaseValue,
        depreciationRate: rate,
        age: Number(age.toFixed(2)),
        annualDepreciation: Number((dto.purchaseValue * rate).toFixed(2)),
        totalDepreciation: Number(totalDep.toFixed(2)),
        currentValue: Number(cv.toFixed(2)),
        purchaseDate: dto.createdAt,
        condition: dto.condition,
        status: dto.status,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const totalPurchase = items.reduce((s, a) => s + a.purchaseValue, 0);
  const totalCurrent = items.reduce((s, a) => s + a.currentValue, 0);
  const totalDepreciated = items.reduce((s, a) => s + a.totalDepreciation, 0);
  const avgPct =
    totalPurchase > 0
      ? Math.round((totalDepreciated / totalPurchase) * 1000) / 10
      : 0;

  return NextResponse.json({
    items,
    total: items.length,
    summary: {
      totalPurchaseValue: Number(totalPurchase.toFixed(2)),
      totalCurrentValue: Number(totalCurrent.toFixed(2)),
      totalDepreciation: Number(totalDepreciated.toFixed(2)),
      avgDepreciationPct: avgPct,
    },
  });
}
