import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { OnboardingStatus } from "../route";

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

const VALID_STATUSES: OnboardingStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
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
    return { ...fallback, description };
  }
}

function toDTO(a: any) {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true, employeeId: true } } },
  });
  if (!existing || existing.type !== "ONBOARDING_TASK") {
    return NextResponse.json(
      { error: "Onboarding task not found" },
      { status: 404 }
    );
  }

  const meta = parseMeta(existing.description);

  // Apply status transition (no enforcement — caller may set any valid status).
  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as OnboardingStatus;
    if (!VALID_STATUSES.includes(s)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.status = s;
    // Auto-set completedAt when transitioning to COMPLETED.
    if (s === "COMPLETED" && !meta.completedAt) {
      meta.completedAt = body.completedAt
        ? new Date(body.completedAt).toISOString()
        : new Date().toISOString();
    }
    // Clear completedAt when moving away from COMPLETED.
    if (s !== "COMPLETED") {
      meta.completedAt = null;
    }
  }

  if (body.completedAt !== undefined) {
    meta.completedAt = body.completedAt
      ? new Date(body.completedAt).toISOString()
      : null;
  }

  if (body.notes !== undefined) {
    meta.notes = body.notes === null || body.notes === "" ? null : String(body.notes);
  }

  if (body.dueDate !== undefined) {
    meta.dueDate = body.dueDate
      ? new Date(body.dueDate).toISOString()
      : null;
  }

  // Optional: allow re-assignment / description edits.
  if (body.assignedTo !== undefined) {
    meta.assignedTo = body.assignedTo || null;
  }
  if (body.description !== undefined) {
    meta.description = body.description || null;
  }

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
  });

  await db.auditLog.create({
    data: {
      action: "ONBOARDING_TASK_UPDATE",
      entityType: "OnboardingTask",
      entityId: id,
      description: `Updated onboarding task "${existing.title}"${body.status ? ` → ${body.status}` : ""} for ${existing.employee?.fullName ?? existing.employeeId}.`,
    },
  });

  return NextResponse.json(toDTO(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true, employeeId: true } } },
  });
  if (!existing || existing.type !== "ONBOARDING_TASK") {
    return NextResponse.json(
      { error: "Onboarding task not found" },
      { status: 404 }
    );
  }

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "ONBOARDING_TASK_DELETE",
      entityType: "OnboardingTask",
      entityId: id,
      description: `Deleted onboarding task "${existing.title}" for ${existing.employee?.fullName ?? existing.employeeId}.`,
    },
  });

  return NextResponse.json({ ok: true });
}
