import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { OffboardingStatus, ExitReason } from "../route";

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

const VALID_STATUSES: OffboardingStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
];

const VALID_REASONS: ExitReason[] = [
  "RESIGNATION",
  "TERMINATION",
  "CONTRACT_END",
  "RETIREMENT",
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
    exitDate: m.exitDate,
    exitReason: m.exitReason,
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
  if (!existing || existing.type !== "OFFBOARDING_TASK") {
    return NextResponse.json(
      { error: "Offboarding task not found" },
      { status: 404 }
    );
  }

  const meta = parseMeta(existing.description);

  // Status transition (no enforcement — caller may set any valid status).
  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as OffboardingStatus;
    if (!VALID_STATUSES.includes(s)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.status = s;
    if (s === "COMPLETED" && !meta.completedAt) {
      meta.completedAt = body.completedAt
        ? new Date(body.completedAt).toISOString()
        : new Date().toISOString();
    }
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
    meta.notes =
      body.notes === null || body.notes === "" ? null : String(body.notes);
  }

  if (body.dueDate !== undefined) {
    meta.dueDate = body.dueDate ? new Date(body.dueDate).toISOString() : null;
  }

  if (body.assignedTo !== undefined) {
    meta.assignedTo = body.assignedTo || null;
  }
  if (body.description !== undefined) {
    meta.description = body.description || null;
  }

  // Exit context edits — broadcast to all sibling offboarding tasks for
  // the same employee so the entire checklist shares one exit date/reason.
  let broadcastTarget: { employeeId: string | null } | null = null;
  if (body.exitDate !== undefined || body.exitReason !== undefined) {
    if (body.exitDate !== undefined) {
      meta.exitDate = body.exitDate
        ? new Date(body.exitDate).toISOString()
        : null;
    }
    if (body.exitReason !== undefined) {
      const r = String(body.exitReason).toUpperCase() as ExitReason;
      if (!VALID_REASONS.includes(r)) {
        return NextResponse.json(
          {
            error: `Invalid exitReason. Must be one of: ${VALID_REASONS.join(", ")}`,
          },
          { status: 400 }
        );
      }
      meta.exitReason = r;
    }
    broadcastTarget = { employeeId: existing.employeeId };
  }

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
  });

  // Broadcast exit date/reason updates to every sibling offboarding task
  // (so the entire checklist shows the same exit context).
  if (broadcastTarget?.employeeId) {
    const siblings = await db.activity.findMany({
      where: {
        type: "OFFBOARDING_TASK",
        employeeId: broadcastTarget.employeeId,
        NOT: { id },
      },
      select: { id: true, description: true },
    });
    for (const sib of siblings) {
      const m = parseMeta(sib.description);
      if (body.exitDate !== undefined) m.exitDate = meta.exitDate;
      if (body.exitReason !== undefined) m.exitReason = meta.exitReason;
      await db.activity.update({
        where: { id: sib.id },
        data: { description: JSON.stringify(m) },
      });
    }
  }

  await db.auditLog.create({
    data: {
      action: "OFFBOARDING_TASK_UPDATE",
      entityType: "OffboardingTask",
      entityId: id,
      description: `Updated offboarding task "${existing.title}"${
        body.status ? ` → ${body.status}` : ""
      } for ${existing.employee?.fullName ?? existing.employeeId}.`,
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
  if (!existing || existing.type !== "OFFBOARDING_TASK") {
    return NextResponse.json(
      { error: "Offboarding task not found" },
      { status: 404 }
    );
  }

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "OFFBOARDING_TASK_DELETE",
      entityType: "OffboardingTask",
      entityId: id,
      description: `Deleted offboarding task "${existing.title}" for ${
        existing.employee?.fullName ?? existing.employeeId
      }.`,
    },
  });

  return NextResponse.json({ ok: true });
}
