import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// GET /api/backup/export
// Returns a JSON backup of every table in the database.
// Excludes User.password for security.
// Structure:
//   { version: 1, exportedAt, tables: { employees: [...], departments: [...], ... } }
// ============================================================

export async function GET() {
  const [
    users,
    company,
    departments,
    roles,
    designations,
    leaveTypes,
    employees,
    attendance,
    leaveRequests,
    payrolls,
    documentTemplates,
    generatedDocuments,
    emailLogs,
    emailSettings,
    performances,
    jobs,
    candidates,
    activities,
    auditLogs,
    documentNumbering,
    settings,
  ] = await Promise.all([
    db.user.findMany(),
    db.company.findMany(),
    db.department.findMany(),
    db.role.findMany(),
    db.designation.findMany(),
    db.leaveType.findMany(),
    db.employee.findMany(),
    db.attendance.findMany(),
    db.leaveRequest.findMany(),
    db.payroll.findMany(),
    db.documentTemplate.findMany(),
    db.generatedDocument.findMany(),
    db.emailLog.findMany(),
    db.emailSetting.findMany(),
    db.performance.findMany(),
    db.job.findMany(),
    db.candidate.findMany(),
    db.activity.findMany(),
    db.auditLog.findMany(),
    db.documentNumbering.findMany(),
    db.setting.findMany(),
  ]);

  // Strip passwords from user rows.
  const safeUsers = users.map(({ password, ...rest }) => rest);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users: safeUsers,
      company,
      departments,
      roles,
      designations,
      leaveTypes,
      employees,
      attendance,
      leaveRequests,
      payrolls,
      documentTemplates,
      generatedDocuments,
      emailLogs,
      emailSettings,
      performances,
      jobs,
      candidates,
      activities,
      auditLogs,
      documentNumbering,
      settings,
    },
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `teamhub-backup-${dateStr}.json`;

  // Record export time in Setting table so UI can show last backup date.
  try {
    const existing = await db.setting.findUnique({
      where: { key: "lastBackupAt" },
    });
    if (existing) {
      await db.setting.update({
        where: { key: "lastBackupAt" },
        data: { value: new Date().toISOString() },
      });
    } else {
      await db.setting.create({
        data: { key: "lastBackupAt", value: new Date().toISOString() },
      });
    }
  } catch {
    // non-fatal
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
