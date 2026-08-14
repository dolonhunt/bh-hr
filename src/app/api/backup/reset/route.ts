import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// POST /api/backup/reset?confirm=DELETE
// Clears ALL tables except Users and Company. The `confirm` query
// param must equal the literal string "DELETE".
// Returns counts of deleted rows per table.
// ============================================================

export async function POST(req: Request) {
  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm");

  if (confirm !== "DELETE") {
    return NextResponse.json(
      {
        error:
          'Confirmation required. Pass ?confirm=DELETE to acknowledge this destructive action.',
      },
      { status: 400 }
    );
  }

  // Delete in dependency order (children first, parents last).
  // Users and Company are preserved.
  const result: Record<string, number> = {};

  try {
    result.emailLogs = await db.emailLog.count();
    await db.emailLog.deleteMany();
  } catch (e: any) {
    result.emailLogsError = e?.message;
  }
  try {
    result.auditLogs = await db.auditLog.count();
    await db.auditLog.deleteMany();
  } catch (e: any) {
    result.auditLogsError = e?.message;
  }
  try {
    result.activities = await db.activity.count();
    await db.activity.deleteMany();
  } catch (e: any) {
    result.activitiesError = e?.message;
  }
  try {
    result.candidates = await db.candidate.count();
    await db.candidate.deleteMany();
  } catch (e: any) {
    result.candidatesError = e?.message;
  }
  try {
    result.jobs = await db.job.count();
    await db.job.deleteMany();
  } catch (e: any) {
    result.jobsError = e?.message;
  }
  try {
    result.performances = await db.performance.count();
    await db.performance.deleteMany();
  } catch (e: any) {
    result.performancesError = e?.message;
  }
  try {
    result.generatedDocuments = await db.generatedDocument.count();
    await db.generatedDocument.deleteMany();
  } catch (e: any) {
    result.generatedDocumentsError = e?.message;
  }
  try {
    result.payrolls = await db.payroll.count();
    await db.payroll.deleteMany();
  } catch (e: any) {
    result.payrollsError = e?.message;
  }
  try {
    result.leaveRequests = await db.leaveRequest.count();
    await db.leaveRequest.deleteMany();
  } catch (e: any) {
    result.leaveRequestsError = e?.message;
  }
  try {
    result.attendance = await db.attendance.count();
    await db.attendance.deleteMany();
  } catch (e: any) {
    result.attendanceError = e?.message;
  }
  try {
    result.employees = await db.employee.count();
    await db.employee.deleteMany();
  } catch (e: any) {
    result.employeesError = e?.message;
  }
  try {
    result.candidates2 = await db.candidate.count();
    await db.candidate.deleteMany();
  } catch {
    // Already tried above; safety net for employees whose `employeeId` link was broken.
  }
  try {
    result.documentTemplates = await db.documentTemplate.count();
    await db.documentTemplate.deleteMany();
  } catch (e: any) {
    result.documentTemplatesError = e?.message;
  }
  try {
    result.designations = await db.designation.count();
    await db.designation.deleteMany();
  } catch (e: any) {
    result.designationsError = e?.message;
  }
  try {
    result.leaveTypes = await db.leaveType.count();
    await db.leaveType.deleteMany();
  } catch (e: any) {
    result.leaveTypesError = e?.message;
  }
  try {
    result.roles = await db.role.count();
    await db.role.deleteMany();
  } catch (e: any) {
    result.rolesError = e?.message;
  }
  try {
    result.departments = await db.department.count();
    await db.department.deleteMany();
  } catch (e: any) {
    result.departmentsError = e?.message;
  }
  try {
    result.emailSettings = await db.emailSetting.count();
    await db.emailSetting.deleteMany();
  } catch (e: any) {
    result.emailSettingsError = e?.message;
  }
  try {
    result.documentNumbering = await db.documentNumbering.count();
    await db.documentNumbering.deleteMany();
  } catch (e: any) {
    result.documentNumberingError = e?.message;
  }
  try {
    result.settings = await db.setting.count();
    await db.setting.deleteMany();
  } catch (e: any) {
    result.settingsError = e?.message;
  }

  // Record audit entry (User table is preserved so it's safe to log here).
  try {
    await db.auditLog.create({
      data: {
        action: "DATA_RESET",
        entityType: "Backup",
        description: "Reset all data (except Users and Company)",
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, deleted: result });
}
