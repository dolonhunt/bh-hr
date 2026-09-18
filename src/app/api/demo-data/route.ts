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

    await db.auditLog.create({
      data: {
        action: "DEMO_DATA_SEED",
        entityType: "System",
        entityId: "demo-data",
        details: `Demo data seeding: ${createdCount} records created${
          Object.keys(result.skipped).length
            ? `, skipped: ${Object.keys(result.skipped).join(", ")}`
            : ""
        }`,
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
  const [interviews, surveys, expenses, timesheets, maintenance] =
    await Promise.all([
      db.activity.count({ where: { type: "INTERVIEW" } }),
      db.activity.count({ where: { type: "SURVEY" } }),
      db.activity.count({ where: { type: "EXPENSE" } }),
      db.activity.count({ where: { type: "TIMESHEET" } }),
      db.activity.count({ where: { type: "ASSET_MAINTENANCE" } }),
    ]);
  return NextResponse.json({
    datasets: {
      interviews: { existing: interviews, seedable: interviews === 0 },
      surveys: { existing: surveys, seedable: surveys === 0 },
      expenses: { existing: expenses, seedable: expenses === 0 },
      timesheets: { existing: timesheets, seedable: timesheets === 0 },
      assetMaintenance: {
        existing: maintenance,
        seedable: maintenance === 0,
      },
    },
  });
}
