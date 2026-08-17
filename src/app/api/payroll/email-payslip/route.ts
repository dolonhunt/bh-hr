import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculatePayroll,
  loadTaxSlabs,
  loadPayrollSettings,
} from "@/lib/payroll-calc";
import {
  buildPayslipPdf,
  fmtMonth,
  slugify,
  type PayslipData,
} from "../payslip-pdf/route";

// =============================================================
// POST /api/payroll/email-payslip
// Body: { employeeId, month, to?, cc?, bcc?, subject?, body? }
//
// Generates the enhanced payslip PDF (re-using the same PDF builder
// as /api/payroll/payslip-pdf) and "emails" it to the employee.
// SMTP is not configured in this sandbox, so the send is simulated —
// but we persist an EmailLog with status="SENT" and the attachment
// name so the email-history view shows the payslip email record.
//
// Auto-fills:
//   To      → employee.officialEmail (fallback personalEmail)
//   Subject → "Payslip for {month} - {companyName}"
//   Body    → greeting + "Please find attached your payslip for {month}."
//             + signature (company name + sender)
// HR can override any of those fields via the body.
// =============================================================

function nextDocNumber(prefix: string | null, seq: number, padding: number) {
  const p = prefix ?? "BH";
  const padded = String(seq).padStart(padding, "0");
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  return `${p}/PAYSLIP/${y}${m}/${padded}`;
}

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
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }
  if (!month) {
    return NextResponse.json(
      { error: "month is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }

  // 1. Load employee + company + payroll (auto-create if missing)
  const [employee, company] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true },
    }),
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  let payroll = await db.payroll.findFirst({
    where: { employeeId, payrollMonth: month },
  });
  if (!payroll) {
    const net =
      Number(employee.basicSalary) +
      Number(employee.allowances) -
      Number(employee.deductions) -
      Number(employee.tax);
    payroll = await db.payroll.create({
      data: {
        employeeId,
        payrollMonth: month,
        basicSalary: Number(employee.basicSalary),
        allowances: Number(employee.allowances),
        deductions: Number(employee.deductions),
        tax: Number(employee.tax),
        netSalary: net,
        status: "DRAFT",
      },
    });
  }

  // 2. Compute the advanced payroll breakdown
  const [slabs, settings] = await Promise.all([
    loadTaxSlabs(),
    loadPayrollSettings(),
  ]);
  const breakdown = calculatePayroll({
    basicSalary: Number(employee.basicSalary),
    allowances: Number(employee.allowances),
    deductions: Number(employee.deductions),
    slabs,
    settings,
  });

  // 3. Build a doc number (do NOT advance the counter — this is just an email
  //    reference; the counter is bumped by the generate-payslip endpoint).
  const numbering = await db.documentNumbering.findFirst({
    where: { name: "Default" },
  });
  const seq = numbering?.nextSeq ?? 1;
  const padding = numbering?.padding ?? 4;
  const docNumber = nextDocNumber(numbering?.prefix ?? null, seq, padding);

  // 4. Build the PDF
  const data: PayslipData = {
    companyName: company?.name ?? "BH HR",
    companyAddress: company?.address ?? null,
    companyEmail: company?.email ?? null,
    companyPhone: company?.phone ?? null,
    employeeName: employee.fullName,
    employeeCode: employee.employeeId,
    department: employee.department?.name ?? null,
    designation: employee.designation?.name ?? null,
    month,
    paymentDate: payroll.paymentDate ?? null,
    breakdown,
    docNumber,
    generatedAt: new Date(),
  };
  const pdfBuffer = await buildPayslipPdf(data);

  // 5. Resolve auto-filled fields with HR overrides applied
  const companyName = company?.name ?? "BH HR";
  const recipientTo =
    (to && String(to).trim()) ||
    employee.officialEmail ||
    employee.personalEmail ||
    "";
  if (!recipientTo) {
    return NextResponse.json(
      {
        error:
          "No recipient email could be resolved — the employee has no official or personal email on file. Please provide a `to` value.",
      },
      { status: 400 }
    );
  }

  const monthLabel = fmtMonth(month);
  const finalSubject =
    (subject && String(subject).trim()) ||
    `Payslip for ${monthLabel} - ${companyName}`;

  const greeting = `Dear ${employee.fullName},`;
  const attachmentLine = `Please find attached your payslip for ${monthLabel}.`;
  const sigName = company?.name ?? "HR Team";
  const sigEmail = company?.email ?? "";
  const sigPhone = company?.phone ?? "";
  const signatureLines = [
    "Regards,",
    sigName,
    sigEmail,
    sigPhone,
  ].filter(Boolean);
  const defaultBody = [greeting, "", attachmentLine, "", ...signatureLines].join(
    "\n"
  );
  const finalBody = (emailBody && String(emailBody).trim()) || defaultBody;

  // 6. Attachment filename
  const attachmentName = `payslip-${slugify(employee.fullName)}-${month}.pdf`;

  // 7. Resolve the active user (for sentById + audit userId)
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  // 8. Check if a payslip GeneratedDocument already exists for this employee+month.
  //    If it does, link the email log to it; otherwise documentId stays null
  //    (the email is still logged with employeeId for traceability).
  const payslipDoc = await db.generatedDocument.findFirst({
    where: { employeeId, month, type: "PAYSLIP" },
    orderBy: { createdAt: "desc" },
  });

  // 9. Persist the EmailLog with status="SENT" (simulated send).
  const log = await db.emailLog.create({
    data: {
      documentId: payslipDoc?.id ?? null,
      employeeId: employee.id,
      recipientTo,
      recipientCc: cc?.trim() || null,
      recipientBcc: bcc?.trim() || null,
      subject: finalSubject,
      body: finalBody,
      attachmentName,
      status: "SENT",
      errorMessage: `Simulated send (no SMTP configured). ${pdfBuffer.length} byte PDF attachment generated.`,
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  // 10. Activity + Audit logs
  try {
    await db.activity.create({
      data: {
        employeeId: employee.id,
        type: "EMAIL_SENT",
        title: `Payslip emailed: ${monthLabel}`,
        description: `Payslip for ${monthLabel} emailed to ${employee.fullName} (${recipientTo}). Attachment: ${attachmentName}.`,
        metadata: JSON.stringify({
          employeeId,
          month,
          recipientTo,
          emailLogId: log.id,
          attachmentName,
          docNumber,
          documentId: payslipDoc?.id ?? null,
        }),
      },
    });
  } catch {
    // non-fatal
  }

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "PAYSLIP_EMAILED",
      entityType: "Payroll",
      entityId: payroll.id,
      description: `Emailed payslip for ${monthLabel} to ${employee.fullName} (${recipientTo}).`,
      metadata: JSON.stringify({
        employeeId,
        month,
        recipientTo,
        recipientCc: cc?.trim() || null,
        recipientBcc: bcc?.trim() || null,
        subject: finalSubject,
        attachmentName,
        emailLogId: log.id,
        documentId: payslipDoc?.id ?? null,
        docNumber,
        pdfSizeBytes: pdfBuffer.length,
      }),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      emailLogId: log.id,
      documentNumber: docNumber,
      recipientTo,
      subject: finalSubject,
      attachmentName,
      pdfSizeBytes: pdfBuffer.length,
    },
    { status: 201 }
  );
}
