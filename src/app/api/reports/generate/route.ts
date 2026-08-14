import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: any[], headers: { key: string; label: string }[]): string {
  const head = headers.map((h) => escapeCsv(h.label)).join(",");
  const body = rows
    .map((r) => headers.map((h) => escapeCsv(r[h.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

async function buildRows(type: string, from?: Date, to?: Date) {
  switch (type) {
    case "employee": {
      const employees = await db.employee.findMany({
        where: from && to ? { joiningDate: { gte: from, lte: to } } : undefined,
        include: {
          department: true,
          role: true,
          designation: true,
        },
        orderBy: { employeeId: "asc" },
      });
      const rows = employees.map((e) => ({
        id: e.employeeId,
        name: e.fullName,
        email: e.officialEmail,
        phone: e.phone,
        department: e.department?.name ?? "",
        role: e.role?.name ?? "",
        designation: e.designation?.name ?? "",
        employmentType: e.employmentType,
        employmentStatus: e.employmentStatus,
        joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString().split("T")[0] : "",
        basicSalary: e.basicSalary,
      }));
      const headers = [
        { key: "id", label: "Employee ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "department", label: "Department" },
        { key: "role", label: "Role" },
        { key: "designation", label: "Designation" },
        { key: "employmentType", label: "Employment Type" },
        { key: "employmentStatus", label: "Status" },
        { key: "joiningDate", label: "Joining Date" },
        { key: "basicSalary", label: "Basic Salary" },
      ];
      return { rows, headers, title: "Employee Report" };
    }
    case "attendance": {
      const where: any = {};
      if (from && to) where.date = { gte: from, lte: to };
      const attendance = await db.attendance.findMany({
        where,
        include: { employee: { select: { employeeId: true, fullName: true } } },
        orderBy: { date: "desc" },
        take: 1000,
      });
      const rows = attendance.map((a) => ({
        employeeId: a.employee.employeeId,
        name: a.employee.fullName,
        date: new Date(a.date).toISOString().split("T")[0],
        checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "",
        checkOut: a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "",
        workingHours: a.workingHours ?? 0,
        status: a.status,
        late: a.late ? "Yes" : "No",
        overtime: a.overtime ?? 0,
      }));
      const headers = [
        { key: "employeeId", label: "Employee ID" },
        { key: "name", label: "Name" },
        { key: "date", label: "Date" },
        { key: "checkIn", label: "Check In" },
        { key: "checkOut", label: "Check Out" },
        { key: "workingHours", label: "Working Hours" },
        { key: "status", label: "Status" },
        { key: "late", label: "Late" },
        { key: "overtime", label: "Overtime" },
      ];
      return { rows, headers, title: "Attendance Report" };
    }
    case "leave": {
      const where: any = {};
      if (from && to) where.startDate = { gte: from, lte: to };
      const leaves = await db.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { employeeId: true, fullName: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: { appliedAt: "desc" },
      });
      const rows = leaves.map((l) => ({
        employeeId: l.employee.employeeId,
        name: l.employee.fullName,
        leaveType: l.leaveType.name,
        startDate: new Date(l.startDate).toISOString().split("T")[0],
        endDate: new Date(l.endDate).toISOString().split("T")[0],
        days: l.days,
        reason: l.reason,
        status: l.status,
        appliedAt: new Date(l.appliedAt).toISOString().split("T")[0],
      }));
      const headers = [
        { key: "employeeId", label: "Employee ID" },
        { key: "name", label: "Name" },
        { key: "leaveType", label: "Leave Type" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "days", label: "Days" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
        { key: "appliedAt", label: "Applied At" },
      ];
      return { rows, headers, title: "Leave Report" };
    }
    case "payroll": {
      const where: any = {};
      if (from && to) where.paymentDate = { gte: from, lte: to };
      const payrolls = await db.payroll.findMany({
        where,
        include: { employee: { select: { employeeId: true, fullName: true } } },
        orderBy: { payrollMonth: "desc" },
      });
      const rows = payrolls.map((p) => ({
        employeeId: p.employee.employeeId,
        name: p.employee.fullName,
        month: p.payrollMonth,
        basic: p.basicSalary,
        allowances: p.allowances,
        deductions: p.deductions,
        tax: p.tax,
        net: p.netSalary,
        status: p.status,
        paymentDate: p.paymentDate
          ? new Date(p.paymentDate).toISOString().split("T")[0]
          : "",
      }));
      const headers = [
        { key: "employeeId", label: "Employee ID" },
        { key: "name", label: "Name" },
        { key: "month", label: "Payroll Month" },
        { key: "basic", label: "Basic Salary" },
        { key: "allowances", label: "Allowances" },
        { key: "deductions", label: "Deductions" },
        { key: "tax", label: "Tax" },
        { key: "net", label: "Net Salary" },
        { key: "status", label: "Status" },
        { key: "paymentDate", label: "Payment Date" },
      ];
      return { rows, headers, title: "Payroll Report" };
    }
    case "document": {
      const where: any = {};
      if (from && to) where.createdAt = { gte: from, lte: to };
      const docs = await db.generatedDocument.findMany({
        where,
        include: {
          employee: { select: { employeeId: true, fullName: true } },
          template: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const rows = docs.map((d) => ({
        documentNumber: d.documentNumber,
        title: d.title,
        type: d.type,
        employeeId: d.employee.employeeId,
        name: d.employee.fullName,
        template: d.template.name,
        status: d.status,
        createdAt: new Date(d.createdAt).toISOString().split("T")[0],
      }));
      const headers = [
        { key: "documentNumber", label: "Document Number" },
        { key: "title", label: "Title" },
        { key: "type", label: "Type" },
        { key: "employeeId", label: "Employee ID" },
        { key: "name", label: "Employee Name" },
        { key: "template", label: "Template" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created At" },
      ];
      return { rows, headers, title: "Document Report" };
    }
    default:
      return { rows: [], headers: [], title: "Report" };
  }
}

async function buildPdfAsync(rows: any[], headers: { key: string; label: string }[], title: string): Promise<Buffer> {
  // Minimal PDF generator using built-in PDF Type1 fonts (no external .afm needed)
  // Each row is one line. Supports multi-page (60 rows / page).
  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toLocaleString()}    Rows: ${rows.length}`);
  lines.push("");
  lines.push(headers.map((h) => h.label).join("   |   "));
  lines.push("-".repeat(180));
  rows.forEach((r) => {
    lines.push(headers.map((h) => String(r[h.key] ?? "")).join("   |   "));
  });

  const pageHeight = 595;
  const pageWidth = 842;
  const margin = 36;
  const lineHeight = 12;
  const rowsPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += rowsPerPage) {
    pages.push(lines.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const objects: string[] = [];
  let objIndex = 1;

  // Catalog
  const catalogIdx = objIndex++;
  const pagesIdx = objIndex++;
  const fontIdx = objIndex++;
  const pageObjs: number[] = [];
  const contentObjs: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    pageObjs.push(objIndex++);
    contentObjs.push(objIndex++);
  }

  // Build objects
  // Catalog
  objects.push(`${catalogIdx} 0 obj\n<< /Type /Catalog /Pages ${pagesIdx} 0 R >>\nendobj\n`);
  // Pages
  const kidsList = pageObjs.map((i) => `${i} 0 R`).join(" ");
  objects.push(`${pagesIdx} 0 obj\n<< /Type /Pages /Kids [${kidsList}] /Count ${pages.length} >>\nendobj\n`);
  // Font (built-in Helvetica - no external file needed)
  objects.push(`${fontIdx} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // Pages and content
  for (let p = 0; p < pages.length; p++) {
    const pageLines = pages[p];
    objects.push(
      `${pageObjs[p]} 0 obj\n<< /Type /Page /Parent ${pagesIdx} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontIdx} 0 R >> >> /Contents ${contentObjs[p]} 0 R >>\nendobj\n`
    );

    // Build content stream
    let stream = "BT\n/F1 8 Tf\n";
    let y = pageHeight - margin;
    pageLines.forEach((line) => {
      // Escape special characters in PDF strings
      const escaped = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      stream += `1 0 0 1 ${margin} ${y} Tm (${escaped}) Tj\n`;
      y -= lineHeight;
    });
    stream += "ET\n";

    objects.push(
      `${contentObjs[p]} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`
    );
  }

  // Assemble PDF
  const header = "%PDF-1.4\n";
  const xrefOffsets: number[] = [];
  let pdf = header;
  objects.forEach((obj) => {
    xrefOffsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  });
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  const xref = `xref\n0 ${objIndex}\n0000000000 65535 f \n`;
  const xrefLines = xrefOffsets
    .map((off) => `${String(off).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += xref + xrefLines;
  pdf += `trailer\n<< /Size ${objIndex} /Root ${catalogIdx} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "employee";
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const fromStr = searchParams.get("from") || "";
  const toStr = searchParams.get("to") || "";

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  if (to) {
    to.setDate(to.getDate() + 1);
  }

  const { rows, headers, title } = await buildRows(type, from, to);

  await db.auditLog.create({
    data: {
      action: "REPORT_GENERATE",
      entityType: "Report",
      description: `Generated ${type} report (${format.toUpperCase()}) - ${rows.length} rows`,
    },
  });

  const baseFilename = `${type}-report-${new Date().toISOString().split("T")[0]}`;

  if (format === "pdf") {
    const pdfBuffer = await buildPdfAsync(rows, headers, title);
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseFilename}.pdf"`,
      },
    });
  }

  if (format === "excel") {
    // MVP: return CSV with .xls extension
    const csv = toCsv(rows, headers);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${baseFilename}.xls"`,
      },
    });
  }

  // Default CSV
  const csv = toCsv(rows, headers);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
    },
  });
}
