import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import PDFDocument from "pdfkit";
import {
  calculatePayroll,
  loadTaxSlabs,
  loadPayrollSettings,
  type PayrollBreakdown,
} from "@/lib/payroll-calc";

// =============================================================
// Enhanced Payslip PDF generator
// =============================================================
//
// GET /api/payroll/payslip-pdf?employeeId=&month=
//
// Generates a professional A4 portrait payslip PDF using the advanced
// payroll calculation (HRA, special allowance, PF, professional tax,
// progressive-slab TDS, gratuity) from /src/lib/payroll-calc.ts.
//
// Layout:
//   1. Header — Company name, address, "PAYSLIP" title, month/year.
//   2. Employee info table — Name, ID, Department, Designation, Pay
//      Period, Payment Date.
//   3. Earnings table — Basic, HRA, Special Allowance, Gross.
//   4. Deductions table — PF, PT, TDS (with slab note), Total.
//   5. Net Salary — large, bold, emerald.
//   6. Employer contributions note — Gratuity.
//   7. Footer — computer-generated note + document number + date.

// ---- Color palette (emerald primary, no indigo/blue) ----
const C = {
  primary: "10b981", // emerald-500
  primaryDark: "047857", // emerald-700
  primaryLight: "a7f3d0", // emerald-200
  primaryBg: "ecfdf5", // emerald-50
  text: "1f2937", // gray-800
  textMuted: "6b7280", // gray-500
  textSubtle: "9ca3af", // gray-400
  border: "d1d5db", // gray-300
  borderLight: "e5e7eb", // gray-200
  rowAlt: "f9fafb", // gray-50
  rose: "be123c", // rose-700
  roseLight: "fff1f2", // rose-50
  amber: "92400e", // amber-800
};

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "৳0";
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)}`;
}

export function fmtMonth(m: string): string {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  if (!y || !mm) return m;
  const d = new Date(Number(y), Number(mm) - 1, 1);
  if (isNaN(d.getTime())) return m;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// =============================================================
// PDF builder
// =============================================================

export interface PayslipData {
  companyName: string;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  employeeName: string;
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  month: string;
  paymentDate: Date | null;
  breakdown: PayrollBreakdown;
  docNumber: string;
  generatedAt: Date;
}

/** Build the enhanced payslip PDF buffer from a PayslipData object. Exported
 * so other routes (e.g. /api/payroll/email-payslip) can reuse the exact same
 * PDF generation logic instead of duplicating it. */
export async function buildPayslipPdf(data: PayslipData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      // A4 portrait
      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Payslip - ${data.employeeName} - ${data.month}`,
          Author: data.companyName,
          Subject: `Payslip for ${fmtMonth(data.month)}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width; // 595.28
      const pageHeight = doc.page.height; // 841.89
      const margin = 50;
      const contentWidth = pageWidth - margin * 2; // 495.28

      // =====================================================
      // 1. Header band (emerald background)
      // =====================================================
      const headerH = 80;
      doc
        .rect(0, 0, pageWidth, headerH)
        .fillColor(C.primaryDark)
        .fill();

      // Company name (left)
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#ffffff")
        .text(data.companyName.toUpperCase(), margin, 22, {
          width: contentWidth / 2 - 10,
          align: "left",
        });
      // Company address
      if (data.companyAddress) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#d1fae5")
          .text(data.companyAddress, margin, 46, {
            width: contentWidth / 2 - 10,
            align: "left",
            lineGap: 0,
          });
      }
      // Contact line
      const contactBits: string[] = [];
      if (data.companyEmail) contactBits.push(data.companyEmail);
      if (data.companyPhone) contactBits.push(data.companyPhone);
      if (contactBits.length > 0) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#d1fae5")
          .text(contactBits.join("  ·  "), margin, 62, {
            width: contentWidth / 2 - 10,
            align: "left",
          });
      }

      // "PAYSLIP" title (right)
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor("#ffffff")
        .text("PAYSLIP", margin + contentWidth / 2, 18, {
          width: contentWidth / 2 - 10,
          align: "right",
        });
      // Month/year
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#d1fae5")
        .text(fmtMonth(data.month), margin + contentWidth / 2, 50, {
          width: contentWidth / 2 - 10,
          align: "right",
        });
      // Document number
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#a7f3d0")
        .text(`Doc: ${data.docNumber}`, margin + contentWidth / 2, 66, {
          width: contentWidth / 2 - 10,
          align: "right",
        });

      let y = headerH + 20;

      // =====================================================
      // 2. Employee info table — 2 columns × 3 rows of label/value
      // =====================================================
      const infoRows: [string, string][] = [
        ["Employee Name", data.employeeName],
        ["Employee ID", data.employeeCode ?? "—"],
        ["Department", data.department ?? "—"],
        ["Designation", data.designation ?? "—"],
        ["Pay Period", fmtMonth(data.month)],
        ["Payment Date", data.paymentDate ? fmtDate(data.paymentDate) : "Pending"],
      ];

      const infoRowH = 20;
      const infoTableH = (infoRows.length / 2) * infoRowH;
      drawInfoTable(doc, margin, y, contentWidth, infoRows, infoRowH);
      y += infoTableH + 24;

      // =====================================================
      // 3. Earnings + Deductions side-by-side
      // =====================================================
      const colW = (contentWidth - 16) / 2; // 8px gap each side
      const earningsX = margin;
      const deductionsX = margin + colW + 16;

      const earningsRows: [string, string][] = [
        ["Basic Salary", fmtMoney(data.breakdown.basicSalary)],
        ["House Rent Allowance", fmtMoney(data.breakdown.hra)],
        ["Special Allowance", fmtMoney(data.breakdown.specialAllowance)],
      ];
      const earningsTotal: [string, string] = [
        "Gross Salary",
        fmtMoney(data.breakdown.grossSalary),
      ];

      const slabNote = data.breakdown.taxSlab
        ? ` (${Math.round(data.breakdown.taxSlab.rate * 100)}% — ${data.breakdown.taxSlab.label})`
        : "";
      const deductionRows: [string, string][] = [
        ["Provident Fund (PF)", `-${fmtMoney(data.breakdown.pf)}`],
        ["Professional Tax", `-${fmtMoney(data.breakdown.professionalTax)}`],
        [`TDS${slabNote}`, `-${fmtMoney(data.breakdown.tds)}`],
      ];
      if (data.breakdown.customDeductions > 0) {
        deductionRows.push([
          "Other Deductions",
          `-${fmtMoney(data.breakdown.customDeductions)}`,
        ]);
      }
      const deductionTotal: [string, string] = [
        "Total Deductions",
        `-${fmtMoney(data.breakdown.totalDeductions)}`,
      ];

      // Earnings table
      drawSectionTable(
        doc,
        earningsX,
        y,
        colW,
        "EARNINGS",
        earningsRows,
        earningsTotal,
        C.primary,
        false
      );
      // Deductions table
      drawSectionTable(
        doc,
        deductionsX,
        y,
        colW,
        "DEDUCTIONS",
        deductionRows,
        deductionTotal,
        C.rose,
        true
      );

      // Compute height of the taller of the two tables for next baseline
      const earningsH = sectionTableHeight(earningsRows.length);
      const deductionsH = sectionTableHeight(deductionRows.length);
      y += Math.max(earningsH, deductionsH) + 16;

      // =====================================================
      // 4. Net Salary highlight box (full-width, emerald)
      // =====================================================
      const netBoxH = 48;
      doc
        .rect(margin, y, contentWidth, netBoxH)
        .fillColor(C.primaryBg)
        .fill();
      // Left emerald accent bar
      doc
        .rect(margin, y, 6, netBoxH)
        .fillColor(C.primaryDark)
        .fill();
      // Border around net box
      doc
        .rect(margin, y, contentWidth, netBoxH)
        .strokeColor(C.primary)
        .lineWidth(0.75)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.primaryDark)
        .text("NET SALARY (Take-home)", margin + 18, y + 9, {
          width: contentWidth - 200,
          align: "left",
        });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.textMuted)
        .text("Amount credited to employee bank account", margin + 18, y + 26, {
          width: contentWidth - 200,
          align: "left",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(C.primaryDark)
        .text(
          fmtMoney(data.breakdown.netSalary),
          margin + contentWidth - 200,
          y + 12,
          { width: 188, align: "right" }
        );

      y += netBoxH + 20;

      // =====================================================
      // 5. Employer contributions note (gratuity)
      // =====================================================
      const noteBoxH = 56;
      doc
        .rect(margin, y, contentWidth, noteBoxH)
        .fillColor("#fafafa")
        .fill();
      doc
        .rect(margin, y, contentWidth, noteBoxH)
        .strokeColor(C.borderLight)
        .lineWidth(0.5)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(C.text)
        .text("Employer Contributions", margin + 12, y + 8, {
          width: contentWidth - 24,
          align: "left",
        });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.textMuted)
        .text(
          "Gratuity (4.81% of basic) — paid by employer, not deducted from employee salary.",
          margin + 12,
          y + 24,
          { width: contentWidth - 200, align: "left" }
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.textMuted)
        .text(
          fmtMoney(data.breakdown.gratuity),
          margin + contentWidth - 100,
          y + 22,
          { width: 88, align: "right" }
        );

      y += noteBoxH + 20;

      // =====================================================
      // 6. TDS slab breakdown (optional, small)
      // =====================================================
      if (data.breakdown.tdsBreakdown.length > 0) {
        const slabBoxH = 24 + data.breakdown.tdsBreakdown.length * 14 + 8;
        doc
          .rect(margin, y, contentWidth, slabBoxH)
          .fillColor("#ffffff")
          .fill();
        doc
          .rect(margin, y, contentWidth, slabBoxH)
          .strokeColor(C.borderLight)
          .lineWidth(0.5)
          .stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(C.text)
          .text("TDS Slab Breakdown (annual)", margin + 12, y + 8, {
            width: contentWidth - 24,
            align: "left",
          });
        let sy = y + 24;
        for (const row of data.breakdown.tdsBreakdown) {
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(C.textMuted)
            .text(row.slabLabel, margin + 12, sy, {
              width: 200,
              align: "left",
            });
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(C.textMuted)
            .text(
              `${Math.round(row.rate * 100)}% of ${fmtMoney(row.taxableAmountInSlab)}`,
              margin + 220,
              sy,
              { width: 180, align: "left" }
            );
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(C.rose)
            .text(fmtMoney(row.taxForSlab), margin + contentWidth - 80, sy, {
              width: 68,
              align: "right",
            });
          sy += 14;
        }
        y += slabBoxH + 20;
      }

      // =====================================================
      // 7. Footer (computer-generated note + doc number + date)
      // =====================================================
      const footerY = pageHeight - 70;
      // Separator line
      doc
        .moveTo(margin, footerY)
        .lineTo(pageWidth - margin, footerY)
        .strokeColor(C.borderLight)
        .lineWidth(0.5)
        .stroke();
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor(C.textSubtle)
        .text(
          "This is a computer-generated payslip and does not require a signature.",
          margin,
          footerY + 8,
          { width: contentWidth, align: "center" }
        );
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(C.textSubtle)
        .text(
          `Document No: ${data.docNumber}  ·  Generated on ${fmtDate(data.generatedAt)}`,
          margin,
          footerY + 22,
          { width: contentWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// =============================================================
// Helpers — table drawers
// =============================================================

function drawInfoTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  rows: [string, string][],
  rowH: number
) {
  // Outer border
  doc
    .rect(x, y, width, (rows.length / 2) * rowH)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();

  const colW = width / 2;
  const labelW = colW * 0.4;
  const valueW = colW * 0.6;

  for (let i = 0; i < rows.length; i++) {
    const colIdx = i % 2;
    const rowIdx = Math.floor(i / 2);
    const cx = x + colIdx * colW;
    const cy = y + rowIdx * rowH;

    // Label cell background
    doc.rect(cx, cy, labelW, rowH).fillColor("#f3f4f6").fill();
    // Label text
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.textMuted)
      .text(rows[i][0].toUpperCase(), cx + 6, cy + 6, {
        width: labelW - 12,
        align: "left",
      });
    // Value text
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(C.text)
      .text(rows[i][1], cx + labelW + 6, cy + 6, {
        width: valueW - 12,
        align: "left",
      });

    // Cell borders
    doc
      .rect(cx, cy, labelW, rowH)
      .strokeColor(C.borderLight)
      .lineWidth(0.25)
      .stroke();
    doc
      .rect(cx + labelW, cy, valueW, rowH)
      .strokeColor(C.borderLight)
      .lineWidth(0.25)
      .stroke();
  }

  // Vertical separator between the two halves
  doc
    .moveTo(x + colW, y)
    .lineTo(x + colW, y + (rows.length / 2) * rowH)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
}

function sectionTableHeight(rowCount: number): number {
  // Header (22) + rows (20 each) + total row (24)
  return 22 + rowCount * 20 + 24;
}

function drawSectionTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: [string, string][],
  total: [string, string],
  accentColor: string,
  isDeduction: boolean
) {
  const headerH = 22;
  const rowH = 20;
  const totalH = 24;
  const tableH = sectionTableHeight(rows.length);

  // Header band
  doc.rect(x, y, width, headerH).fillColor(accentColor).fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(title, x + 8, y + 7, {
      width: width / 2 - 8,
      align: "left",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text("Amount", x + width / 2, y + 7, {
      width: width / 2 - 8,
      align: "right",
    });

  // Rows
  let cy = y + headerH;
  for (let i = 0; i < rows.length; i++) {
    const isAlt = i % 2 === 1;
    if (isAlt) {
      doc.rect(x, cy, width, rowH).fillColor(C.rowAlt).fill();
    }
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(C.text)
      .text(rows[i][0], x + 8, cy + 6, {
        width: width / 2 - 8,
        align: "left",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(isDeduction ? C.rose : C.text)
      .text(rows[i][1], x + width / 2, cy + 6, {
        width: width / 2 - 8,
        align: "right",
      });
    cy += rowH;
  }

  // Total row
  doc
    .rect(x, cy, width, totalH)
    .fillColor(accentColor === C.primary ? C.primaryBg : C.roseLight)
    .fill();
  // Top separator
  doc
    .moveTo(x, cy)
    .lineTo(x + width, cy)
    .strokeColor(accentColor)
    .lineWidth(1)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(accentColor === C.primary ? C.primaryDark : C.rose)
    .text(total[0], x + 8, cy + 7, {
      width: width / 2 - 8,
      align: "left",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(accentColor === C.primary ? C.primaryDark : C.rose)
    .text(total[1], x + width / 2, cy + 6, {
      width: width / 2 - 8,
      align: "right",
    });

  // Outer border
  doc
    .rect(x, y, width, tableH)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
}

// =============================================================
// Route handler
// =============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = (searchParams.get("employeeId") || "").trim();
  const month = (searchParams.get("month") || "").trim();

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId query parameter is required" },
      { status: 400 }
    );
  }
  if (!month) {
    return NextResponse.json(
      { error: "month query parameter is required (format: YYYY-MM)" },
      { status: 400 }
    );
  }

  // Load employee + company
  const [employee, company] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true },
    }),
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Load (or auto-create) the payroll record so we have a paymentDate + status.
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

  // Compute the advanced breakdown
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

  // Build a doc number
  const numbering = await db.documentNumbering.findFirst({
    where: { name: "Default" },
  });
  const seq = numbering?.nextSeq ?? 1;
  const padding = numbering?.padding ?? 4;
  const prefix = numbering?.prefix ?? "NWL";
  const padded = String(seq).padStart(padding, "0");
  const yYear = new Date().getFullYear();
  const mMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const docNumber = `${prefix}/PAYSLIP/${yYear}${mMonth}/${padded}`;

  const data: PayslipData = {
    companyName: company?.name ?? "TeamHub HR",
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

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "PAYSLIP_PDF_GENERATED",
        entityType: "Payroll",
        entityId: payroll.id,
        description: `Generated enhanced payslip PDF for ${employee.fullName} (${month}). Net: ${fmtMoney(breakdown.netSalary)}.`,
        metadata: JSON.stringify({
          employeeId,
          month,
          docNumber,
          netSalary: breakdown.netSalary,
          tds: breakdown.tds,
          pf: breakdown.pf,
          gratuity: breakdown.gratuity,
        }),
      },
    });
  } catch {
    // non-fatal
  }

  const fileName = `payslip-${slugify(employee.fullName)}-${month}.pdf`;
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
