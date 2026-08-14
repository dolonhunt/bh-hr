import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// =============================================================
// Payroll Bank File Generator
// =============================================================
//
// GET /api/payroll/bank-file?month=YYYY-MM&format=csv|nacha
//
// Generates a bank transfer file for all PAID payroll records for the
// specified month. Two formats are supported:
//
//   format=csv   — A standard CSV with one row per employee + a header
//                  row + a totals row at the bottom. Columns:
//                  Employee ID, Employee Name, Bank Name, Account Number,
//                  IFSC/Routing, Amount, Payment Date, Reference.
//
//   format=nacha — A simplified NACHA-style fixed-width file (94 chars
//                  per line) with:
//                    * File Header record (1)
//                    * Batch Header record (1)
//                    * Entry Detail records (1 per employee)
//                    * Batch Control record (1)
//                    * File Control record (1)
//
// Sets Content-Type + Content-Disposition so browsers download the file.
// Audit log entry created with action="BANK_FILE_GENERATED".

// =============================================================
// Helpers
// =============================================================

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateNacha(d: Date): string {
  // NACHA YYMMDD
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function fmtTimeNacha(d: Date): string {
  // NACHA HHMM
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}${m}`;
}

// Pad/truncate a string to exactly N chars (right-padded with spaces).
function fixed(s: string, n: number): string {
  const v = (s ?? "").toString();
  if (v.length > n) return v.slice(0, n);
  return v + " ".repeat(n - v.length);
}

// Numeric field, zero-padded to exactly N chars.
function fixedNum(n: number, width: number): string {
  const neg = n < 0;
  const abs = Math.abs(Math.round(n * 100)) // store cents
    .toString()
    .padStart(width - 1, "0");
  // For NACHA entry detail amounts the sign is the leading char of the
  // routing number, so amounts are unsigned. We only emit the absolute
  // value (which is what's actually transferred).
  return abs.slice(0, width);
}

// Mask account number for CSV display (keep last 4 visible).
function maskAccount(acct: string | null | undefined): string {
  if (!acct) return "";
  const trimmed = acct.trim();
  if (trimmed.length <= 4) return trimmed;
  return "****" + trimmed.slice(-4);
}

// =============================================================
// CSV builder
// =============================================================

function buildCsv(
  rows: Array<{
    employeeCode: string;
    employeeName: string;
    bankName: string;
    bankAccount: string;
    bankIfsc: string;
    amount: number;
    paymentDate: Date | null;
    reference: string;
  }>,
  month: string
): string {
  const lines: string[] = [];
  // Header row
  lines.push(
    [
      "Employee ID",
      "Employee Name",
      "Bank Name",
      "Account Number",
      "IFSC/Routing",
      "Amount",
      "Payment Date",
      "Reference",
    ]
      .map((h) => csvEscape(h))
      .join(",")
  );

  let total = 0;
  for (const r of rows) {
    total += r.amount;
    lines.push(
      [
        r.employeeCode,
        r.employeeName,
        r.bankName || "—",
        r.bankAccount || "—",
        r.bankIfsc || "—",
        fmtMoney(r.amount),
        fmtDate(r.paymentDate),
        r.reference,
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    );
  }

  // Totals row
  lines.push(
    [
      "TOTAL",
      `${rows.length} employees`,
      "",
      "",
      "",
      fmtMoney(total),
      "",
      `Month: ${month}`,
    ]
      .map((v) => csvEscape(v))
      .join(",")
  );

  return lines.join("\n") + "\n";
}

function csvEscape(s: string): string {
  if (s == null) return "";
  const v = String(s);
  // Quote if it contains a comma, double-quote, newline, or leading/trailing space.
  if (/[,\"\n\r]/.test(v) || /^\s|\s$/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// =============================================================
// NACHA builder (simplified, 94-char fixed-width)
// =============================================================

function buildNacha(
  rows: Array<{
    employeeCode: string;
    employeeName: string;
    bankName: string;
    bankAccount: string;
    bankIfsc: string;
    amount: number;
    paymentDate: Date | null;
  }>,
  companyName: string
): string {
  const lines: string[] = [];
  const now = new Date();
  const todayNacha = fmtDateNacha(now);
  const timeNacha = fmtTimeNacha(now);
  // Use a fixed dummy ABA routing (123456789) + bank ABA from bankIfsc
  // if it looks numeric, else fall back to default.
  const companyRouting = "123456789"; // dummy originator routing
  const companyIdent = "1" + companyRouting; // 1 = bank-internal, rest routing

  // Total amount in cents (no decimals)
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalAmountCents = Math.round(totalAmount * 100);

  // ---------------------------------------------------------
  // 1. File Header (record type 1)
  // ---------------------------------------------------------
  let line1 = "";
  line1 += "1"; // Record type (1)
  line1 += "01"; // Priority code (01-09)
  line1 += fixedNum(0, 10).slice(0, 10); // Immediate destination (10 digit routing, zero-filled)
  // Replace destination with companyRouting digits if numeric
  const dest = (companyRouting + "0").padStart(10, "0").slice(0, 10);
  line1 =
    "1" +
    "01" +
    dest +
    " " + // 10 chars immediate destination
    fixedNum(0, 10).slice(0, 10); // 10 chars immediate origin (placeholder)
  // Build properly: pos 1=record type, 2-3 priority, 4-13 immediate destination, 14-23 immediate origin, 24-29 file creation date YYMMDD, 30-33 file creation time HHMM, 34-34 file ID modifier 'A', 35-37 record size '094', 38-39 blocking factor '10', 40-40 format code '1', 41-63 destination name (23), 64-86 origin name (23), 87-94 reference code (8)
  line1 =
    "1" + // 1
    "01" + // 2
    "0".repeat(10) + // 10 — immediate destination (placeholder)
    " ".repeat(1) + // 1 space
    "0".repeat(9) + // 9 — immediate origin (placeholder)
    "1".repeat(1) + // 1 — origin supplementary
    todayNacha + // 6 — file creation date YYMMDD
    timeNacha + // 4 — file creation time HHMM
    "A" + // 1 — file ID modifier
    "094" + // 3 — record size
    "10" + // 2 — blocking factor
    "1" + // 1 — format code
    fixed("BANK".padEnd(23, " "), 23) + // 23 — destination name
    fixed(companyName, 23) + // 23 — origin name
    fixed("", 8); // 8 — reference code
  lines.push(pad94(line1));

  // ---------------------------------------------------------
  // 2. Batch Header (record type 5)
  // ---------------------------------------------------------
  const entryHash = rows.reduce((sum, r) => {
    const rt = (r.bankIfsc || "0").replace(/\D/g, "").slice(0, 8);
    const n = parseInt(rt, 10) || 0;
    return sum + n;
  }, 0);
  const entryHashStr = String(entryHash).slice(-8).padStart(8, "0");

  const serviceClassCode = "200"; // mixed credits and debits — but here all credits
  let line5 = "";
  line5 =
    "5" + // 1 — record type
    "2200" + // 4 — service class code (220 = credits only)
    fixed(companyName, 16) + // 16 — company name
    fixed("", 20) + // 20 — company discretionary data
    fixed(companyIdent.slice(0, 10), 10) + // 10 — company identification
    "CCD" + // 3 — standard entry class code (Corporate Credit/Debit)
    fixed(`PAYROLL`, 10) + // 10 — company entry description
    todayNacha + // 6 — company descriptive date YYMMDD
    todayNacha + // 6 — effective entry date YYMMDD
    "   " + // 3 — settlement date (blank)
    "1" + // 1 — originator status code (1 = ODFI)
    fixedNum(0, 8).slice(0, 8) + // 8 — ODFI identification (placeholder)
    fixed("0000001", 7); // 7 — batch number
  lines.push(pad94(line5));

  // ---------------------------------------------------------
  // 3. Entry Detail records (record type 6) — one per employee
  // ---------------------------------------------------------
  let traceCounter = 1;
  for (const r of rows) {
    const routing = (r.bankIfsc || "012345678")
      .replace(/\D/g, "")
      .padStart(9, "0")
      .slice(0, 9);
    const acctNum = (r.bankAccount || "0000000000")
      .replace(/[^A-Za-z0-9]/g, "")
      .padStart(17, "0")
      .slice(0, 17);
    const amountCents = Math.round(r.amount * 100);

    // Determine individual ID number (e.g. employee code, 15 chars)
    const indivId = (r.employeeCode || "EMP000")
      .replace(/[^A-Za-z0-9]/g, "")
      .padStart(15, "0")
      .slice(0, 15);
    // Determine individual name (22 chars, uppercase, no special chars)
    const indivName = (r.employeeName || "EMPLOYEE")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .trim()
      .slice(0, 22)
      .padEnd(22, " ");

    let line6 = "";
    line6 =
      "6" + // 1 — record type
      routing + // 9 — receiving DFI routing number
      "0" + // 1 — check digit (always 0 placeholder)
      acctNum + // 17 — receiving account number
      "22" + // 2 — transaction code (22 = checking deposit)
      fixedNum(amountCents, 10).slice(0, 10) + // 10 — amount in cents
      indivId + // 15 — individual ID number
      indivName + // 22 — individual name
      fixed("", 2) + // 2 — discretionary data
      "0" + // 1 — addenda record indicator (0 = no addenda)
      routing.slice(0, 8) + // 8 — trace number (ODFI routing prefix)
      String(traceCounter).padStart(7, "0"); // 7 — sequence number
    lines.push(pad94(line6));
    traceCounter++;
  }

  // ---------------------------------------------------------
  // 4. Batch Control (record type 8)
  // ---------------------------------------------------------
  const entryAddendaCount = rows.length;
  let line8 = "";
  line8 =
    "8" + // 1 — record type
    "2200" + // 4 — service class code
    fixedNum(entryAddendaCount, 6).slice(0, 6) + // 6 — entry/addenda count
    entryHashStr + // 8 — entry hash
    fixedNum(totalAmountCents, 10).slice(0, 10) + // 10 — total debit amount (placeholder 0)
    fixedNum(totalAmountCents, 10).slice(0, 10) + // 10 — total credit amount
    fixed(companyIdent.slice(0, 10), 10) + // 10 — company identification
    fixed("", 25) + // 25 — message authentication code (blank)
    fixed("", 8) + // 8 — reserved (blank)
    fixedNum(0, 8).slice(0, 8) + // 8 — ODFI identification (matches batch header)
    fixed("0000001", 7); // 7 — batch number (matches batch header)
  lines.push(pad94(line8));

  // ---------------------------------------------------------
  // 5. File Control (record type 9)
  // ---------------------------------------------------------
  const totalBlockCount = Math.ceil((lines.length + 1) / 10) || 1;
  let line9 = "";
  line9 =
    "9" + // 1 — record type
    fixedNum(1, 6).slice(0, 6) + // 6 — batch count (1)
    fixedNum(totalBlockCount, 6).slice(0, 6) + // 6 — block count
    fixedNum(entryAddendaCount + 2, 8).slice(0, 8) + // 8 — entry/addenda count (entries + headers/controls)
    entryHashStr + // 8 — entry hash
    fixedNum(0, 10).slice(0, 10) + // 10 — total debit amount
    fixedNum(totalAmountCents, 10).slice(0, 10) + // 10 — total credit amount
    fixed("", 39); // 39 — reserved
  lines.push(pad94(line9));

  // NACHA files must be a multiple of 10 lines (blocking factor 10).
  // Pad with 9s records (filler) until line count is a multiple of 10.
  while (lines.length % 10 !== 0) {
    lines.push("9".repeat(94));
  }

  return lines.join("\n") + "\n";
}

function pad94(line: string): string {
  if (line.length === 94) return line;
  if (line.length > 94) return line.slice(0, 94);
  return line + " ".repeat(94 - line.length);
}

// =============================================================
// Route handler
// =============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = (searchParams.get("month") || "").trim();
  const format = (searchParams.get("format") || "csv").toLowerCase() as
    | "csv"
    | "nacha";

  if (!month) {
    return NextResponse.json(
      { error: "month query parameter is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }
  if (format !== "csv" && format !== "nacha") {
    return NextResponse.json(
      { error: "format must be either 'csv' or 'nacha'" },
      { status: 400 }
    );
  }

  // Fetch all PAID payroll records for the given month, with their employees.
  const payrolls = await db.payroll.findMany({
    where: {
      payrollMonth: month,
      status: "PAID",
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          bankName: true,
          bankAccount: true,
          bankIfsc: true,
        },
      },
    },
    orderBy: [{ employee: { employeeId: "asc" } }],
  });

  if (payrolls.length === 0) {
    return NextResponse.json(
      {
        error: `No PAID payroll records found for ${month}. Mark payrolls as PAID before generating a bank file.`,
      },
      { status: 404 }
    );
  }

  // Build row DTOs
  const rows = payrolls.map((p) => ({
    employeeCode: p.employee.employeeId,
    employeeName: p.employee.fullName,
    bankName: p.employee.bankName ?? "",
    bankAccount: p.employee.bankAccount ?? "",
    bankIfsc: p.employee.bankIfsc ?? "",
    amount: Number(p.netSalary) || 0,
    paymentDate: p.paymentDate,
    reference: `PAY-${month}-${p.employee.employeeId}`,
  }));

  const total = rows.reduce((s, r) => s + r.amount, 0);

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "BANK_FILE_GENERATED",
        entityType: "Payroll",
        description: `Generated bank transfer file for ${month} (${rows.length} employees, total: ${fmtMoney(total)}). Format: ${format.toUpperCase()}.`,
        metadata: JSON.stringify({
          month,
          format,
          employeeCount: rows.length,
          totalAmount: total,
        }),
      },
    });
  } catch {
    // non-fatal
  }

  // Build the file
  let content: string;
  let contentType: string;
  let fileName: string;

  if (format === "csv") {
    content = buildCsv(rows, month);
    contentType = "text/csv; charset=utf-8";
    fileName = `bank-transfer-${month}.csv`;
  } else {
    // NACHA needs the company name for the file header
    const company = await db.company.findFirst({ orderBy: { createdAt: "asc" } });
    const companyName = company?.name ?? "TEAMHUB HR";
    content = buildNacha(rows, companyName.toUpperCase());
    contentType = "application/octet-stream; charset=ascii";
    fileName = `bank-transfer-${month}.nacha`;
  }

  // Return as a downloadable file
  const buf = Buffer.from(content, format === "csv" ? "utf-8" : "ascii");
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Employee-Count": String(rows.length),
      "X-Total-Amount": String(total),
    },
  });
}
