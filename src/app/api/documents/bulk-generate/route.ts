import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveVariables } from "@/lib/document-vars";
import { generateDocumentNumber } from "@/lib/document-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/documents/bulk-generate
// Body: { employeeIds: string[], templateId: string, type?: string }
//
// For each employee:
//   1. Load employee + department + role + designation
//   2. Resolve template variables against employee + company + document context
//   3. Generate a unique document number (bumping the DocumentNumbering counter)
//   4. Create a GeneratedDocument row + Activity log entry
// Per-employee try/catch so a single failure doesn't block the rest.
// A single AuditLog entry summarising the whole bulk action is written at the end.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeIds, templateId, type } = body ?? ({} as any);

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json(
      { error: "employeeIds must be a non-empty array." },
      { status: 400 }
    );
  }
  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required." },
      { status: 400 }
    );
  }
  if (employeeIds.length > 500) {
    return NextResponse.json(
      { error: "Bulk generation is capped at 500 employees per request." },
      { status: 400 }
    );
  }

  const template = await db.documentTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    return NextResponse.json(
      { error: "Template not found." },
      { status: 404 }
    );
  }

  const company = await db.company.findFirst();
  if (!company) {
    return NextResponse.json(
      { error: "Company profile is missing." },
      { status: 400 }
    );
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const docType = type || template.type;
  const isPayslip = docType === "PAYSLIP" || template.type === "PAYSLIP";

  const generated: any[] = [];
  const failed: { employeeId: string; name: string; error: string }[] = [];

  for (const employeeId of employeeIds) {
    try {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: { department: true, role: true, designation: true },
      });
      if (!employee) {
        failed.push({
          employeeId,
          name: "(unknown)",
          error: "Employee not found",
        });
        continue;
      }

      // For payslips, load the latest payroll for this employee (or fall back
      // to the employee salary fields). For other types, payroll is null.
      let payroll: any = null;
      if (isPayslip) {
        payroll = await db.payroll.findFirst({
          where: { employeeId: employee.id },
          orderBy: { payrollMonth: "desc" },
        });
        if (!payroll) {
          payroll = {
            month: `${new Date().getFullYear()}-${String(
              new Date().getMonth() + 1
            ).padStart(2, "0")}`,
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

      const { documentNumber } = await generateDocumentNumber({
        type: docType,
        employee: {
          employeeId: employee.employeeId,
          department: employee.department,
        },
        company,
      });

      const issuedAt = new Date();
      const dateStr = issuedAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const docCtx = {
        number: documentNumber,
        date: dateStr,
        issueDate: dateStr,
      };

      const employeeCtx: any = {
        ...employee,
        designationName: employee.designation?.name,
        roleName: employee.role?.name,
        departmentName: employee.department?.name,
      };

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

      const emailSubject = template.emailSubject
        ? resolveVariables(template.emailSubject, {
            employee: employeeCtx,
            company,
            document: docCtx,
            payroll: payrollCtx,
          })
        : "";
      const emailBody = template.emailBody
        ? resolveVariables(template.emailBody, {
            employee: employeeCtx,
            company,
            document: docCtx,
            payroll: payrollCtx,
          })
        : "";

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
        emailSubject,
        emailBody,
      });

      const title = `${template.name} - ${employee.fullName}`;

      const doc = await db.generatedDocument.create({
        data: {
          documentNumber,
          employeeId: employee.id,
          templateId: template.id,
          type: docType,
          title,
          content,
          dataJson,
          month: isPayslip ? payroll?.month ?? null : null,
          version: template.version,
          status: "GENERATED",
          generatedById: user?.id ?? null,
        },
        include: {
          employee: {
            include: { department: true, designation: true, role: true },
          },
          template: true,
        },
      });

      await db.activity.create({
        data: {
          employeeId: employee.id,
          type: "DOCUMENT_GENERATED",
          title: `Document Generated: ${template.name}`,
          description: `${template.name} (${documentNumber}) was generated for ${employee.fullName} via bulk generation.`,
          metadata: JSON.stringify({
            documentId: doc.id,
            templateCode: template.code,
            documentNumber,
            bulk: true,
          }),
        },
      });

      generated.push(doc);
    } catch (err: any) {
      failed.push({
        employeeId,
        name: "(unknown)",
        error: err?.message ?? "Unknown error",
      });
    }
  }

  // One audit log entry summarising the entire bulk action.
  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "BULK_DOCUMENT_GENERATE",
      entityType: "DocumentTemplate",
      entityId: template.id,
      description: `Bulk generated ${generated.length} document(s) using template ${template.name} (${template.code}). ${failed.length} failed.`,
      metadata: JSON.stringify({
        templateId: template.id,
        templateName: template.name,
        templateCode: template.code,
        requestedCount: employeeIds.length,
        successCount: generated.length,
        failedCount: failed.length,
        failedEmployeeIds: failed.map((f) => f.employeeId),
        documentIds: generated.map((g) => g.id),
      }),
    },
  });

  return NextResponse.json(
    {
      generated,
      failed,
      count: generated.length,
      totalRequested: employeeIds.length,
    },
    { status: 201 }
  );
}
