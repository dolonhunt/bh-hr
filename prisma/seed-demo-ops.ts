import { ensureDemoData } from "../src/lib/demo-data";
import { db } from "../src/lib/db";

// ============================================================
// CLI: seed demo data into the operational modules.
// Usage: bunx tsx prisma/seed-demo-ops.ts
// Idempotent — safe to run repeatedly.
// ============================================================

async function main() {
  console.log("Seeding demo ops data (interviews, surveys, expenses, timesheets, maintenance)...");
  const result = await ensureDemoData();
  console.log("Created:", result.created);
  console.log("Skipped:", result.skipped);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
