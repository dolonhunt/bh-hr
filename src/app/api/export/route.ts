import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Generic CSV / Excel export endpoint
// GET /api/export?module=employees|attendance|leave|payroll|performance|candidates|audit|documents|email-logs&format=csv|excel
// Pass-through filters: search, status, departmentId, payrollMonth, from, to, type, jobId, action, entityType, leaveTypeId, date
// ============================================================

type ModuleKey =
  | "employees"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance"
  | "candidates"
  | "audit"
  | "documents"
  | "email-logs"
  | "assets"
  | "training-courses"
  | "training-enrollments";

const VALID_MODULES: ModuleKey[] = [
  "employees",
  "attendance",
  "leave",
  "payroll",
  "performance",
  "candidates",
  "audit",
  "documents",
  "email-logs",
  "assets",
  "training-courses",
  "training-enrollments",
];

// CSV escaping: wrap fields containing commas, quotes, or newlines in double quotes;
// escape inner quotes by doubling them.
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "number") {
    str = String(value);
  } else if (typeof value === "boolean") {
    str = value ? "Yes" : "No";
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function fmtDateOnly(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fmtTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ============================================================
// Per-module data fetchers — mirror the filters used in each
// module's list API.
// ============================================================

interface ExportParams {
  search: string;
  status: string;
  departmentId: string;
  payrollMonth: string;
  from: string;
  to: string;
  type: string;
  jobId: string;
  action: string;
  entityType: string;
  leaveTypeId: string;
  date: string;
}

async function fetchEmployees(p: ExportParams) {
  const where: any = {};
  if (p.search) {
    where.OR = [
      { fullName: { contains: p.search } },
      { employeeId: { contains: p.search } },
      { officialEmail: { contains: p.search } },
      { personalEmail: { contains: p.search } },
      { phone: { contains: p.search } },
    ];
  }
  if (p.departmentId) where.departmentId = p.departmentId;
  if (p.status) where.employmentStatus = p.status;

  const items = await db.employee.findMany({
    where,
    include: { department: true, role: true, designation: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Employee ID",
    "Full Name",
    "Department",
    "Designation",
    "Role",
    "Email",
    "Phone",
    "Joining Date",
    "Employment Type",
    "Status",
    "Basic Salary",
  ];
  const rows = items.map((e) => [
    e.employeeId,
    e.fullName,
    e.department?.name ?? "",
    e.designation?.name ?? "",
    e.role?.name ?? "",
    e.officialEmail ?? e.personalEmail ?? "",
    e.phone ?? "",
    fmtDateOnly(e.joiningDate),
    e.employmentType,
    e.employmentStatus,
    e.basicSalary,
  ]);
  return { headers, rows };
}

async function fetchAttendance(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  if (p.date) {
    const start = new Date(`${p.date}T00:00:00.000Z`);
    const end = new Date(`${p.date}T23:59:59.999Z`);
    where.date = { gte: start, lte: end };
  }
  if (p.from || p.to) {
    where.date = where.date ?? {};
    if (p.from) where.date.gte = new Date(p.from);
    if (p.to) {
      const toDate = new Date(p.to);
      toDate.setDate(toDate.getDate() + 1);
      where.date.lte = toDate;
    }
  }
  if (p.departmentId || p.search) {
    where.employee = {};
    if (p.departmentId) where.employee.departmentId = p.departmentId;
    if (p.search) {
      where.employee.OR = [
        { fullName: { contains: p.search } },
        { employeeId: { contains: p.search } },
        { officialEmail: { contains: p.search } },
      ];
    }
  }

  const items = await db.attendance.findMany({
    where,
    include: { employee: { include: { department: true, designation: true } } },
    orderBy: { date: "desc" },
  });

  const headers = [
    "Employee ID",
    "Employee Name",
    "Date",
    "Check In",
    "Check Out",
    "Working Hours",
    "Late",
    "Late Minutes",
    "Overtime",
    "Status",
  ];
  const rows = items.map((a) => [
    a.employee?.employeeId ?? "",
    a.employee?.fullName ?? "",
    fmtDateOnly(a.date),
    a.checkIn ? fmtTime(a.checkIn) : "",
    a.checkOut ? fmtTime(a.checkOut) : "",
    a.workingHours ?? "",
    a.late ? "Yes" : "No",
    a.lateMinutes ?? 0,
    a.overtime ?? 0,
    a.status,
  ]);
  return { headers, rows };
}

async function fetchLeave(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  if (p.leaveTypeId) where.leaveTypeId = p.leaveTypeId;
  if (p.search) {
    where.employee = {
      OR: [
        { fullName: { contains: p.search } },
        { employeeId: { contains: p.search } },
      ],
    };
  }

  const items = await db.leaveRequest.findMany({
    where,
    include: {
      employee: { include: { department: true, designation: true } },
      leaveType: true,
    },
    orderBy: { appliedAt: "desc" },
  });

  const headers = [
    "Employee ID",
    "Employee Name",
    "Leave Type",
    "Start Date",
    "End Date",
    "Days",
    "Reason",
    "Status",
    "Applied At",
    "Decided At",
  ];
  const rows = items.map((l) => [
    l.employee?.employeeId ?? "",
    l.employee?.fullName ?? "",
    l.leaveType?.name ?? "",
    fmtDateOnly(l.startDate),
    fmtDateOnly(l.endDate),
    l.days,
    l.reason,
    l.status,
    fmtDate(l.appliedAt),
    l.decidedAt ? fmtDate(l.decidedAt) : "",
  ]);
  return { headers, rows };
}

async function fetchPayroll(p: ExportParams) {
  const where: any = {};
  if (p.payrollMonth) where.payrollMonth = p.payrollMonth;
  if (p.status) where.status = p.status;
  if (p.departmentId || p.search) {
    where.employee = {};
    if (p.departmentId) where.employee.departmentId = p.departmentId;
    if (p.search) {
      where.employee.OR = [
        { fullName: { contains: p.search } },
        { employeeId: { contains: p.search } },
      ];
    }
  }

  const items = await db.payroll.findMany({
    where,
    include: { employee: { include: { department: true, designation: true } } },
    orderBy: [{ payrollMonth: "desc" }, { createdAt: "desc" }],
  });

  const headers = [
    "Employee ID",
    "Employee Name",
    "Month",
    "Basic",
    "Allowances",
    "Deductions",
    "Tax",
    "Net Salary",
    "Payment Date",
    "Status",
  ];
  const rows = items.map((py) => [
    py.employee?.employeeId ?? "",
    py.employee?.fullName ?? "",
    py.payrollMonth,
    py.basicSalary,
    py.allowances,
    py.deductions,
    py.tax,
    py.netSalary,
    py.paymentDate ? fmtDateOnly(py.paymentDate) : "",
    py.status,
  ]);
  return { headers, rows };
}

async function fetchPerformance(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  if (p.search) {
    where.OR = [
      { reviewer: { contains: p.search } },
      { reviewPeriod: { contains: p.search } },
      { comments: { contains: p.search } },
      { employee: { fullName: { contains: p.search } } },
      { employee: { employeeId: { contains: p.search } } },
    ];
  }

  const items = await db.performance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Employee ID",
    "Employee Name",
    "Review Period",
    "Reviewer",
    "Goals",
    "Quality",
    "Attendance",
    "Teamwork",
    "Communication",
    "Overall",
    "Status",
  ];
  const rows = items.map((r) => [
    r.employee?.employeeId ?? "",
    r.employee?.fullName ?? "",
    r.reviewPeriod,
    r.reviewer ?? "",
    r.goals,
    r.quality,
    r.attendance,
    r.teamwork,
    r.communication,
    r.overallScore,
    r.status,
  ]);
  return { headers, rows };
}

async function fetchCandidates(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  if (p.jobId) where.jobId = p.jobId;
  if (p.search) {
    where.OR = [
      { name: { contains: p.search } },
      { email: { contains: p.search } },
      { phone: { contains: p.search } },
      { skills: { contains: p.search } },
    ];
  }

  const items = await db.candidate.findMany({
    where,
    include: {
      job: { select: { id: true, title: true } },
    },
    orderBy: { appliedAt: "desc" },
  });

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Job Title",
    "Experience",
    "Skills",
    "Status",
    "Applied At",
  ];
  const rows = items.map((c) => [
    c.name,
    c.email,
    c.phone ?? "",
    c.job?.title ?? "",
    c.experience,
    c.skills ?? "",
    c.status,
    fmtDate(c.appliedAt),
  ]);
  return { headers, rows };
}

async function fetchAudit(p: ExportParams) {
  const where: any = {};
  if (p.action) where.action = p.action;
  if (p.entityType) where.entityType = p.entityType;
  if (p.from || p.to) {
    where.createdAt = {};
    if (p.from) where.createdAt.gte = new Date(p.from);
    if (p.to) {
      const toDate = new Date(p.to);
      toDate.setDate(toDate.getDate() + 1);
      where.createdAt.lte = toDate;
    }
  }
  if (p.search) {
    where.OR = [
      { description: { contains: p.search } },
      { action: { contains: p.search } },
      { entityType: { contains: p.search } },
      { ipAddress: { contains: p.search } },
      { user: { name: { contains: p.search } } },
      { user: { email: { contains: p.search } } },
    ];
  }

  const items = await db.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Timestamp",
    "User",
    "Action",
    "Entity Type",
    "Entity ID",
    "Description",
    "IP Address",
  ];
  const rows = items.map((log) => [
    fmtDate(log.createdAt),
    log.user?.name ?? log.user?.email ?? "System",
    log.action,
    log.entityType ?? "",
    log.entityId ?? "",
    log.description ?? "",
    log.ipAddress ?? "",
  ]);
  return { headers, rows };
}

async function fetchDocuments(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  else where.status = { not: "ARCHIVED" };
  if (p.type) where.type = p.type;
  if (p.search) {
    where.OR = [
      { documentNumber: { contains: p.search } },
      { title: { contains: p.search } },
    ];
  }

  const items = await db.generatedDocument.findMany({
    where,
    include: {
      employee: { include: { department: true, designation: true } },
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Document Number",
    "Employee Name",
    "Type",
    "Title",
    "Status",
    "Created At",
  ];
  const rows = items.map((d) => [
    d.documentNumber,
    d.employee?.fullName ?? "",
    d.type,
    d.title,
    d.status,
    fmtDate(d.createdAt),
  ]);
  return { headers, rows };
}

async function fetchEmailLogs(p: ExportParams) {
  const where: any = {};
  if (p.status) where.status = p.status;
  if (p.search) {
    where.OR = [
      { recipientTo: { contains: p.search } },
      { subject: { contains: p.search } },
      { body: { contains: p.search } },
    ];
  }

  const items = await db.emailLog.findMany({
    where,
    include: {
      document: { include: { employee: true, template: true } },
      sentBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Manually resolve employees (EmailLog has no Prisma relation to Employee)
  const empIds = Array.from(
    new Set(items.map((l) => l.employeeId).filter((id): id is string => !!id))
  );
  const employees = empIds.length
    ? await db.employee.findMany({ where: { id: { in: empIds } } })
    : [];
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const headers = [
    "Document Number",
    "Employee Name",
    "Recipient",
    "Subject",
    "Status",
    "Sent At",
    "Sent By",
  ];
  const rows = items.map((l) => {
    const emp = l.employeeId ? empMap[l.employeeId] : null;
    return [
      l.document?.documentNumber ?? "",
      emp?.fullName ?? "",
      l.recipientTo,
      l.subject,
      l.status,
      l.sentAt ? fmtDate(l.sentAt) : "",
      l.sentBy?.name ?? l.sentBy?.email ?? "",
    ];
  });
  return { headers, rows };
}

// ============================================================
// Assets & Training (stored in Activity model with JSON metadata)
// ============================================================

function parseAssetMeta(description: string | null) {
  const fallback = {
    name: "",
    type: "OTHER",
    serialNumber: "",
    condition: "GOOD",
    status: "AVAILABLE",
    notes: null as string | null,
    assignedToId: null as string | null,
    assignedToName: null as string | null,
    assignedDate: null as string | null,
    returnDate: null as string | null,
    expectedReturnDate: null as string | null,
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      name: String(parsed.name ?? ""),
      type: String(parsed.type ?? "OTHER"),
      serialNumber: String(parsed.serialNumber ?? ""),
      condition: String(parsed.condition ?? "GOOD"),
      status: String(parsed.status ?? "AVAILABLE"),
      notes: parsed.notes ?? null,
      assignedToId: parsed.assignedToId ?? null,
      assignedToName: parsed.assignedToName ?? null,
      assignedDate: parsed.assignedDate ?? null,
      returnDate: parsed.returnDate ?? null,
      expectedReturnDate: parsed.expectedReturnDate ?? null,
    };
  } catch {
    return fallback;
  }
}

function parseCourseMeta(description: string | null) {
  const fallback = {
    description: null as string | null,
    trainer: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
    duration: "",
    capacity: 0,
    category: "General",
    status: "SCHEDULED",
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      description: parsed.description ?? null,
      trainer: parsed.trainer ?? null,
      startDate: parsed.startDate ?? null,
      endDate: parsed.endDate ?? null,
      duration: String(parsed.duration ?? ""),
      capacity: Number(parsed.capacity ?? 0) || 0,
      category: String(parsed.category ?? "General"),
      status: String(parsed.status ?? "SCHEDULED"),
    };
  } catch {
    return fallback;
  }
}

function parseEnrollmentMeta(description: string | null) {
  const fallback = {
    courseId: "",
    courseTitle: "",
    enrolledAt: "",
    completedAt: null as string | null,
    score: null as number | null,
    certificate: null as string | null,
    status: "ENROLLED",
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      courseId: String(parsed.courseId ?? ""),
      courseTitle: String(parsed.courseTitle ?? ""),
      enrolledAt: parsed.enrolledAt ?? "",
      completedAt: parsed.completedAt ?? null,
      score:
        parsed.score === null || parsed.score === undefined
          ? null
          : Number(parsed.score),
      certificate: parsed.certificate ?? null,
      status: String(parsed.status ?? "ENROLLED"),
    };
  } catch {
    return fallback;
  }
}

async function fetchAssets(p: ExportParams) {
  const where: any = { type: "ASSET" };
  if (p.search) {
    where.OR = [
      { title: { contains: p.search } },
      { description: { contains: p.search } },
    ];
  }
  // employeeId filter (if assignedToId is provided via "departmentId" or "employeeId"
  // we apply it via the activity.employeeId column).
  if (p.entityType === "employeeId") {
    // not used; placeholder for clarity
  }

  const items = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  let rows = items.map((a) => {
    const m = parseAssetMeta(a.description);
    return {
      name: m.name || a.title,
      type: m.type,
      serial: m.serialNumber,
      condition: m.condition,
      status: m.status,
      assignedTo: m.assignedToName ?? "",
      assignedDate: m.assignedDate ? fmtDateOnly(m.assignedDate) : "",
      returnDate: m.returnDate ? fmtDateOnly(m.returnDate) : "",
      expectedReturnDate: m.expectedReturnDate
        ? fmtDateOnly(m.expectedReturnDate)
        : "",
      notes: m.notes ?? "",
      createdAt: fmtDate(a.createdAt),
    };
  });

  if (p.status) rows = rows.filter((r) => r.status === p.status.toUpperCase());
  if (p.type) rows = rows.filter((r) => r.type === p.type.toUpperCase());

  const headers = [
    "Asset Name",
    "Type",
    "Serial Number",
    "Condition",
    "Assigned To",
    "Assigned Date",
    "Return Date",
    "Expected Return",
    "Status",
    "Notes",
    "Created At",
  ];
  const csvRows: (string | number | null | undefined)[][] = rows.map((r) => [
    r.name,
    r.type,
    r.serial,
    r.condition,
    r.assignedTo,
    r.assignedDate,
    r.returnDate,
    r.expectedReturnDate,
    r.status,
    r.notes,
    r.createdAt,
  ]);
  return { headers, rows: csvRows };
}

async function fetchTrainingCourses(p: ExportParams) {
  const where: any = { type: "TRAINING_COURSE" };
  if (p.search) {
    where.OR = [
      { title: { contains: p.search } },
      { description: { contains: p.search } },
    ];
  }

  const items = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Enrollment counts
  const enrollments = await db.activity.findMany({
    where: { type: "TRAINING_ENROLLMENT" },
    select: { description: true },
  });
  const countByCourse: Record<string, number> = {};
  for (const e of enrollments) {
    const m = parseEnrollmentMeta(e.description);
    if (m.status === "DROPPED") continue;
    countByCourse[m.courseId] = (countByCourse[m.courseId] ?? 0) + 1;
  }

  let rows = items.map((a) => {
    const m = parseCourseMeta(a.description);
    return {
      title: a.title,
      trainer: m.trainer ?? "",
      category: m.category,
      startDate: m.startDate ? fmtDateOnly(m.startDate) : "",
      endDate: m.endDate ? fmtDateOnly(m.endDate) : "",
      duration: m.duration,
      capacity: m.capacity,
      enrolled: countByCourse[a.id] ?? 0,
      status: m.status,
      description: m.description ?? "",
    };
  });

  if (p.status)
    rows = rows.filter((r) => r.status === p.status.toUpperCase());

  const headers = [
    "Course Title",
    "Category",
    "Trainer",
    "Start Date",
    "End Date",
    "Duration",
    "Capacity",
    "Enrolled",
    "Status",
    "Description",
  ];
  const csvRows: (string | number | null | undefined)[][] = rows.map((r) => [
    r.title,
    r.category,
    r.trainer,
    r.startDate,
    r.endDate,
    r.duration,
    r.capacity,
    r.enrolled,
    r.status,
    r.description,
  ]);
  return { headers, rows: csvRows };
}

async function fetchTrainingEnrollments(p: ExportParams) {
  const where: any = { type: "TRAINING_ENROLLMENT" };
  if (p.search) {
    where.OR = [
      { title: { contains: p.search } },
      { description: { contains: p.search } },
    ];
  }

  const items = await db.activity.findMany({
    where,
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let rows = items.map((a) => {
    const m = parseEnrollmentMeta(a.description);
    return {
      employeeName: a.employee?.fullName ?? "",
      employeeCode: a.employee?.employeeId ?? "",
      course: m.courseTitle,
      enrolledAt: m.enrolledAt ? fmtDateOnly(m.enrolledAt) : "",
      completedAt: m.completedAt ? fmtDateOnly(m.completedAt) : "",
      score: m.score ?? "",
      certificate: m.certificate ?? "",
      status: m.status,
    };
  });

  if (p.status)
    rows = rows.filter((r) => r.status === p.status.toUpperCase());
  if (p.entityType === "courseId") {
    // optional filter — entityType carries courseId value when supplied as courseId=<x>
  }

  const headers = [
    "Employee Name",
    "Employee Code",
    "Course",
    "Enrolled At",
    "Completed At",
    "Score",
    "Certificate",
    "Status",
  ];
  const csvRows: (string | number | null | undefined)[][] = rows.map((r) => [
    r.employeeName,
    r.employeeCode,
    r.course,
    r.enrolledAt,
    r.completedAt,
    r.score,
    r.certificate,
    r.status,
  ]);
  return { headers, rows: csvRows };
}

// ============================================================
// Route handler
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleParam = (searchParams.get("module") || "") as ModuleKey;
  const format = (searchParams.get("format") || "csv").toLowerCase();

  if (!VALID_MODULES.includes(moduleParam)) {
    return NextResponse.json(
      { error: `Invalid module. Must be one of: ${VALID_MODULES.join(", ")}` },
      { status: 400 }
    );
  }

  if (format !== "csv" && format !== "excel") {
    return NextResponse.json(
      { error: "Invalid format. Must be 'csv' or 'excel'." },
      { status: 400 }
    );
  }

  const params: ExportParams = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    departmentId: searchParams.get("departmentId") || "",
    payrollMonth: searchParams.get("payrollMonth") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    type: searchParams.get("type") || "",
    jobId: searchParams.get("jobId") || "",
    action: searchParams.get("action") || "",
    entityType: searchParams.get("entityType") || "",
    leaveTypeId: searchParams.get("leaveTypeId") || "",
    date: searchParams.get("date") || "",
  };

  try {
    let result: { headers: string[]; rows: (string | number | null | undefined)[][] };

    switch (moduleParam) {
      case "employees":
        result = await fetchEmployees(params);
        break;
      case "attendance":
        result = await fetchAttendance(params);
        break;
      case "leave":
        result = await fetchLeave(params);
        break;
      case "payroll":
        result = await fetchPayroll(params);
        break;
      case "performance":
        result = await fetchPerformance(params);
        break;
      case "candidates":
        result = await fetchCandidates(params);
        break;
      case "audit":
        result = await fetchAudit(params);
        break;
      case "documents":
        result = await fetchDocuments(params);
        break;
      case "email-logs":
        result = await fetchEmailLogs(params);
        break;
      case "assets":
        result = await fetchAssets(params);
        break;
      case "training-courses":
        result = await fetchTrainingCourses(params);
        break;
      case "training-enrollments":
        result = await fetchTrainingEnrollments(params);
        break;
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }

    // Build CSV with UTF-8 BOM so Excel opens UTF-8 correctly
    const csvBody = buildCsv(result.headers, result.rows);
    const bom = "\ufeff";
    const output = bom + csvBody;

    const today = new Date();
    const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const ext = format === "excel" ? "xls" : "csv";
    const filename = `${moduleParam}-export-${dateStamp}.${ext}`;

    const contentType =
      format === "excel"
        ? "application/vnd.ms-excel; charset=utf-8"
        : "text/csv; charset=utf-8";

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("[export] error:", err);
    return NextResponse.json(
      { error: err?.message || "Export failed" },
      { status: 500 }
    );
  }
}
