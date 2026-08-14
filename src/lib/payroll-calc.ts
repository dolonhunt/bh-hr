// =============================================================
// Payroll calculation & tax slab helpers
// =============================================================
//
// Shared logic for the /api/payroll/calculate and /api/payroll/tax-slabs
// endpoints. Lives in /lib so it can be imported by either route.
//
// Tax slabs are stored in the Setting table under the key
// `payroll_tax_slabs` as a JSON string. If absent, the default
// progressive-tax slabs below are used.

export interface TaxSlab {
  id: string;
  min: number; // inclusive lower bound (annual income)
  max: number | null; // exclusive upper bound (null = no upper limit)
  rate: number; // 0..1 (e.g. 0.05 = 5%)
  label: string;
}

export const DEFAULT_TAX_SLABS: TaxSlab[] = [
  { id: "slab-1", min: 0,        max: 300000,   rate: 0,    label: "Up to 3,00,000" },
  { id: "slab-2", min: 300000,   max: 600000,   rate: 0.05, label: "3,00,001 - 6,00,000" },
  { id: "slab-3", min: 600000,   max: 900000,   rate: 0.10, label: "6,00,001 - 9,00,000" },
  { id: "slab-4", min: 900000,   max: 1200000,  rate: 0.15, label: "9,00,001 - 12,00,000" },
  { id: "slab-5", min: 1200000,  max: 1500000,  rate: 0.20, label: "12,00,001 - 15,00,000" },
  { id: "slab-6", min: 1500000,  max: null,     rate: 0.25, label: "Above 15,00,000" },
];

export const SETTING_KEY_TAX_SLABS = "payroll_tax_slabs";

export interface PayrollSettings {
  hraRate: number;       // 0..1, default 0.50
  pfRate: number;        // 0..1, default 0.12 (employee contribution)
  professionalTax: number; // flat per month, default 200
  gratuityRate: number;  // 0..1, default 0.0481 (employer contribution — informational)
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  hraRate: 0.5,
  pfRate: 0.12,
  professionalTax: 200,
  gratuityRate: 0.0481,
};

export const SETTING_KEY_PAYROLL_SETTINGS = "payroll_settings";

// ---- Setting-table helpers ----

import { db } from "@/lib/db";

export async function loadTaxSlabs(): Promise<TaxSlab[]> {
  const row = await db.setting.findUnique({
    where: { key: SETTING_KEY_TAX_SLABS },
  });
  if (!row?.value) return DEFAULT_TAX_SLABS;
  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TAX_SLABS;
    return parsed.map(normalizeSlab).filter(Boolean) as TaxSlab[];
  } catch {
    return DEFAULT_TAX_SLABS;
  }
}

export async function saveTaxSlabs(slabs: TaxSlab[]): Promise<void> {
  // Validate first
  if (!Array.isArray(slabs) || slabs.length === 0) {
    throw new Error("Tax slabs must be a non-empty array");
  }
  for (const s of slabs) {
    normalizeSlab(s); // throws if invalid
  }
  // Sort ascending by min so calculation is deterministic
  const sorted = [...slabs].sort((a, b) => a.min - b.min);
  await db.setting.upsert({
    where: { key: SETTING_KEY_TAX_SLABS },
    create: { key: SETTING_KEY_TAX_SLABS, value: JSON.stringify(sorted) },
    update: { key: SETTING_KEY_TAX_SLABS, value: JSON.stringify(sorted) },
  });
}

export async function loadPayrollSettings(): Promise<PayrollSettings> {
  const row = await db.setting.findUnique({
    where: { key: SETTING_KEY_PAYROLL_SETTINGS },
  });
  if (!row?.value) return DEFAULT_PAYROLL_SETTINGS;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_PAYROLL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_PAYROLL_SETTINGS;
  }
}

function normalizeSlab(raw: any): TaxSlab {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid tax slab: must be an object");
  }
  const id = String(raw.id ?? "").trim();
  if (!id) throw new Error("Invalid tax slab: id is required");
  const min = Number(raw.min);
  if (!Number.isFinite(min) || min < 0) {
    throw new Error(`Invalid tax slab ${id}: min must be a non-negative number`);
  }
  const max = raw.max === null || raw.max === undefined ? null : Number(raw.max);
  if (max !== null && (!Number.isFinite(max) || max <= min)) {
    throw new Error(`Invalid tax slab ${id}: max must be null or > min`);
  }
  const rate = Number(raw.rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Invalid tax slab ${id}: rate must be between 0 and 1`);
  }
  const label = String(raw.label ?? "").trim() || `${min} - ${max ?? "∞"}`;
  return { id, min, max, rate, label };
}

// =============================================================
// Calculation
// =============================================================

export interface TdsBreakdownRow {
  slabId: string;
  slabLabel: string;
  rate: number;
  taxableAmountInSlab: number;
  taxForSlab: number;
}

export interface PayrollBreakdown {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  pf: number;
  professionalTax: number;
  tds: number;
  tdsBreakdown: TdsBreakdownRow[];
  gratuity: number;
  customDeductions: number;
  totalDeductions: number;
  netSalary: number;
  taxSlab: TaxSlab | null; // The highest slab that applies
  annualIncome: number;
  annualTax: number;
}

export interface CalculateInput {
  basicSalary: number;
  allowances?: number;
  deductions?: number;
  slabs: TaxSlab[];
  settings: PayrollSettings;
}

/**
 * Calculate payroll breakdown including progressive-tax TDS.
 *
 *   grossSalary  = basic + hra + specialAllowance + allowances
 *   netSalary    = grossSalary - pf - professionalTax - tds - customDeductions
 *
 * TDS is computed on ANNUAL gross (= monthly gross * 12), then divided
 * by 12 to get the monthly deduction.
 *
 * NOTE: The "allowances" input is treated as an additional flat allowance
 * layered on top of the HRA + special allowance structure. If gross is
 * not specified, we use:
 *   gross = basic + hra + special + allowances
 * where:
 *   hra = basic * 0.5
 *   special = 0 (we don't pad to a target gross)
 */
export function calculatePayroll(input: CalculateInput): PayrollBreakdown {
  const { basicSalary: basic, slabs, settings } = input;
  const customAllowances = Number(input.allowances ?? 0);
  const customDeductions = Number(input.deductions ?? 0);

  // Components
  const hra = round2(basic * settings.hraRate);
  // Special allowance fills the gap so that "gross = basic + hra + special + customAllowances"
  // matches the employee's expected gross. We treat customAllowances as an additional
  // allowance on top of HRA, so special allowance = 0 by default (the employee's allowances
  // field is the "extra" portion).
  const specialAllowance = 0;
  const grossSalary = round2(basic + hra + specialAllowance + customAllowances);

  // Deductions
  const pf = round2(basic * settings.pfRate);
  const professionalTax = round2(settings.professionalTax);

  // TDS (progressive, computed on annual gross)
  const monthlyGrossForTax = grossSalary;
  const annualIncome = round2(monthlyGrossForTax * 12);
  const { annualTax, breakdown, appliedSlab } = computeAnnualTax(annualIncome, slabs);
  const tds = round2(annualTax / 12);

  // Gratuity (employer contribution — informational only)
  const gratuity = round2(basic * settings.gratuityRate);

  // Total deductions = PF + PT + TDS + custom deductions
  const totalDeductions = round2(pf + professionalTax + tds + customDeductions);

  // Net
  const netSalary = round2(grossSalary - totalDeductions);

  return {
    basicSalary: round2(basic),
    hra,
    specialAllowance,
    grossSalary,
    pf,
    professionalTax,
    tds,
    tdsBreakdown: breakdown,
    gratuity,
    customDeductions,
    totalDeductions,
    netSalary,
    taxSlab: appliedSlab,
    annualIncome,
    annualTax,
  };
}

function computeAnnualTax(
  annualIncome: number,
  slabs: TaxSlab[]
): {
  annualTax: number;
  breakdown: TdsBreakdownRow[];
  appliedSlab: TaxSlab | null;
} {
  const sorted = [...slabs].sort((a, b) => a.min - b.min);
  const breakdown: TdsBreakdownRow[] = [];
  let totalTax = 0;
  let appliedSlab: TaxSlab | null = null;

  for (const slab of sorted) {
    if (annualIncome <= slab.min) break;
    const upper = slab.max ?? Infinity;
    const taxableInSlab = Math.min(annualIncome, upper) - slab.min;
    if (taxableInSlab <= 0) continue;
    const tax = taxableInSlab * slab.rate;
    totalTax += tax;
    appliedSlab = slab;
    breakdown.push({
      slabId: slab.id,
      slabLabel: slab.label,
      rate: slab.rate,
      taxableAmountInSlab: round2(taxableInSlab),
      taxForSlab: round2(tax),
    });
  }

  return {
    annualTax: round2(totalTax),
    breakdown,
    appliedSlab,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
