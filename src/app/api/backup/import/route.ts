import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// POST /api/backup/import
// Accepts a JSON backup body and upserts all records by ID.
// Returns: { imported: { employees: N, ... }, errors: [...] }
// Also creates an AuditLog: action="DATA_RESTORE".
// ============================================================

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !body.tables) {
    return NextResponse.json(
      { error: "Invalid backup structure: missing `tables` object" },
      { status: 400 }
    );
  }

  const tables = body.tables as Record<string, any[]>;
  const version =
    typeof body.version === "number" ? body.version : "unknown";
  const exportedAt =
    typeof body.exportedAt === "string"
      ? body.exportedAt
      : "unknown date";

  const imported: Record<string, number> = {};
  const errors: { table: string; message: string; count?: number }[] = [];

  // Helper: upsert every row in a table, counting successes.
  async function importTable<T extends { id: string }>(
    name: string,
    rows: T[],
    upsertFn: (row: T) => Promise<any>
  ) {
    let count = 0;
    let lastErr: string | null = null;
    let errCount = 0;
    for (const row of rows) {
      try {
        if (!row || typeof row !== "object" || !row.id) {
          errCount++;
          lastErr = "row missing id";
          continue;
        }
        await upsertFn(row);
        count++;
      } catch (e: any) {
        errCount++;
        lastErr = e?.message ?? String(e);
      }
    }
    imported[name] = count;
    if (errCount > 0) {
      errors.push({
        table: name,
        count: errCount,
        message: lastErr ?? "unknown error",
      });
    }
  }

  // ------------------------------------------------------------
  // Phase 1 — independent / parent tables
  // ------------------------------------------------------------
  try {
    await importTable("users", asArray(tables.users), async (u: any) => {
      const { password, ...safe } = u;
      // Don't overwrite password with undefined; keep existing password if present.
      await db.user.upsert({
        where: { id: u.id },
        create: {
          ...safe,
          password: password ?? cryptoRandom(),
        },
        update: {
          email: safe.email,
          name: safe.name,
          role: safe.role,
          avatar: safe.avatar,
        },
      });
    });
  } catch (e: any) {
    errors.push({ table: "users", message: e?.message ?? String(e) });
    imported.users = imported.users ?? 0;
  }

  try {
    await importTable("company", asArray(tables.company), async (c: any) =>
      db.company.upsert({
        where: { id: c.id },
        create: { ...c },
        update: { ...c },
      })
    );
  } catch (e: any) {
    errors.push({ table: "company", message: e?.message ?? String(e) });
    imported.company = imported.company ?? 0;
  }

  try {
    await importTable(
      "departments",
      asArray(tables.departments),
      async (d: any) =>
        db.department.upsert({
          where: { id: d.id },
          create: { ...d },
          update: { ...d },
        })
    );
  } catch (e: any) {
    errors.push({ table: "departments", message: e?.message ?? String(e) });
    imported.departments = imported.departments ?? 0;
  }

  try {
    await importTable("roles", asArray(tables.roles), async (r: any) =>
      db.role.upsert({
        where: { id: r.id },
        create: { ...r },
        update: { ...r },
      })
    );
  } catch (e: any) {
    errors.push({ table: "roles", message: e?.message ?? String(e) });
    imported.roles = imported.roles ?? 0;
  }

  try {
    await importTable(
      "designations",
      asArray(tables.designations),
      async (d: any) =>
        db.designation.upsert({
          where: { id: d.id },
          create: { ...d },
          update: { ...d },
        })
    );
  } catch (e: any) {
    errors.push({ table: "designations", message: e?.message ?? String(e) });
    imported.designations = imported.designations ?? 0;
  }

  try {
    await importTable(
      "leaveTypes",
      asArray(tables.leaveTypes),
      async (l: any) =>
        db.leaveType.upsert({
          where: { id: l.id },
          create: { ...l },
          update: { ...l },
        })
    );
  } catch (e: any) {
    errors.push({ table: "leaveTypes", message: e?.message ?? String(e) });
    imported.leaveTypes = imported.leaveTypes ?? 0;
  }

  try {
    await importTable(
      "documentTemplates",
      asArray(tables.documentTemplates),
      async (t: any) =>
        db.documentTemplate.upsert({
          where: { id: t.id },
          create: { ...t },
          update: { ...t },
        })
    );
  } catch (e: any) {
    errors.push({
      table: "documentTemplates",
      message: e?.message ?? String(e),
    });
    imported.documentTemplates = imported.documentTemplates ?? 0;
  }

  try {
    await importTable(
      "emailSettings",
      asArray(tables.emailSettings),
      async (e: any) =>
        db.emailSetting.upsert({
          where: { id: e.id },
          create: { ...e },
          update: { ...e },
        })
    );
  } catch (e: any) {
    errors.push({ table: "emailSettings", message: e?.message ?? String(e) });
    imported.emailSettings = imported.emailSettings ?? 0;
  }

  try {
    await importTable(
      "documentNumbering",
      asArray(tables.documentNumbering),
      async (d: any) =>
        db.documentNumbering.upsert({
          where: { id: d.id },
          create: { ...d },
          update: { ...d },
        })
    );
  } catch (e: any) {
    errors.push({
      table: "documentNumbering",
      message: e?.message ?? String(e),
    });
    imported.documentNumbering = imported.documentNumbering ?? 0;
  }

  try {
    await importTable("settings", asArray(tables.settings), async (s: any) =>
      db.setting.upsert({
        where: { key: s.key },
        create: { ...s },
        update: { value: s.value },
      })
    );
  } catch (e: any) {
    errors.push({ table: "settings", message: e?.message ?? String(e) });
    imported.settings = imported.settings ?? 0;
  }

  try {
    await importTable("jobs", asArray(tables.jobs), async (j: any) =>
      db.job.upsert({
        where: { id: j.id },
        create: { ...j },
        update: { ...j },
      })
    );
  } catch (e: any) {
    errors.push({ table: "jobs", message: e?.message ?? String(e) });
    imported.jobs = imported.jobs ?? 0;
  }

  // ------------------------------------------------------------
  // Phase 2 — Employee (depends on Department/Role/Designation)
  // ------------------------------------------------------------
  try {
    await importTable("employees", asArray(tables.employees), async (e: any) => {
      // Drop relational fields (Prisma will refuse nested writes here).
      const {
        department,
        role,
        designation,
        manager,
        subordinates,
        attendance,
        leaveRequests,
        payrolls,
        documents,
        performances,
        activities,
        jobsApplied,
        ...rest
      } = e;
      await db.employee.upsert({
        where: { id: e.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "employees", message: e?.message ?? String(e) });
    imported.employees = imported.employees ?? 0;
  }

  // ------------------------------------------------------------
  // Phase 3 — Employee-dependent tables
  // ------------------------------------------------------------
  try {
    await importTable("attendance", asArray(tables.attendance), async (a: any) => {
      const { employee, ...rest } = a;
      await db.attendance.upsert({
        where: { id: a.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "attendance", message: e?.message ?? String(e) });
    imported.attendance = imported.attendance ?? 0;
  }

  try {
    await importTable(
      "leaveRequests",
      asArray(tables.leaveRequests),
      async (l: any) => {
        const { employee, leaveType, ...rest } = l;
        await db.leaveRequest.upsert({
          where: { id: l.id },
          create: { ...rest },
          update: { ...rest },
        });
      }
    );
  } catch (e: any) {
    errors.push({ table: "leaveRequests", message: e?.message ?? String(e) });
    imported.leaveRequests = imported.leaveRequests ?? 0;
  }

  try {
    await importTable("payrolls", asArray(tables.payrolls), async (p: any) => {
      const { employee, ...rest } = p;
      await db.payroll.upsert({
        where: { id: p.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "payrolls", message: e?.message ?? String(e) });
    imported.payrolls = imported.payrolls ?? 0;
  }

  try {
    await importTable(
      "generatedDocuments",
      asArray(tables.generatedDocuments),
      async (g: any) => {
        const { employee, template, emailLogs, generatedBy, ...rest } = g;
        await db.generatedDocument.upsert({
          where: { id: g.id },
          create: { ...rest },
          update: { ...rest },
        });
      }
    );
  } catch (e: any) {
    errors.push({
      table: "generatedDocuments",
      message: e?.message ?? String(e),
    });
    imported.generatedDocuments = imported.generatedDocuments ?? 0;
  }

  try {
    await importTable(
      "performances",
      asArray(tables.performances),
      async (p: any) => {
        const { employee, ...rest } = p;
        await db.performance.upsert({
          where: { id: p.id },
          create: { ...rest },
          update: { ...rest },
        });
      }
    );
  } catch (e: any) {
    errors.push({ table: "performances", message: e?.message ?? String(e) });
    imported.performances = imported.performances ?? 0;
  }

  try {
    await importTable("candidates", asArray(tables.candidates), async (c: any) => {
      const { job, employee, ...rest } = c;
      await db.candidate.upsert({
        where: { id: c.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "candidates", message: e?.message ?? String(e) });
    imported.candidates = imported.candidates ?? 0;
  }

  try {
    await importTable("activities", asArray(tables.activities), async (a: any) => {
      const { employee, ...rest } = a;
      await db.activity.upsert({
        where: { id: a.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "activities", message: e?.message ?? String(e) });
    imported.activities = imported.activities ?? 0;
  }

  try {
    await importTable("emailLogs", asArray(tables.emailLogs), async (l: any) => {
      const { document, sentBy, ...rest } = l;
      await db.emailLog.upsert({
        where: { id: l.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "emailLogs", message: e?.message ?? String(e) });
    imported.emailLogs = imported.emailLogs ?? 0;
  }

  try {
    await importTable("auditLogs", asArray(tables.auditLogs), async (a: any) => {
      const { user, ...rest } = a;
      await db.auditLog.upsert({
        where: { id: a.id },
        create: { ...rest },
        update: { ...rest },
      });
    });
  } catch (e: any) {
    errors.push({ table: "auditLogs", message: e?.message ?? String(e) });
    imported.auditLogs = imported.auditLogs ?? 0;
  }

  // ------------------------------------------------------------
  // Audit log entry
  // ------------------------------------------------------------
  try {
    await db.auditLog.create({
      data: {
        action: "DATA_RESTORE",
        entityType: "Backup",
        description: `Restored backup from ${exportedAt} (version ${version})`,
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    imported,
    errors,
    meta: { version, exportedAt, restoredAt: new Date().toISOString() },
  });
}

function cryptoRandom(): string {
  // Fallback password when a backup user row is missing one.
  // (We never want to wipe an existing user's password with empty.)
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
