import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  loadTaxSlabs,
  saveTaxSlabs,
  DEFAULT_TAX_SLABS,
  type TaxSlab,
} from "@/lib/payroll-calc";

// =============================================================
// GET  /api/payroll/tax-slabs
//   Returns the current tax slab configuration (default or stored).
//
// PATCH /api/payroll/tax-slabs
//   Body: { slabs: TaxSlab[] }
//   Replaces the entire tax slab configuration (admin-only by convention;
//   the project has no auth gating in this dev env so we still persist).
// =============================================================

export async function GET() {
  const slabs = await loadTaxSlabs();
  return NextResponse.json({
    slabs,
    defaults: DEFAULT_TAX_SLABS,
    source: slabs === DEFAULT_TAX_SLABS ? "default" : "stored",
  });
}

export async function PATCH(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const slabs = body.slabs ?? body.taxSlabs;
  if (!Array.isArray(slabs) || slabs.length === 0) {
    return NextResponse.json(
      { error: "slabs must be a non-empty array" },
      { status: 400 }
    );
  }

  // Normalize + validate
  const normalized: TaxSlab[] = slabs.map((raw: any, idx: number) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Slab #${idx + 1}: must be an object`);
    }
    const id = String(raw.id ?? "").trim() || `slab-${idx + 1}`;
    const min = Number(raw.min);
    if (!Number.isFinite(min) || min < 0) {
      throw new Error(`Slab ${id}: min must be a non-negative number`);
    }
    const max =
      raw.max === null || raw.max === undefined || raw.max === ""
        ? null
        : Number(raw.max);
    if (max !== null && (!Number.isFinite(max) || max <= min)) {
      throw new Error(`Slab ${id}: max must be null or greater than min`);
    }
    const rate = Number(raw.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new Error(`Slab ${id}: rate must be between 0 and 1`);
    }
    const label =
      String(raw.label ?? "").trim() ||
      (max === null
        ? `Above ${min.toLocaleString()}`
        : `${min.toLocaleString()} - ${max.toLocaleString()}`);
    return { id, min, max, rate, label };
  });

  // Check for overlaps/gaps in the slab range
  const sorted = [...normalized].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevUpper = prev.max ?? Infinity;
      if (prevUpper !== cur.min) {
        return NextResponse.json(
          {
            error: `Tax slab ranges must be contiguous. Slab "${prev.id}" ends at ${prevUpper === Infinity ? "∞" : prevUpper} but slab "${cur.id}" starts at ${cur.min}.`,
          },
          { status: 400 }
        );
      }
    }
    if (cur.max === null && i !== sorted.length - 1) {
      return NextResponse.json(
        {
          error: `Tax slab "${cur.id}" has no upper bound but is not the last slab. Only the highest slab can have max=null.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    await saveTaxSlabs(normalized);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save tax slabs" },
      { status: 500 }
    );
  }

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "PAYROLL_TAX_SLABS_UPDATE",
        entityType: "PayrollTaxSlabs",
        description: `Updated tax slab configuration (${normalized.length} slabs).`,
        metadata: JSON.stringify({ slabs: normalized }),
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ slabs: normalized, source: "stored" });
}
