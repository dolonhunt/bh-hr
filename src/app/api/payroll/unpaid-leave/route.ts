import { NextRequest, NextResponse } from "next/server";
import { computeLop } from "@/lib/lop";

// GET /api/payroll/unpaid-leave?employeeId=...&month=YYYY-MM
//
// Holiday/weekend-aware preview of unpaid-leave (LOP) numbers for the
// payroll dialog: working days in month, approved unpaid leave days
// inside the month, per-day rate and the suggested deduction.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const month = searchParams.get("month") || "";

  if (!employeeId || !month) {
    return NextResponse.json(
      { error: "employeeId and month are required" },
      { status: 400 }
    );
  }

  const lop = await computeLop(employeeId, month);
  if (!lop) {
    return NextResponse.json(
      { error: "Employee not found or invalid month (expected YYYY-MM)" },
      { status: 404 }
    );
  }

  return NextResponse.json(lop);
}
