import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Timesheet / Time Tracking
//
// Timesheet entries are stored in the Activity model:
//
//   type        = "TIMESHEET"
//   title       = project name (denormalised, queryable for filtering)
//   employeeId  = submitter's Employee.id (FK)
//   description = JSON string {
//                   employeeId,
//                   employeeName,    // denormalised
//                   employeePhoto,   // denormalised
//                   projectId,       // string | null
//                   projectName,     // string | null
//                   task,            // free-text task description
//                   date,            // ISO date the work was done
//                   hours,           // number (decimals allowed, e.g. 1.5)
//                   description,     // string | null  (entry notes)
//                   status,          // DRAFT | SUBMITTED | APPROVED | REJECTED
//                   submittedAt,     // ISO | null
//                   approvedBy,      // string | null
//                   approvedAt,      // ISO | null
//                   rejectReason     // string | null
//                 }
//   createdAt   = entry creation timestamp
// ============================================================

export type TimesheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export const TIMESHEET_STATUSES: TimesheetStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

interface TimesheetMeta {
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  projectId: string | null;
  projectName: string | null;
  task: string;
  date: string;
  hours: number;
  description: string | null;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
}

export interface TimesheetDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  projectId: string | null;
  projectName: string | null;
  task: string;
  date: string;
  hours: number;
  description: string | null;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export function parseTimesheetMeta(
  description: string | null
): TimesheetMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    const status = String(p.status ?? "DRAFT").toUpperCase() as TimesheetStatus;
    return {
      employeeId: String(p.employeeId ?? ""),
      employeeName: String(p.employeeName ?? ""),
      employeePhoto: p.employeePhoto ?? null,
      projectId: p.projectId ?? null,
      projectName: p.projectName ?? null,
      task: String(p.task ?? ""),
      date: p.date ?? new Date().toISOString(),
      hours:
        typeof p.hours === "number" && isFinite(p.hours)
          ? p.hours
          : Number(p.hours ?? 0) || 0,
      description: p.description ?? null,
      status: TIMESHEET_STATUSES.includes(status) ? status : "DRAFT",
      submittedAt: p.submittedAt ?? null,
      approvedBy: p.approvedBy ?? null,
      approvedAt: p.approvedAt ?? null,
      rejectReason: p.rejectReason ?? null,
    };
  } catch {
    return null;
  }
}

export function toTimesheetDTO(a: any): TimesheetDTO | null {
  const m = parseTimesheetMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    employeeId: m.employeeId || a.employeeId || "",
    employeeName: m.employeeName || a.employee?.fullName || "",
    employeePhoto: m.employeePhoto ?? a.employee?.photo ?? null,
    projectId: m.projectId,
    projectName: m.projectName,
    task: m.task,
    date: m.date,
    hours: m.hours,
    description: m.description,
    status: m.status,
    submittedAt: m.submittedAt,
    approvedBy: m.approvedBy,
    approvedAt: m.approvedAt,
    rejectReason: m.rejectReason,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

// GET /api/timesheets  → list entries with filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const projectName = searchParams.get("projectName") || "";
  const status = (searchParams.get("status") || "").toUpperCase();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const search = (searchParams.get("search") || "").toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(500, parseInt(searchParams.get("pageSize") || "100", 10))
  );

  const where: any = { type: "TIMESHEET" };
  if (employeeId) where.employeeId = employeeId;
  if (projectName) where.title = projectName;

  const records = await db.activity.findMany({
    where,
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let items = records
    .map(toTimesheetDTO)
    .filter((x): x is TimesheetDTO => x !== null);

  if (status) items = items.filter((x) => x.status === status);
  if (search) {
    items = items.filter(
      (x) =>
        x.task.toLowerCase().includes(search) ||
        x.employeeName.toLowerCase().includes(search) ||
        (x.projectName ?? "").toLowerCase().includes(search) ||
        (x.description ?? "").toLowerCase().includes(search)
    );
  }
  if (from) {
    const f = new Date(from).getTime();
    items = items.filter((x) => new Date(x.date).getTime() >= f);
  }
  if (to) {
    const t = new Date(to).getTime();
    items = items.filter((x) => new Date(x.date).getTime() <= t);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return NextResponse.json({
    items: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// POST /api/timesheets  → create entry (status = DRAFT)
export async function POST(req: NextRequest) {
  const body = await req.json();

  const employeeId = String(body.employeeId ?? "").trim();
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, fullName: true, employeeId: true, photo: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  const task = String(body.task ?? "").trim();
  if (!task) {
    return NextResponse.json(
      { error: "task is required" },
      { status: 400 }
    );
  }

  const rawHours = body.hours;
  const hours =
    typeof rawHours === "number" && isFinite(rawHours)
      ? rawHours
      : typeof rawHours === "string" && rawHours.trim() !== "" && !isNaN(Number(rawHours))
        ? Number(rawHours)
        : 0;
  if (hours <= 0 || hours > 24) {
    return NextResponse.json(
      { error: "hours must be a positive number up to 24" },
      { status: 400 }
    );
  }

  const date = body.date ? new Date(body.date).toISOString() : new Date().toISOString();
  const projectId =
    body.projectId === null ||
    body.projectId === undefined ||
    body.projectId === ""
      ? null
      : String(body.projectId);
  const projectName =
    body.projectName === null ||
    body.projectName === undefined ||
    body.projectName === ""
      ? null
      : String(body.projectName).trim() || null;
  const description =
    body.description === null ||
    body.description === undefined ||
    body.description === ""
      ? null
      : String(body.description);

  const meta: TimesheetMeta = {
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeePhoto: employee.photo ?? null,
    projectId,
    projectName,
    task,
    date,
    hours,
    description,
    status: "DRAFT",
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectReason: null,
  };

  const activity = await db.activity.create({
    data: {
      type: "TIMESHEET",
      title: projectName ?? "",
      employeeId: employee.id,
      description: JSON.stringify(meta),
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "TIMESHEET_CREATE",
      entityType: "Timesheet",
      entityId: activity.id,
      description: `Created timesheet entry for ${employee.fullName} (${hours}h on ${task}).`,
    },
  });

  const dto = toTimesheetDTO(activity);
  return NextResponse.json(dto, { status: 201 });
}
