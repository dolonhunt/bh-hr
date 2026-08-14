import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Offboarding tasks are stored in the Activity model with a
// creative workaround (mirrors the onboarding pattern):
//   type        = "OFFBOARDING_TASK"
//   employeeId  = the departing employee
//   title       = the task title
//   description = JSON string {
//                   description,
//                   dueDate,
//                   assignedTo,
//                   status,         // PENDING | IN_PROGRESS | COMPLETED | SKIPPED
//                   notes,
//                   completedAt,
//                   sortOrder,
//                   isDefault,      // boolean — seeded from defaults
//                   exitDate,       // ISO date — planned exit date
//                   exitReason      // RESIGNATION | TERMINATION | CONTRACT_END | RETIREMENT
//                 }
// ============================================================

export type OffboardingStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

export type ExitReason =
  | "RESIGNATION"
  | "TERMINATION"
  | "CONTRACT_END"
  | "RETIREMENT";

export interface OffboardingTaskDTO {
  id: string;
  employeeId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status: OffboardingStatus;
  notes?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  isDefault: boolean;
  exitDate?: string | null;
  exitReason?: ExitReason | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskMeta {
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status: OffboardingStatus;
  notes?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  isDefault: boolean;
  exitDate?: string | null;
  exitReason?: ExitReason | null;
}

const DEFAULT_TASKS: {
  title: string;
  description: string;
  assignedTo: string;
  dueOffsetDays?: number; // days before exit date (negative = before)
}[] = [
  {
    title: "Accept resignation letter",
    description:
      "Receive and formally acknowledge the resignation letter from the employee.",
    assignedTo: "HR",
    dueOffsetDays: 0,
  },
  {
    title: "Conduct exit interview",
    description:
      "Hold an exit interview to gather feedback and document the reason for leaving.",
    assignedTo: "HR",
    dueOffsetDays: -3,
  },
  {
    title: "Recover company assets (laptop, ID, keys)",
    description:
      "Collect all physical company assets issued to the employee (laptop, ID card, access keys, peripherals).",
    assignedTo: "IT",
    dueOffsetDays: -1,
  },
  {
    title: "Revoke system access and email",
    description:
      "Disable accounts, revoke VPN/email/system permissions, and forward the official mailbox.",
    assignedTo: "IT",
    dueOffsetDays: 0,
  },
  {
    title: "Process final payroll and settlement",
    description:
      "Calculate and process final salary, leave encashment, and full & final settlement.",
    assignedTo: "Finance",
    dueOffsetDays: 1,
  },
  {
    title: "Clear pending dues and advances",
    description:
      "Verify and clear any pending dues, salary advances, or outstanding reimbursements.",
    assignedTo: "Finance",
    dueOffsetDays: 1,
  },
  {
    title: "Issue experience certificate",
    description:
      "Generate and issue the experience certificate detailing tenure and role.",
    assignedTo: "HR",
    dueOffsetDays: 2,
  },
  {
    title: "Issue relieving letter",
    description:
      "Issue the official relieving letter confirming the end of employment.",
    assignedTo: "HR",
    dueOffsetDays: 2,
  },
];

function parseMeta(description: string | null): TaskMeta {
  const fallback: TaskMeta = {
    description: null,
    dueDate: null,
    assignedTo: null,
    status: "PENDING",
    notes: null,
    completedAt: null,
    sortOrder: 0,
    isDefault: false,
    exitDate: null,
    exitReason: null,
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      description: parsed.description ?? null,
      dueDate: parsed.dueDate ?? null,
      assignedTo: parsed.assignedTo ?? null,
      status: (parsed.status as OffboardingStatus) ?? "PENDING",
      notes: parsed.notes ?? null,
      completedAt: parsed.completedAt ?? null,
      sortOrder: typeof parsed.sortOrder === "number" ? parsed.sortOrder : 0,
      isDefault: Boolean(parsed.isDefault),
      exitDate: parsed.exitDate ?? null,
      exitReason: (parsed.exitReason as ExitReason) ?? null,
    };
  } catch {
    return { ...fallback, description };
  }
}

function toDTO(a: any): OffboardingTaskDTO {
  const m = parseMeta(a.description);
  return {
    id: a.id,
    employeeId: a.employeeId,
    title: a.title,
    description: m.description,
    dueDate: m.dueDate,
    assignedTo: m.assignedTo,
    status: m.status,
    notes: m.notes,
    completedAt: m.completedAt,
    sortOrder: m.sortOrder,
    isDefault: m.isDefault,
    exitDate: m.exitDate,
    exitReason: m.exitReason,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

/**
 * Infer a default exit date for an employee. If the employee is already
 * marked RESIGNED/TERMINATED we use today (i.e. immediate exit). Otherwise
 * we use today + 30 days as a reasonable notice period default.
 */
function defaultExitDate(emp: { employmentStatus?: string | null }): string {
  const status = (emp.employmentStatus || "").toUpperCase();
  const today = new Date();
  if (status === "RESIGNED" || status === "TERMINATED") {
    return today.toISOString();
  }
  const d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function inferExitReason(emp: {
  employmentStatus?: string | null;
}): ExitReason {
  const s = (emp.employmentStatus || "").toUpperCase();
  if (s === "TERMINATED") return "TERMINATION";
  if (s === "RESIGNED") return "RESIGNATION";
  return "RESIGNATION";
}

async function ensureDefaultsForEmployee(employeeId: string) {
  const existing = await db.activity.count({
    where: { type: "OFFBOARDING_TASK", employeeId },
  });
  if (existing > 0) return;

  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: { employmentStatus: true, fullName: true, employeeId: true },
  });
  if (!emp) return;

  const exitDateISO = defaultExitDate(emp);
  const exitDate = new Date(exitDateISO);
  if (isNaN(exitDate.getTime())) exitDate.setTime(Date.now());
  const exitReason = inferExitReason(emp);

  await db.activity.createMany({
    data: DEFAULT_TASKS.map((t, idx) => {
      const due =
        t.dueOffsetDays !== undefined
          ? new Date(exitDate.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
          : null;
      const meta: TaskMeta = {
        description: t.description,
        dueDate: due ? due.toISOString() : null,
        assignedTo: t.assignedTo,
        status: "PENDING",
        notes: null,
        completedAt: null,
        sortOrder: idx,
        isDefault: true,
        exitDate: exitDateISO,
        exitReason,
      };
      return {
        employeeId,
        type: "OFFBOARDING_TASK",
        title: t.title,
        description: JSON.stringify(meta),
      };
    }),
  });

  await db.auditLog.create({
    data: {
      action: "OFFBOARDING_SEED",
      entityType: "OffboardingTask",
      entityId: employeeId,
      description: `Seeded 8 default offboarding tasks for ${emp.fullName} (${emp.employeeId}).`,
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const status = (searchParams.get("status") || "").toUpperCase();

  if (!employeeId) {
    return NextResponse.json({
      items: [],
      total: 0,
      message: "employeeId query is required",
    });
  }

  // Auto-seed default offboarding tasks on first GET.
  try {
    await ensureDefaultsForEmployee(employeeId);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Employee not found — cannot seed offboarding tasks.",
        detail: String(err),
      },
      { status: 404 }
    );
  }

  const where: any = { type: "OFFBOARDING_TASK", employeeId };
  const activities = await db.activity.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  let tasks = activities.map(toDTO);
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({ items: tasks, total: tasks.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const employeeId = body.employeeId;
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      employmentStatus: true,
    },
  });
  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Ensure defaults exist first (so custom tasks are appended after the defaults).
  await ensureDefaultsForEmployee(employeeId);

  // Compute next sortOrder for this employee.
  const existing = await db.activity.findMany({
    where: { type: "OFFBOARDING_TASK", employeeId },
    select: { description: true },
  });
  const orders = existing
    .map((a) => parseMeta(a.description).sortOrder)
    .filter((n) => typeof n === "number");
  const nextOrder = orders.length ? Math.max(...orders) + 1 : 0;

  // Inherit exitDate/exitReason from existing tasks (the defaults) so that
  // every offboarding task for a given employee shares the same exit context.
  const firstExisting = existing[0];
  const inheritMeta = firstExisting
    ? parseMeta(firstExisting.description)
    : null;
  const exitDate =
    body.exitDate !== undefined
      ? body.exitDate
        ? new Date(body.exitDate).toISOString()
        : null
      : inheritMeta?.exitDate ?? defaultExitDate(emp);
  const exitReason: ExitReason | null =
    body.exitReason !== undefined
      ? (body.exitReason as ExitReason)
      : inheritMeta?.exitReason ?? inferExitReason(emp);

  const meta: TaskMeta = {
    description: body.description ?? null,
    dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : null,
    assignedTo: body.assignedTo ?? null,
    status: "PENDING",
    notes: null,
    completedAt: null,
    sortOrder: nextOrder,
    isDefault: false,
    exitDate,
    exitReason,
  };

  const activity = await db.activity.create({
    data: {
      employeeId,
      type: "OFFBOARDING_TASK",
      title: body.title.trim(),
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "OFFBOARDING_TASK_CREATE",
      entityType: "OffboardingTask",
      entityId: activity.id,
      description: `Added offboarding task "${activity.title}" for ${emp.fullName} (${emp.employeeId}).`,
    },
  });

  return NextResponse.json(toDTO(activity), { status: 201 });
}
