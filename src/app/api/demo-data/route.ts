import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDemoData } from "@/lib/demo-data";

// ============================================================
// Demo Data Seeder
//
// POST /api/demo-data
//
// Idempotently fills the empty operational modules (interviews,
// surveys, expenses, timesheets, asset maintenance) with realistic
// sample data. NEVER touches existing rows — datasets that already
// contain data are skipped and reported back.
// ============================================================

export async function POST() {
  try {
    const result = await ensureDemoData();

    const createdCount = Object.values(result.created).reduce(
      (s, n) => s + n,
      0
    );

    const user = await db.user.findFirst({ where: { role: "HR_ADMIN" } });

    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: "DEMO_DATA_SEED",
        entityType: "System",
        entityId: "demo-data",
        description: `Demo data seeding: ${createdCount} records created${
          Object.keys(result.skipped).length
            ? `, skipped: ${Object.keys(result.skipped).join(", ")}`
            : ""
        }`,
        ipAddress: "system",
      },
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      createdCount,
      message:
        createdCount > 0
          ? `${createdCount} demo records created across ${
              Object.keys(result.created).length
            } module(s).`
          : "All modules already contain data — nothing was added.",
    });
  } catch (error) {
    console.error("Demo data seeding failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Demo data seeding failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Preview: what WOULD be seeded / skipped right now.
  const [candidates, interviews, surveys, expenses, timesheets, assets, maintenance] =
    await Promise.all([
      db.candidate.count(),
      db.activity.count({ where: { type: "INTERVIEW" } }),
      db.activity.count({ where: { type: "SURVEY" } }),
      db.activity.count({ where: { type: "EXPENSE" } }),
      db.activity.count({ where: { type: "TIMESHEET" } }),
      db.activity.count({ where: { type: "ASSET" } }),
      db.activity.count({ where: { type: "ASSET_MAINTENANCE" } }),
    ]);
  return NextResponse.json({
    datasets: {
      candidates: { existing: candidates, seedable: candidates === 0 },
      interviews: { existing: interviews, seedable: interviews === 0 },
      surveys: { existing: surveys, seedable: surveys === 0 },
      expenses: { existing: expenses, seedable: expenses === 0 },
      timesheets: { existing: timesheets, seedable: timesheets === 0 },
      assets: { existing: assets, seedable: assets === 0 },
      assetMaintenance: {
        existing: maintenance,
        seedable: maintenance === 0,
      },
    },
  });
}
