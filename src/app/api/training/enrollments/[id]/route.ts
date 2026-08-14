import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toEnrollmentDTO,
  parseEnrollmentMeta,
  TRAINING_CONSTANTS,
  type EnrollmentMeta,
} from "../../route";

const { VALID_ENROLLMENT_STATUSES } = TRAINING_CONSTANTS;

// PATCH /api/training/enrollments/[id]
// Body: { status?: ENROLLED|COMPLETED|DROPPED, score?: number|null, certificate?: string|null, completedAt?: string|null }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({
    where: { id },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });
  if (!existing || existing.type !== "TRAINING_ENROLLMENT") {
    return NextResponse.json(
      { error: "Enrollment not found" },
      { status: 404 }
    );
  }

  const meta: EnrollmentMeta = parseEnrollmentMeta(existing.description);

  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as EnrollmentMeta["status"];
    if (!VALID_ENROLLMENT_STATUSES.includes(s)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_ENROLLMENT_STATUSES.join(", ")}`,
        },
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

  if (body.score !== undefined) {
    meta.score =
      body.score === null || body.score === ""
        ? null
        : Number(body.score);
    if (Number.isNaN(meta.score as number)) meta.score = null;
  }
  if (body.certificate !== undefined) {
    meta.certificate =
      body.certificate === null || body.certificate === ""
        ? null
        : String(body.certificate);
  }
  if (body.completedAt !== undefined) {
    meta.completedAt = body.completedAt
      ? new Date(body.completedAt).toISOString()
      : null;
  }

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "TRAINING_ENROLLMENT_UPDATE",
      entityType: "TrainingEnrollment",
      entityId: id,
      description: `Updated enrollment for ${
        updated.employee?.fullName ?? existing.employeeId
      } in "${meta.courseTitle}" (status: ${meta.status}).`,
    },
  });

  return NextResponse.json(toEnrollmentDTO(updated, updated.employee));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "TRAINING_ENROLLMENT") {
    return NextResponse.json(
      { error: "Enrollment not found" },
      { status: 404 }
    );
  }
  const meta = parseEnrollmentMeta(existing.description);

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "TRAINING_ENROLLMENT_DELETE",
      entityType: "TrainingEnrollment",
      entityId: id,
      description: `Deleted enrollment for "${meta.courseTitle}".`,
    },
  });

  return NextResponse.json({ ok: true });
}
