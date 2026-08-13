import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveVariables } from "@/lib/document-vars";
import { generateDocumentNumber } from "@/lib/document-number";

// GET /api/documents?type=&status=&employeeId=&search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

  const where: any = {};
  if (status) where.status = status;
  else where.status = { not: "ARCHIVED" };
  if (type) where.type = type;
  if (employeeId) where.employeeId = employeeId;
  if (search) {
    where.OR = [
      { documentNumber: { contains: search } },
      { title: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.generatedDocument.count({ where }),
    db.generatedDocument.findMany({
      where,
      include: {
        employee: {
          include: { department: true, designation: true, role: true },
        },
        template: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // For each doc also fetch its latest email log status.
  const docIds = items.map((d) => d.id);
  const emailLogs = await db.emailLog.findMany({
    where: { documentId: { in: docIds } },
    orderBy: { createdAt: "desc" },
  });
  const latestEmailByDoc: Record<string, (typeof emailLogs)[number]> = {};
  for (const log of emailLogs) {
    if (log.documentId && !latestEmailByDoc[log.documentId]) {
      latestEmailByDoc[log.documentId] = log;
    }
  }

  const enriched = items.map((d) => ({
    ...d,
    latestEmail: latestEmailByDoc[d.id] ?? null,
  }));

  return NextResponse.json({
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/documents  { employeeId, templateId, type?, month?, dataOverride?, preview? }
// When preview=true, returns the resolved HTML + proposed documentNumber
// without persisting a GeneratedDocument row.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeId, templateId, preview } = body;
  if (!employeeId || !templateId) {
    return NextResponse.json(
      { error: "employeeId and templateId are required." },
      { status: 400 }
    );
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, role: true, designation: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const template = await db.documentTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const company = await db.company.findFirst();
  if (!company) {
    return NextResponse.json(
      { error: "Company profile missing. Add a company first." },
      { status: 400 }
    );
  }

  // For payslips, fetch the latest payroll for the given month (or latest overall).
  let payroll: any = null;
  if (template.type === "PAYSLIP" || body.type === "PAYSLIP") {
    const month = body.month;
    payroll = month
      ? await db.payroll.findFirst({
          where: { employeeId, payrollMonth: month },
          orderBy: { createdAt: "desc" },
        })
      : await db.payroll.findFirst({
          where: { employeeId },
          orderBy: { payrollMonth: "desc" },
        });
    if (!payroll) {
      // Fall back to employee basic salary fields if no payroll row exists.
      payroll = {
        month: month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        basicSalary: employee.basicSalary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        tax: employee.tax,
        netSalary:
          employee.basicSalary +
          employee.allowances -
          employee.deductions -
          employee.tax,
      };
    }
  }

  // Generate document number (dry-run when previewing so the counter doesn't
  // advance until we actually persist).
  const { documentNumber } = await generateDocumentNumber(
    {
      type: body.type || template.type,
      employee: {
        employeeId: employee.employeeId,
        department: employee.department,
      },
      company,
    },
    { dryRun: preview === true }
  );

  const issuedAt = new Date();
  const docCtx = {
    number: documentNumber,
    date: issuedAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    issueDate: issuedAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  // Apply HR overrides on top of auto-loaded employee data.
  const employeeCtx: any = {
    ...employee,
    designationName: employee.designation?.name,
    roleName: employee.role?.name,
    departmentName: employee.department?.name,
  };
  if (body.dataOverride?.employee) {
    Object.assign(employeeCtx, body.dataOverride.employee);
  }

  const payrollCtx: any = payroll
    ? {
        month: payroll.month,
        basicSalary: payroll.basicSalary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        tax: payroll.tax,
        netSalary: payroll.netSalary,
      }
    : undefined;

  const content = resolveVariables(template.content, {
    employee: employeeCtx,
    company,
    document: docCtx,
    payroll: payrollCtx,
  });

  // Preview mode: return the resolved HTML + proposed number without saving.
  if (preview) {
    return NextResponse.json({
      preview: true,
      documentNumber,
      content,
      title: `${template.name} - ${employee.fullName}`,
      type: body.type || template.type,
      emailSubject: template.emailSubject
        ? resolveVariables(template.emailSubject, {
            employee: employeeCtx,
            company,
            document: docCtx,
            payroll: payrollCtx,
          })
        : "",
      emailBody: template.emailBody
        ? resolveVariables(template.emailBody, {
            employee: employeeCtx,
            company,
            document: docCtx,
            payroll: payrollCtx,
          })
        : "",
    });
  }

  // Snapshot of variables used (so future re-renders are stable).
  const dataJson = JSON.stringify({
    employee: {
      id: employee.employeeId,
      name: employee.fullName,
      designation: employee.designation?.name,
      role: employee.role?.name,
      department: employee.department?.name,
      joiningDate: employee.joiningDate,
      confirmationDate: employee.confirmationDate,
      basicSalary: employee.basicSalary,
      officialEmail: employee.officialEmail,
      phone: employee.phone,
      address: employee.address,
    },
    company: {
      name: company.name,
      address: company.address,
      email: company.email,
      phone: company.phone,
      website: company.website,
    },
    document: docCtx,
    payroll: payrollCtx ?? null,
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const title = `${template.name} - ${employee.fullName}`;

  const doc = await db.generatedDocument.create({
    data: {
      documentNumber,
      employeeId: employee.id,
      templateId: template.id,
      type: body.type || template.type,
      title,
      content,
      dataJson,
      month: body.month ?? (template.type === "PAYSLIP" ? payroll?.month : null),
      version: template.version,
      status: "GENERATED",
      generatedById: user?.id ?? null,
    },
    include: {
      employee: { include: { department: true, designation: true, role: true } },
      template: true,
    },
  });

  await db.activity.create({
    data: {
      employeeId: employee.id,
      type: "DOCUMENT_GENERATED",
      title: `Document Generated: ${template.name}`,
      description: `${template.name} (${documentNumber}) was generated for ${employee.fullName}.`,
      metadata: JSON.stringify({
        documentId: doc.id,
        templateCode: template.code,
        documentNumber,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_GENERATE",
      entityType: "GeneratedDocument",
      entityId: doc.id,
      description: `Generated ${template.name} (${documentNumber}) for ${employee.fullName}`,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
