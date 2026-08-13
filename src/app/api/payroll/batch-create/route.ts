import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/payroll/batch-create
// Body: { employeeIds: string[], month: string }  // month = "2025-08"
//
// For each employee:
//   - Skip if a Payroll row already exists for (employeeId, payrollMonth)
//   - Otherwise load the employee's salary structure (basicSalary, allowances,
//     deductions, tax) and create a DRAFT Payroll record.
// Per-employee try/catch so one failure does not block the rest.
// A single AuditLog entry summarising the whole batch action is written at the end.
// Returns: { created, skipped, failed, count, totalRequested }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeIds, month } = body ?? ({} as any);

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json(
      { error: "employeeIds must be a non-empty array." },
      { status: 400 }
    );
  }
  if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month is required and must be in YYYY-MM format (e.g. 2025-08)." },
      { status: 400 }
    );
  }
  if (employeeIds.length > 500) {
    return NextResponse.json(
      { error: "Batch creation is capped at 500 employees per request." },
      { status: 400 }
    );
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  // Pre-load existing payroll rows for the requested month + requested employees
  // so we can decide skip-vs-create in one query rather than N queries.
  const existing = await db.payroll.findMany({
    where: {
      payrollMonth: month,
      employeeId: { in: employeeIds },
    },
    select: { employeeId: true },
  });
  const existingSet = new Set(existing.map((e) => e.employeeId));

  const created: any[] = [];
  const skipped: { employeeId: string; name: string; reason: string }[] = [];
  const failed: { employeeId: string; name: string; error: string }[] = [];

  for (const employeeId of employeeIds) {
    try {
      // Already have a payroll for this month? Skip without touching the DB.
      if (existingSet.has(employeeId)) {
        // Resolve name for the UI's skipped list (best-effort; ignore errors).
        let name = "(unknown)";
        try {
          const e = await db.employee.findUnique({
            where: { id: employeeId },
            select: { fullName: true },
          });
          if (e?.fullName) name = e.fullName;
        } catch {
          /* ignore */
        }
        skipped.push({
          employeeId,
          name,
          reason: "Payroll already exists for this month",
        });
        continue;
      }

      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: { department: true, designation: true },
      });
      if (!employee) {
        failed.push({
          employeeId,
          name: "(unknown)",
          error: "Employee not found",
        });
        continue;
      }

      const basic = Number(employee.basicSalary) || 0;
      const allowances = Number(employee.allowances) || 0;
      const deductions = Number(employee.deductions) || 0;
      const tax = Number(employee.tax) || 0;
      const netSalary = basic + allowances - deductions - tax;

      const payroll = await db.payroll.create({
        data: {
          employeeId: employee.id,
          payrollMonth: month,
          basicSalary: basic,
          allowances,
          deductions,
          tax,
          netSalary,
          paymentDate: null,
          status: "DRAFT",
          note: null,
        },
        include: {
          employee: { include: { department: true, designation: true } },
        },
      });

      await db.activity.create({
        data: {
          employeeId: employee.id,
          type: "CREATED",
          title: "Payroll Created (Batch)",
          description: `Payroll for ${month} created for ${employee.fullName} via batch creation.`,
          metadata: JSON.stringify({
            payrollId: payroll.id,
            month,
            batch: true,
          }),
        },
      });

      created.push(payroll);
    } catch (err: any) {
      failed.push({
        employeeId,
        name: "(unknown)",
        error: err?.message ?? "Unknown error",
      });
    }
  }

  // One audit log entry summarising the entire batch action.
  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "PAYROLL_BATCH_CREATE",
      entityType: "Payroll",
      description: `Batch created ${created.length} payroll record(s) for ${month}. ${skipped.length} skipped, ${failed.length} failed.`,
      metadata: JSON.stringify({
        month,
        requestedCount: employeeIds.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        createdEmployeeIds: created.map((c) => c.employeeId),
        skippedEmployeeIds: skipped.map((s) => s.employeeId),
        failedEmployeeIds: failed.map((f) => f.employeeId),
      }),
    },
  });

  return NextResponse.json(
    {
      created,
      skipped,
      failed,
      count: created.length,
      totalRequested: employeeIds.length,
    },
    { status: 201 }
  );
}
