// Variable resolver for HR document templates.
// Replaces {{employee.*}}, {{company.*}}, {{document.*}}, {{payroll.*}} tokens
// inside template content with real values from the supplied context.

export interface ResolveEmployee {
  id?: string;
  employeeId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  designation?: { name?: string } | null;
  role?: { name?: string } | null;
  department?: { name?: string } | null;
  designationName?: string | null;
  roleName?: string | null;
  departmentName?: string | null;
  joiningDate?: Date | string | null;
  confirmationDate?: Date | string | null;
  basicSalary?: number | null;
  allowances?: number | null;
  deductions?: number | null;
  tax?: number | null;
  officialEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
}

export interface ResolveCompany {
  name?: string | null;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface ResolveDocument {
  number?: string;
  date?: string;
  issueDate?: string;
}

export interface ResolvePayroll {
  month?: string;
  basicSalary?: number | null;
  allowances?: number | null;
  deductions?: number | null;
  tax?: number | null;
  netSalary?: number | null;
}

export interface ResolveContext {
  employee?: ResolveEmployee | null;
  company?: ResolveCompany | null;
  document?: ResolveDocument | null;
  payroll?: ResolvePayroll | null;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)}`;
}

/**
 * Replace every {{path.to.value}} token in `content` using `ctx`.
 * Unknown tokens resolve to an empty string (so previews never show literal braces).
 */
export function resolveVariables(content: string, ctx: ResolveContext): string {
  if (!content) return "";
  const { employee, company, document: doc, payroll } = ctx;

  const map: Record<string, string> = {};

  // Employee
  if (employee) {
    const designationName =
      employee.designation?.name ?? employee.designationName ?? "";
    const roleName = employee.role?.name ?? employee.roleName ?? "";
    const departmentName =
      employee.department?.name ?? employee.departmentName ?? "";

    map["employee.name"] = employee.fullName ?? "";
    map["employee.id"] = employee.employeeId ?? employee.id ?? "";
    map["employee.role"] = roleName;
    map["employee.designation"] = designationName;
    map["employee.department"] = departmentName;
    map["employee.joining_date"] = fmtDate(employee.joiningDate);
    map["employee.confirmation_date"] = fmtDate(employee.confirmationDate);
    map["employee.salary"] = fmtMoney(employee.basicSalary);
    map["employee.basic_salary"] = fmtMoney(employee.basicSalary);
    map["employee.allowances"] = fmtMoney(employee.allowances);
    map["employee.deductions"] = fmtMoney(employee.deductions);
    map["employee.tax"] = fmtMoney(employee.tax);
    map["employee.email"] = employee.officialEmail ?? employee.personalEmail ?? "";
    map["employee.official_email"] = employee.officialEmail ?? "";
    map["employee.personal_email"] = employee.personalEmail ?? "";
    map["employee.phone"] = employee.phone ?? "";
    map["employee.address"] = [
      employee.address,
      employee.city,
      employee.state,
      employee.country,
      employee.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
  }

  // Company
  if (company) {
    const fullAddress = [
      company.address,
      company.city,
      company.state,
      company.country,
      company.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
    map["company.name"] = company.name ?? "";
    map["company.legal_name"] = company.legalName ?? company.name ?? "";
    map["company.address"] = fullAddress;
    map["company.city"] = company.city ?? "";
    map["company.state"] = company.state ?? "";
    map["company.country"] = company.country ?? "";
    map["company.zip_code"] = company.zipCode ?? "";
    map["company.email"] = company.email ?? "";
    map["company.phone"] = company.phone ?? "";
    map["company.website"] = company.website ?? "";
  }

  // Document
  if (doc) {
    map["document.number"] = doc.number ?? "";
    map["document.date"] = doc.date ?? fmtDate(new Date());
    map["document.issue_date"] = doc.issueDate ?? doc.date ?? fmtDate(new Date());
  }

  // Payroll
  if (payroll) {
    map["payroll.month"] = payroll.month ?? "";
    map["payroll.basic_salary"] = fmtMoney(payroll.basicSalary);
    map["payroll.allowances"] = fmtMoney(payroll.allowances);
    map["payroll.deductions"] = fmtMoney(payroll.deductions);
    map["payroll.tax"] = fmtMoney(payroll.tax);
    map["payroll.net_salary"] = fmtMoney(payroll.netSalary);
  }

  // Replace {{token}} possibly surrounded by whitespace inside braces.
  return content.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (full, token: string) => {
    return token in map ? map[token] : "";
  });
}

/**
 * Extract every distinct {{...}} token from a template's content.
 * Useful for showing HR which variables a template uses.
 */
export function extractVariables(content: string): string[] {
  if (!content) return [];
  const set = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}
