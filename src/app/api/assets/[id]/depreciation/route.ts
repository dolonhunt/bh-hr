import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDTO, type AssetType } from "../../route";

// ============================================================
// GET /api/assets/[id]/depreciation
//   Per-year depreciation history for a single asset.
// ============================================================

const DEPRECIATION_RATES: Record<AssetType, number> = {
  LAPTOP: 0.33,
  MONITOR: 0.25,
  PHONE: 0.4,
  TABLET: 0.35,
  DESK: 0.1,
  CHAIR: 0.15,
  OTHER: 0.2,
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

export async function GET(
  _req: Request,
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

  const rate = rateFor(dto.type);
  const purchaseValue = dto.purchaseValue;
  const age = ageYears(dto.createdAt);
  const currentCv =
    purchaseValue > 0
      ? Math.max(
          0,
          Math.min(
            purchaseValue * Math.pow(1 - rate, age),
            purchaseValue
          )
        )
      : 0;

  // Build year-by-year history (0..ceil(age) + 5 projection years).
  const yearsBack = Math.max(1, Math.ceil(age));
  const projectionYears = 5;
  const totalYears = yearsBack + projectionYears;
  const history = Array.from({ length: totalYears + 1 }).map((_, y) => {
    const endValue =
      purchaseValue > 0
        ? Math.max(
            0,
            Math.min(purchaseValue * Math.pow(1 - rate, y), purchaseValue)
          )
        : 0;
    const startValue =
      y === 0
        ? purchaseValue
        : purchaseValue > 0
          ? Math.max(
              0,
              Math.min(purchaseValue * Math.pow(1 - rate, y - 1), purchaseValue)
            )
          : 0;
    const cumulativeDepreciation = Math.max(0, purchaseValue - endValue);
    const depreciationThisYear = Math.max(0, startValue - endValue);
    const isPast = y <= yearsBack;
    const isCurrent = y === Math.floor(age) || (age === 0 && y === 0);
    return {
      year: y,
      label: `Year ${y}`,
      startValue: Number(startValue.toFixed(2)),
      endValue: Number(endValue.toFixed(2)),
      depreciationThisYear: Number(depreciationThisYear.toFixed(2)),
      cumulativeDepreciation: Number(cumulativeDepreciation.toFixed(2)),
      remainingValue: Number(endValue.toFixed(2)),
      isPast,
      isCurrent,
      isProjection: !isPast && !isCurrent,
    };
  });

  return NextResponse.json({
    asset: {
      id: dto.id,
      name: dto.name,
      type: dto.type,
      serialNumber: dto.serialNumber,
      purchaseValue,
      depreciationRate: rate,
      age: Number(age.toFixed(2)),
      annualDepreciation: Number((purchaseValue * rate).toFixed(2)),
      totalDepreciation: Number(
        Math.min(purchaseValue, purchaseValue - currentCv).toFixed(2)
      ),
      currentValue: Number(currentCv.toFixed(2)),
      purchaseDate: dto.createdAt,
      condition: dto.condition,
      status: dto.status,
    },
    history,
  });
}
