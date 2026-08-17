import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Resolve simple {{a.b.c}} variable paths against a data object
function resolveVar(path: string, data: Record<string, any>): string {
  const parts = path.split(".");
  let cur: any = data;
  for (const p of parts) {
    if (cur == null) return "";
    cur = cur[p];
  }
  if (cur == null) return "";
  if (cur instanceof Date) return cur.toLocaleDateString("en-GB");
  return String(cur);
}

function renderTemplate(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p1) => resolveVar(p1, data));
}

function formatMoney(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function nextDocNumber(prefix: string | null, seq: number, padding: number) {
  const p = prefix ?? "BH";
  const padded = String(seq).padStart(padding, "0");
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  return `${p}/PAYSLIP/${y}${m}/${padded}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeId, month } = body as { employeeId: string; month: string };

  if (!employeeId || !month) {
    return NextResponse.json(
      { error: "employeeId and month are required" },
      { status: 400 }
    );
  }

  // 1. Load employee + company + payslip template
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, designation: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const company = await db.company.findFirst();
  const template = await db.documentTemplate.findFirst({
    where: { code: "PAYSLIP", status: "ACTIVE" },
  });
  if (!template) {
    return NextResponse.json(
      { error: "PAYSLIP template not found. Seed the database first." },
      { status: 500 }
    );
  }

  // 2. Find or create the Payroll record
  let payroll = await db.payroll.findFirst({
    where: { employeeId, payrollMonth: month },
  });
  if (!payroll) {
    const net =
      employee.basicSalary + employee.allowances - employee.deductions - employee.tax;
    payroll = await db.payroll.create({
      data: {
        employeeId,
        payrollMonth: month,
        basicSalary: employee.basicSalary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        tax: employee.tax,
        netSalary: net,
        status: "DRAFT",
      },
    });
  }

  // 3. Resolve variables for the template
  const data = {
    company: {
      name: company?.name ?? "—",
      address: company?.address ?? "—",
      city: company?.city ?? "—",
      country: company?.country ?? "—",
      email: company?.email ?? "—",
      phone: company?.phone ?? "—",
    },
    employee: {
      name: employee.fullName,
      id: employee.employeeId,
      department: employee.department?.name ?? "—",
      designation: employee.designation?.name ?? "—",
      joining_date: employee.joiningDate
        ? new Date(employee.joiningDate).toLocaleDateString("en-GB")
        : "—",
      salary: formatMoney(employee.basicSalary),
    },
    payroll: {
      month,
      basic_salary: formatMoney(payroll.basicSalary),
      allowances: formatMoney(payroll.allowances),
      deductions: formatMoney(payroll.deductions),
      tax: formatMoney(payroll.tax),
      net_salary: formatMoney(payroll.netSalary),
    },
    document: {
      date: new Date().toLocaleDateString("en-GB"),
      number: "—",
    },
  };

  // 4. Get next document number
  const numbering = await db.documentNumbering.findFirst({
    where: { name: "Default" },
  });
  const seq = numbering?.nextSeq ?? 1;
  const padding = numbering?.padding ?? 4;
  const docNumber = nextDocNumber(numbering?.prefix ?? null, seq, padding);
  data.document.number = docNumber;

  // 5. Render content + email fields
  const renderedContent = renderTemplate(template.content, data);
  const renderedEmailSubject = template.emailSubject
    ? renderTemplate(template.emailSubject, data)
    : `Payslip - ${month} - ${employee.fullName}`;
  const renderedEmailBody = template.emailBody
    ? renderTemplate(template.emailBody, data)
    : `Dear ${employee.fullName},\n\nPlease find attached your payslip for ${month}.`;

  // 6. Create GeneratedDocument
  const generatedDoc = await db.generatedDocument.create({
    data: {
      documentNumber: docNumber,
      employeeId,
      templateId: template.id,
      type: "PAYSLIP",
      title: `Payslip - ${month} - ${employee.fullName}`,
      content: renderedContent,
      dataJson: JSON.stringify({
        ...data,
        emailSubject: renderedEmailSubject,
        emailBody: renderedEmailBody,
        payrollId: payroll.id,
      }),
      month,
      status: "GENERATED",
    },
    include: {
      employee: { include: { department: true } },
      template: true,
    },
  });

  // 7. Link payslipDocId on payroll + bump numbering counter
  await db.payroll.update({
    where: { id: payroll.id },
    data: { payslipDocId: generatedDoc.id, status: "APPROVED" },
  });

  if (numbering) {
    await db.documentNumbering.update({
      where: { id: numbering.id },
      data: { nextSeq: seq + 1 },
    });
  }

  // 8. Activity + audit
  await db.activity.create({
    data: {
      employeeId,
      type: "DOCUMENT_GENERATED",
      title: "Payslip Generated",
      description: `Payslip ${docNumber} generated for ${employee.fullName} (${month}).`,
    },
  });

  await db.auditLog.create({
    data: {
      action: "PAYSLIP_GENERATE",
      entityType: "GeneratedDocument",
      entityId: generatedDoc.id,
      description: `Generated payslip ${docNumber} for ${employee.fullName} (${month}).`,
    },
  });

  return NextResponse.json(generatedDoc, { status: 201 });
}
