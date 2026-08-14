import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Onboarding tasks are stored in the Activity model with a
// creative workaround:
//   type        = "ONBOARDING_TASK"
//   employeeId  = the employee being onboarded
//   title       = the task title
//   description = JSON string {
//                   description,
//                   dueDate,
//                   assignedTo,
//                   status,         // PENDING | IN_PROGRESS | COMPLETED | SKIPPED
//                   notes,
//                   completedAt,
//                   sortOrder,
//                   isDefault      // boolean — seeded from defaults
//                 }
// ============================================================

export type OnboardingStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

export interface OnboardingTaskDTO {
  id: string;
  employeeId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status: OnboardingStatus;
  notes?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskMeta {
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status: OnboardingStatus;
  notes?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  isDefault: boolean;
}

const DEFAULT_TASKS: {
  title: string;
  description: string;
  assignedTo: string;
  dueOffsetDays?: number; // days after joining date
}[] = [
  {
    title: "Collect ID and personal documents",
    description: "Gather government ID, proofs, and personal information forms.",
    assignedTo: "HR",
  },
  {
    title: "Set up official email account",
    description: "Provision the employee's company email and credentials.",
    assignedTo: "IT",
  },
  {
    title: "Provide employee handbook",
    description: "Share the employee handbook and acknowledge receipt.",
    assignedTo: "HR",
  },
  {
    title: "Conduct office tour",
    description: "Walk through the office, facilities, and emergency exits.",
    assignedTo: "HR",
  },
  {
    title: "Set up workstation and equipment",
    description: "Provision laptop, monitor, peripherals, and access cards.",
    assignedTo: "IT",
  },
  {
    title: "Introduce to team members",
    description: "Meet the immediate team and key cross-functional partners.",
    assignedTo: "Manager",
  },
  {
    title: "Complete tax forms",
    description: "Fill out tax declaration and statutory forms.",
    assignedTo: "Finance",
  },
  {
    title: "Set up payroll and bank details",
    description: "Collect bank account info and configure payroll.",
    assignedTo: "Finance",
  },
  {
    title: "Schedule orientation session",
    description: "Book the next HR orientation cohort.",
    assignedTo: "HR",
  },
  {
    title: "First week check-in",
    description: "Manager 1:1 to review the first week and answer questions.",
    assignedTo: "Manager",
    dueOffsetDays: 7,
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
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      description: parsed.description ?? null,
      dueDate: parsed.dueDate ?? null,
      assignedTo: parsed.assignedTo ?? null,
      status: (parsed.status as OnboardingStatus) ?? "PENDING",
      notes: parsed.notes ?? null,
      completedAt: parsed.completedAt ?? null,
      sortOrder: typeof parsed.sortOrder === "number" ? parsed.sortOrder : 0,
      isDefault: Boolean(parsed.isDefault),
    };
  } catch {
    // Legacy Activity rows (description was plain text) — treat as a free-form PENDING task.
    return { ...fallback, description };
  }
}

function toDTO(a: any): OnboardingTaskDTO {
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
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

async function ensureDefaultsForEmployee(employeeId: string) {
  // Idempotent: only seed if zero ONBOARDING_TASK rows exist for this employee.
  const existing = await db.activity.count({
    where: { type: "ONBOARDING_TASK", employeeId },
  });
  if (existing > 0) return;

  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: { joiningDate: true },
  });

  const joiningDate = emp?.joiningDate ? new Date(emp.joiningDate) : new Date();
  if (isNaN(joiningDate.getTime())) joiningDate.setTime(Date.now());

  await db.activity.createMany({
    data: DEFAULT_TASKS.map((t, idx) => {
      const meta: TaskMeta = {
        description: t.description,
        dueDate: t.dueOffsetDays
          ? new Date(
              joiningDate.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : null,
        assignedTo: t.assignedTo,
        status: "PENDING",
        notes: null,
        completedAt: null,
        sortOrder: idx,
        isDefault: true,
      };
      return {
        employeeId,
        type: "ONBOARDING_TASK",
        title: t.title,
        description: JSON.stringify(meta),
      };
    }),
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

  // Auto-seed default onboarding tasks on first GET.
  try {
    await ensureDefaultsForEmployee(employeeId);
  } catch (err) {
    // If the employee doesn't exist, surface a 404-ish error.
    return NextResponse.json(
      { error: "Employee not found — cannot seed onboarding tasks.", detail: String(err) },
      { status: 404 }
    );
  }

  const where: any = { type: "ONBOARDING_TASK", employeeId };
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

  // Verify employee exists.
  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, fullName: true, employeeId: true, joiningDate: true },
  });
  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Ensure defaults exist first (so custom tasks are appended after the defaults).
  await ensureDefaultsForEmployee(employeeId);

  // Compute next sortOrder for this employee.
  const existing = await db.activity.findMany({
    where: { type: "ONBOARDING_TASK", employeeId },
    select: { description: true },
  });
  const orders = existing
    .map((a) => parseMeta(a.description).sortOrder)
    .filter((n) => typeof n === "number");
  const nextOrder = orders.length ? Math.max(...orders) + 1 : 0;

  const meta: TaskMeta = {
    description: body.description ?? null,
    dueDate: body.dueDate
      ? new Date(body.dueDate).toISOString()
      : null,
    assignedTo: body.assignedTo ?? null,
    status: "PENDING",
    notes: null,
    completedAt: null,
    sortOrder: nextOrder,
    isDefault: false,
  };

  const activity = await db.activity.create({
    data: {
      employeeId,
      type: "ONBOARDING_TASK",
      title: body.title.trim(),
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "ONBOARDING_TASK_CREATE",
      entityType: "OnboardingTask",
      entityId: activity.id,
      description: `Added onboarding task "${activity.title}" for ${emp.fullName} (${emp.employeeId}).`,
    },
  });

  return NextResponse.json(toDTO(activity), { status: 201 });
}
