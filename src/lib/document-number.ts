// Document numbering helper.
// Produces document numbers like  BH/HR/APPT/08142025/EMP001  using the
// pattern stored in DocumentNumbering (default "{COMPANY}/{DEPARTMENT}/
// {DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}") and bumps the nextSeq counter so the
// total count is tracked.

import { db } from "@/lib/db";

interface NumberingInput {
  type: string;
  employee: {
    employeeId: string;
    department?: { name?: string | null } | null;
  };
  company?: { name?: string | null } | null;
}

// Short, stable abbreviations for known department names so numbers look clean.
const DEPARTMENT_ABBREV: Record<string, string> = {
  "human resources": "HR",
  engineering: "ENG",
  product: "PROD",
  design: "DES",
  sales: "SAL",
  marketing: "MKT",
  finance: "FIN",
  operations: "OPS",
  it: "IT",
  legal: "LEG",
  support: "SUP",
  customer: "CS",
};

// Map DocumentTemplate.type (long form) -> short code used in the document
// number. Falls back to the first 4 letters of the type for unknown types.
const TYPE_ABBREV: Record<string, string> = {
  OFFER: "OFFER",
  APPOINTMENT: "APPT",
  CONTRACT: "CON",
  JOINING: "JOIN",
  CONFIRMATION: "CONF",
  PAYSLIP: "PAYSLIP",
  SALARY_CERT: "SALCERT",
  INCREMENT: "INC",
  SALARY_REVISION: "SALREV",
  PROMOTION: "PROMO",
  TRANSFER: "TRF",
  WARNING: "WARN",
  SHOW_CAUSE: "SC",
  EXPERIENCE: "EXP",
  EMPLOYMENT_CERT: "EMPCERT",
  NOC: "NOC",
  LEAVE_APPROVAL: "LA",
  LEAVE_CANCELLATION: "LC",
  RESIGN_ACCEPT: "RESIGN",
  RELIEVING: "RELIEVE",
  FINAL_SETTLEMENT: "FNS",
  CUSTOM: "CUSTOM",
};

function abbreviateDepartment(name?: string | null): string {
  if (!name) return "GEN";
  const key = name.trim().toLowerCase();
  if (DEPARTMENT_ABBREV[key]) return DEPARTMENT_ABBREV[key];
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

function abbreviateCompany(name?: string | null): string {
  if (!name) return "BH";
  // Take first letter of every word, max 4 chars.
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

function abbreviateType(type: string): string {
  if (TYPE_ABBREV[type]) return TYPE_ABBREV[type];
  return type.replace(/[^A-Z]/g, "").slice(0, 6) || "DOC";
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

/**
 * Generate a unique document number for a freshly created GeneratedDocument.
 * Pattern (default): {COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}
 * DATE is MMDDYYYY. A sequence suffix is appended when the same employee gets
 * more than one document of the same type on the same day (so the value stays
 * unique even though SQLite enforces uniqueness).
 *
 * When `dryRun` is true the proposed number is returned but the
 * DocumentNumbering.nextSeq counter is NOT incremented (useful for previews).
 */
export async function generateDocumentNumber(
  input: NumberingInput,
  opts: { dryRun?: boolean } = {}
): Promise<{ documentNumber: string; sequence: number }> {
  const { type, employee, company } = input;
  const { dryRun = false } = opts;

  // Find or create the default DocumentNumbering row.
  let numbering = await db.documentNumbering.findFirst({
    where: { name: "Default" },
  });
  if (!numbering) {
    numbering = await db.documentNumbering.create({
      data: {
        name: "Default",
        pattern:
          "{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}",
        prefix: abbreviateCompany(company?.name),
        padding: 4,
        nextSeq: 1,
      },
    });
  }

  const seq = numbering.nextSeq;
  const padding = Math.max(3, numbering.padding ?? 4);

  // Prefer the explicit `prefix` stored on the DocumentNumbering row when set,
  // otherwise derive an abbreviation from the company name.
  const companyCode = numbering.prefix?.trim()
    ? numbering.prefix.trim().toUpperCase()
    : abbreviateCompany(company?.name);
  const deptCode = abbreviateDepartment(employee.department?.name);
  const typeCode = abbreviateType(type);
  const now = new Date();
  const dateCode = `${pad(now.getMonth() + 1, 2)}${pad(
    now.getDate(),
    2
  )}${now.getFullYear()}`;
  const empCode = employee.employeeId || "EMP";

  // Build the formatted value from the configured pattern. When the pattern
  // contains {COMPANY} but no {PREFIX} token, also substitute {PREFIX} with
  // the company code so legacy patterns that use {PREFIX} keep working.
  let value = (numbering.pattern ?? "{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}")
    .replace(/\{COMPANY\}/g, companyCode)
    .replace(/\{DEPARTMENT\}/g, deptCode)
    .replace(/\{DOCUMENT_TYPE\}/g, typeCode)
    .replace(/\{DATE\}/g, dateCode)
    .replace(/\{EMPLOYEE_ID\}/g, empCode)
    .replace(/\{PREFIX\}/g, companyCode)
    .replace(/\{SEQ\}/g, pad(seq, padding))
    .replace(/\{YYYY\}/g, String(now.getFullYear()))
    .replace(/\{MM\}/g, pad(now.getMonth() + 1, 2))
    .replace(/\{DD\}/g, pad(now.getDate(), 2));

  // Ensure uniqueness against existing rows. If a collision is found we
  // append an incrementing suffix.
  let finalValue = value;
  let safety = 0;
  while (
    await db.generatedDocument.findUnique({ where: { documentNumber: finalValue } })
  ) {
    safety += 1;
    if (safety > 5000) break;
    finalValue = `${value}-${pad(safety, padding)}`;
  }

  // Increment the sequence unless we're only previewing.
  if (!dryRun) {
    await db.documentNumbering.update({
      where: { id: numbering.id },
      data: { nextSeq: seq + 1 },
    });
  }

  return { documentNumber: finalValue, sequence: seq };
}
