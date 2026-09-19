import { NextRequest, NextResponse } from "next/server";
import { sendPayslipEmail } from "@/lib/payslip-email";

// =============================================================
// POST /api/payroll/email-payslip
// Body: { employeeId, month, to?, cc?, bcc?, subject?, body? }
//
// Thin wrapper around the shared pipeline in src/lib/payslip-email.ts
// (which is also used by the batch endpoint). Generates the enhanced
// payslip PDF and emails it to the employee — real SMTP with the PDF
// attached when configured, simulated (but fully logged) otherwise.
//
// Auto-fills (HR can override any field):
//   To      → employee.officialEmail (fallback personalEmail)
//   Subject → "Payslip for {month} - {companyName}"
//   Body    → greeting + attachment line + company signature
// =============================================================

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    employeeId,
    month,
    to,
    cc,
    bcc,
    subject,
    body: emailBody,
  } = body as {
    employeeId: string;
    month: string;
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
  };

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }
  if (!month) {
    return NextResponse.json(
      { error: "month is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }

  const result = await sendPayslipEmail({
    employeeId,
    month,
    to,
    cc,
    bcc,
    subject,
    body: emailBody,
    createPayrollIfMissing: true,
    writeActivity: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, emailLogId: result.emailLogId, mode: result.mode },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      emailLogId: result.emailLogId,
      documentNumber: result.documentNumber,
      recipientTo: result.recipientTo,
      subject: result.subject,
      attachmentName: result.attachmentName,
      pdfSizeBytes: result.pdfSizeBytes,
      mode: result.mode,
    },
    { status: 201 }
  );
}
