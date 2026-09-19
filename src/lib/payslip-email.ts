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
} from "@/app/api/payroll/payslip-pdf/route";
import { getSmtpConfig, sendViaSmtp, textToEmailHtml } from "@/lib/mailer";

// ============================================================
// Shared payslip-email pipeline.
//
// Used by:
//   * POST /api/payroll/email-payslip      (single, HR may override fields)
//   * POST /api/payroll/email-payslips-batch (whole month, defaults only)
//
// Given an employee + month it: ensures a payroll row exists, computes the
// advanced breakdown, renders the payslip PDF, resolves recipient/subject/
// body (defaults overridable), delivers via SMTP (PDF attached) or falls
// back to a simulated send, and persists EmailLog + Activity + AuditLog.
// ============================================================

export interface PayslipEmailOptions {
  employeeId: string;
  month: string; // YYYY-MM
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  body?: string | null;
  /** Batch mode skips payroll auto-create for missing months (only emails existing APPROVED rows). */
  createPayrollIfMissing?: boolean;
  /** Skip Activity feed write in batch mode (would flood the feed). */
  writeActivity?: boolean;
}

export interface PayslipEmailResult {
  ok: boolean;
  status: number; // HTTP-style status for the caller
  error?: string;
  emailLogId?: string;
  documentNumber?: string;
  recipientTo?: string;
  subject?: string;
  attachmentName?: string;
  pdfSizeBytes?: number;
  mode?: "smtp" | "simulated";
  employeeName?: string;
}

function nextDocNumber(prefix: string | null, seq: number, padding: number) {
  const p = prefix ?? "BH";
  const padded = String(seq).padStart(padding, "0");
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  return `${p}/PAYSLIP/${y}${m}/${padded}`;
}

export async function sendPayslipEmail(
  opts: PayslipEmailOptions
): Promise<PayslipEmailResult> {
  const { employeeId, month } = opts;
  const createPayrollIfMissing = opts.createPayrollIfMissing !== false;
  const writeActivity = opts.writeActivity !== false;

  // 1. Load employee + company
  const [employee, company] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true },
    }),
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!employee) {
    return { ok: false, status: 404, error: "Employee not found", employeeName: undefined };
  }
  const employeeName = employee.fullName;

  // 2. Payroll row — reuse, or auto-create (single-send UX) / skip (batch)
  let payroll = await db.payroll.findFirst({
    where: { employeeId, payrollMonth: month },
  });
  if (!payroll) {
    if (!createPayrollIfMissing) {
      return {
        ok: false,
        status: 409,
        error: "No payroll record exists for this month",
        employeeName,
      };
    }
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

  // 3. Advanced payroll breakdown
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

  // 4. Doc number reference (counter NOT advanced — generate-payslip owns it)
  const numbering = await db.documentNumbering.findFirst({
    where: { name: "Default" },
  });
  const docNumber = nextDocNumber(
    numbering?.prefix ?? null,
    numbering?.nextSeq ?? 1,
    numbering?.padding ?? 4
  );

  // 5. PDF
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

  // 6. Recipient + subject + body
  const companyName = company?.name ?? "BH HR";
  const recipientTo =
    (opts.to && String(opts.to).trim()) ||
    employee.officialEmail ||
    employee.personalEmail ||
    "";
  if (!recipientTo) {
    return {
      ok: false,
      status: 400,
      error:
        "No recipient email could be resolved — the employee has no official or personal email on file.",
      employeeName,
    };
  }

  const monthLabel = fmtMonth(month);
  const finalSubject =
    (opts.subject && String(opts.subject).trim()) ||
    `Payslip for ${monthLabel} - ${companyName}`;

  const greeting = `Dear ${employee.fullName},`;
  const attachmentLine = `Please find attached your payslip for ${monthLabel}.`;
  const signatureLines = [
    "Regards,",
    companyName,
    company?.email ?? "",
    company?.phone ?? "",
  ].filter(Boolean);
  const defaultBody = [greeting, "", attachmentLine, "", ...signatureLines].join("\n");
  const finalBody = (opts.body && String(opts.body).trim()) || defaultBody;

  const attachmentName = `payslip-${slugify(employee.fullName)}-${month}.pdf`;
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  // 7. Link to an existing generated payslip document when present
  const payslipDoc = await db.generatedDocument.findFirst({
    where: { employeeId, month, type: "PAYSLIP" },
    orderBy: { createdAt: "desc" },
  });

  // 8. Deliver — SMTP with PDF attachment, or simulated fallback
  const smtp = await getSmtpConfig();
  let emailStatus: "SENT" | "FAILED" = "SENT";
  let deliveryNote: string;

  if (smtp) {
    const result = await sendViaSmtp(smtp, {
      to: recipientTo,
      cc: opts.cc?.trim() || null,
      bcc: opts.bcc?.trim() || null,
      subject: finalSubject,
      text: finalBody,
      html: textToEmailHtml(finalBody, {
        heading: `Payslip · ${monthLabel}`,
        footer: `Sent via BH HR · ${companyName}`,
      }),
      attachments: [
        {
          filename: attachmentName,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ],
    });
    if (result.delivered) {
      deliveryNote = `Delivered via SMTP (${smtp.host}:${smtp.port})${result.messageId ? ` · id ${result.messageId}` : ""}`;
    } else {
      emailStatus = "FAILED";
      deliveryNote = result.error ?? "SMTP delivery failed";
    }
  } else {
    deliveryNote = `Simulated send (no SMTP configured). ${pdfBuffer.length} byte PDF attachment generated.`;
  }

  const log = await db.emailLog.create({
    data: {
      documentId: payslipDoc?.id ?? null,
      employeeId: employee.id,
      recipientTo,
      recipientCc: opts.cc?.trim() || null,
      recipientBcc: opts.bcc?.trim() || null,
      subject: finalSubject,
      body: finalBody,
      attachmentName,
      status: emailStatus,
      errorMessage: emailStatus === "SENT" ? null : deliveryNote,
      sentById: user?.id ?? null,
      sentAt: new Date(),
    },
  });

  // 9. Activity + Audit (batch skips the activity feed to avoid flooding)
  if (writeActivity) {
    try {
      await db.activity.create({
        data: {
          employeeId: employee.id,
          type: emailStatus === "SENT" ? "EMAIL_SENT" : "EMAIL_FAILED",
          title: `Payslip emailed: ${monthLabel}`,
          description:
            emailStatus === "SENT"
              ? `Payslip for ${monthLabel} emailed to ${employee.fullName} (${recipientTo}). Attachment: ${attachmentName}.`
              : `Payslip email FAILED for ${monthLabel} (${recipientTo}): ${deliveryNote}`,
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
  }

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: emailStatus === "SENT" ? "PAYSLIP_EMAILED" : "EMAIL_FAILED",
      entityType: "Payroll",
      entityId: payroll.id,
      description:
        emailStatus === "SENT"
          ? `Emailed payslip for ${monthLabel} to ${employee.fullName} (${recipientTo}) — ${smtp ? "SMTP" : "simulated"}.`
          : `Failed to email payslip for ${monthLabel} to ${employee.fullName} (${recipientTo}): ${deliveryNote}`,
      metadata: JSON.stringify({
        employeeId,
        month,
        recipientTo,
        subject: finalSubject,
        attachmentName,
        emailLogId: log.id,
        documentId: payslipDoc?.id ?? null,
        docNumber,
        pdfSizeBytes: pdfBuffer.length,
        mode: smtp ? "smtp" : "simulated",
      }),
    },
  });

  if (emailStatus === "FAILED") {
    return {
      ok: false,
      status: 502,
      error: `SMTP delivery failed: ${deliveryNote}`,
      emailLogId: log.id,
      recipientTo,
      employeeName,
      mode: "smtp",
    };
  }

  return {
    ok: true,
    status: 201,
    emailLogId: log.id,
    documentNumber: docNumber,
    recipientTo,
    subject: finalSubject,
    attachmentName,
    pdfSizeBytes: pdfBuffer.length,
    mode: smtp ? "smtp" : "simulated",
    employeeName,
  };
}
