import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/attendance/import
// Accepts multipart/form-data with a `file` field containing a CSV file.
//
// CSV columns (case-insensitive header match):
//   Employee ID, Date, Check In, Check Out, Status
// where:
//   - Employee ID -> Employee.employeeId (e.g. EMP001)
//   - Date        -> YYYY-MM-DD
//   - Check In    -> HH:MM (24h) — combined with Date to form a timestamp
//   - Check Out   -> HH:MM (24h) — combined with Date to form a timestamp
//   - Status      -> PRESENT | ABSENT | LATE | LEAVE | HALF_DAY | REMOTE | HOLIDAY
//
// For each row:
//   - Find the employee by employeeId. If not found -> per-row error.
//   - Find any existing Attendance record for (employee, date).
//   - Create or update that record. Auto-computes workingHours, late,
//     lateMinutes, overtime from check-in/out (reuses the same logic as
//     POST /api/attendance).
//   - Errors are collected per-row and do not abort the whole batch.
//
// Response shape:
//   { imported: number, updated: number, failed: number,
//     errors: [{ row: number, error: string }] }
//
// An AuditLog entry (action="ATTENDANCE_IMPORT") is created with a summary.

const REQUIRED_HEADERS = [
  "employee id",
  "date",
  "check in",
  "check out",
  "status",
];

const VALID_STATUSES = new Set([
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "HALF_DAY",
  "REMOTE",
  "HOLIDAY",
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a CSV file." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded. Provide a 'file' field." },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
    return NextResponse.json(
      { error: "Only .csv files are supported." },
      { status: 400 }
    );
  }

  const text = await file.text();
  if (!text.trim()) {
    return NextResponse.json(
      { error: "The CSV file is empty." },
      { status: 400 }
    );
  }

  const parsed = parseCsv(text);

  // Header validation (case-insensitive)
  if (parsed.headers.length === 0) {
    return NextResponse.json(
      { error: "CSV must include a header row." },
      { status: 400 }
    );
  }
  const headerMap = mapHeaders(parsed.headers);
  for (const required of REQUIRED_HEADERS) {
    if (!(required in headerMap)) {
      return NextResponse.json(
        {
          error: `Missing required column "${required}". Found columns: ${parsed.headers.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  const colEmpId = headerMap["employee id"];
  const colDate = headerMap["date"];
  const colIn = headerMap["check in"];
  const colOut = headerMap["check out"];
  const colStatus = headerMap["status"];

  // Cache employee lookup by employeeId (e.g. EMP001)
  const employeeCodesInFile = new Set<string>();
  for (const row of parsed.rows) {
    const code = (row[colEmpId] || "").trim();
    if (code) employeeCodesInFile.add(code);
  }

  const employees = await db.employee.findMany({
    where: { employeeId: { in: Array.from(employeeCodesInFile) } },
    select: { id: true, employeeId: true, fullName: true },
  });
  const empByCode = new Map(employees.map((e) => [e.employeeId, e]));

  let imported = 0; // newly created
  let updated = 0; // existing record updated
  let failed = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Process each row sequentially (small batches, db is local SQLite)
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNo = i + 2; // +1 for header, +1 for 1-indexed row numbers

    const empCodeRaw = (row[colEmpId] || "").trim();
    const dateRaw = (row[colDate] || "").trim();
    const inRaw = (row[colIn] || "").trim();
    const outRaw = (row[colOut] || "").trim();
    const statusRaw = (row[colStatus] || "").trim().toUpperCase();

    if (!empCodeRaw) {
      failed++;
      errors.push({ row: rowNo, error: "Employee ID is required." });
      continue;
    }
    if (!dateRaw) {
      failed++;
      errors.push({ row: rowNo, error: "Date is required." });
      continue;
    }

    const emp = empByCode.get(empCodeRaw);
    if (!emp) {
      failed++;
      errors.push({
        row: rowNo,
        error: `Unknown employee ID "${empCodeRaw}".`,
      });
      continue;
    }

    // Parse date (YYYY-MM-DD)
    const dateParsed = parseDate(dateRaw);
    if (!dateParsed) {
      failed++;
      errors.push({
        row: rowNo,
        error: `Invalid date "${dateRaw}". Use YYYY-MM-DD.`,
      });
      continue;
    }

    // Parse check-in / check-out times (HH:MM) and combine with date
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    if (inRaw) {
      const t = parseTime(inRaw, dateParsed);
      if (!t) {
        failed++;
        errors.push({
          row: rowNo,
          error: `Invalid check-in time "${inRaw}". Use HH:MM (24h).`,
        });
        continue;
      }
      checkIn = t;
    }
    if (outRaw) {
      const t = parseTime(outRaw, dateParsed);
      if (!t) {
        failed++;
        errors.push({
          row: rowNo,
          error: `Invalid check-out time "${outRaw}". Use HH:MM (24h).`,
        });
        continue;
      }
      checkOut = t;
    }

    // Determine status
    let status = statusRaw;
    if (!status) {
      // Auto-derive if absent: late if check-in > 09:15, else PRESENT
      if (checkIn) {
        const cutoff = new Date(checkIn);
        cutoff.setHours(9, 15, 0, 0);
        status = checkIn.getTime() > cutoff.getTime() ? "LATE" : "PRESENT";
      } else {
        status = "ABSENT";
      }
    } else if (!VALID_STATUSES.has(status)) {
      failed++;
      errors.push({
        row: rowNo,
        error: `Unknown status "${statusRaw}". Must be one of: ${Array.from(VALID_STATUSES).join(", ")}.`,
      });
      continue;
    }

    // Compute workingHours, late, lateMinutes, overtime — mirrors
    // the existing POST /api/attendance logic.
    let workingHours: number | null = null;
    let late = false;
    let lateMinutes = 0;
    let overtime = 0;

    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      if (diffMs > 0) {
        workingHours = Math.round((diffMs / 3600000) * 100) / 100;
        if (workingHours > 9) {
          overtime = Math.round((workingHours - 9) * 100) / 100;
        }
      }
    }
    if (checkIn) {
      const cutoff = new Date(checkIn);
      cutoff.setHours(9, 15, 0, 0);
      if (checkIn.getTime() > cutoff.getTime()) {
        late = true;
        lateMinutes = Math.round(
          (checkIn.getTime() - cutoff.getTime()) / 60000
        );
      }
    }

    // Find existing record for (employee, calendar day)
    const dayStart = new Date(
      dateParsed.getFullYear(),
      dateParsed.getMonth(),
      dateParsed.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      dateParsed.getFullYear(),
      dateParsed.getMonth(),
      dateParsed.getDate(),
      23,
      59,
      59,
      999
    );

    try {
      const existing = await db.attendance.findFirst({
        where: {
          employeeId: emp.id,
          date: { gte: dayStart, lte: dayEnd },
        },
      });

      if (existing) {
        await db.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn,
            checkOut,
            workingHours,
            late,
            lateMinutes,
            overtime,
            status,
          },
        });
        updated++;
      } else {
        await db.attendance.create({
          data: {
            employeeId: emp.id,
            date: dayStart,
            checkIn,
            checkOut,
            workingHours,
            late,
            lateMinutes,
            overtime,
            status,
          },
        });
        imported++;
      }
    } catch (err: any) {
      failed++;
      errors.push({
        row: rowNo,
        error: `Database error: ${err?.message || "unknown"}`,
      });
    }
  }

  // Audit log (best-effort — never fail the response if logging fails)
  try {
    await db.auditLog.create({
      data: {
        action: "ATTENDANCE_IMPORT",
        entityType: "Attendance",
        description: `Imported ${imported} attendance record(s), updated ${updated}, failed ${failed}.`,
        metadata: JSON.stringify({
          imported,
          updated,
          failed,
          fileName: file.name,
          errorsCount: errors.length,
        }),
      },
    });
  } catch {
    // ignore audit-log write errors
  }

  return NextResponse.json({
    imported,
    updated,
    failed,
    errors,
  });
}

// =========================================================
// CSV parsing helpers (minimal RFC-4180-ish parser, no deps)
// =========================================================

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function parseCsv(text: string): ParsedCsv {
  // Normalise line endings
  const normalized = text.replace(/\r\n?/g, "\n");
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        records.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  // Last field/row if file doesn't end with newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  // Drop trailing empty rows (common when files end with newline)
  const cleaned = records.filter(
    (r) => r.length > 0 && r.some((c) => c.trim() !== "")
  );
  if (cleaned.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = cleaned[0].map((h) => h.trim());
  const rows = cleaned.slice(1).map((r) => {
    // Pad rows that have fewer columns than headers (treat missing as empty)
    const padded = [...r];
    while (padded.length < headers.length) padded.push("");
    return padded;
  });
  return { headers, rows };
}

function mapHeaders(headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const key = h.toLowerCase().trim();
    if (!(key in out)) out[key] = idx;
  });
  return out;
}

function parseDate(s: string): Date | null {
  // Accept YYYY-MM-DD (primary) or YYYY/MM/DD or DD-MM-YYYY (rare fallback).
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === mo - 1 &&
      dt.getDate() === d
    ) {
      return dt;
    }
    return null;
  }
  // DD-MM-YYYY
  const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) {
    const d = Number(m2[1]);
    const mo = Number(m2[2]);
    const y = Number(m2[3]);
    const dt = new Date(y, mo - 1, d);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === mo - 1 &&
      dt.getDate() === d
    ) {
      return dt;
    }
    return null;
  }
  return null;
}

function parseTime(s: string, baseDate: Date): Date | null {
  // Accept HH:MM or HH:MM:SS (24h). Also accept h:mm AM/PM as a courtesy.
  const trimmed = s.trim().toUpperCase();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const sec = ampm[3] ? Number(ampm[3]) : 0;
    if (ampm[4] === "PM" && h !== 12) h += 12;
    if (ampm[4] === "AM" && h === 12) h = 0;
    if (h > 23 || m > 59 || sec > 59) return null;
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      h,
      m,
      sec,
      0
    );
  }
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    const sec = m[3] ? Number(m[3]) : 0;
    if (h > 23 || min > 59 || sec > 59) return null;
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      h,
      min,
      sec,
      0
    );
  }
  return null;
}
