import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculatePayroll,
  loadTaxSlabs,
  loadPayrollSettings,
} from "@/lib/payroll-calc";

// =============================================================
// POST /api/payroll/calculate
// Body: { employeeId, month, basicSalary?, allowances?, deductions? }
//
// Returns a full payroll breakdown for the given employee/month,
// including HRA, special allowance, PF, professional tax, progressive
// TDS, gratuity (employer contribution — informational), and net salary.
// =============================================================

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

  const employeeId = String(body.employeeId ?? "").trim();
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }
  const month = String(body.month ?? "").trim();
  if (!month) {
    return NextResponse.json(
      { error: "month is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }

  // Load employee
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, designation: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  // Resolve inputs — body overrides employee fields
  const basicSalary =
    body.basicSalary !== undefined && body.basicSalary !== null
      ? Number(body.basicSalary)
      : Number(employee.basicSalary ?? 0);
  const allowances =
    body.allowances !== undefined && body.allowances !== null
      ? Number(body.allowances)
      : Number(employee.allowances ?? 0);
  const deductions =
    body.deductions !== undefined && body.deductions !== null
      ? Number(body.deductions)
      : Number(employee.deductions ?? 0);

  if (!Number.isFinite(basicSalary) || basicSalary < 0) {
    return NextResponse.json(
      { error: "basicSalary must be a non-negative number" },
      { status: 400 }
    );
  }

  // Load tax slabs + payroll settings
  const [slabs, settings] = await Promise.all([
    loadTaxSlabs(),
    loadPayrollSettings(),
  ]);

  const breakdown = calculatePayroll({
    basicSalary,
    allowances,
    deductions,
    slabs,
    settings,
  });

  return NextResponse.json({
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      department: employee.department?.name ?? null,
      designation: employee.designation?.name ?? null,
    },
    month,
    ...breakdown,
  });
}
