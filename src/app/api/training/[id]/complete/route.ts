import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toEnrollmentDTO,
  parseEnrollmentMeta,
  type EnrollmentMeta,
} from "../../route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const body = await req.json();

  const employeeId = (body.employeeId ?? "").toString().trim();
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }

  // Validate course
  const course = await db.activity.findUnique({ where: { id: courseId } });
  if (!course || course.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  // Find this employee's enrollment for this course.
  const candidates = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      employeeId,
      description: { contains: `"courseId":"${courseId}"` },
    },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });

  const enrollment = candidates.find(
    (a) => parseEnrollmentMeta(a.description).courseId === courseId
  );

  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found for this employee" },
      { status: 404 }
    );
  }

  const meta: EnrollmentMeta = parseEnrollmentMeta(enrollment.description);
  meta.status = "COMPLETED";
  meta.completedAt = new Date().toISOString();
  meta.score =
    body.score === null || body.score === undefined
      ? null
      : Number(body.score);
  if (Number.isNaN(meta.score as number)) meta.score = null;
  meta.certificate =
    body.certificate === null || body.certificate === ""
      ? null
      : String(body.certificate);

  const updated = await db.activity.update({
    where: { id: enrollment.id },
    data: { description: JSON.stringify(meta) },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "TRAINING_COMPLETE",
      entityType: "TrainingEnrollment",
      entityId: enrollment.id,
      description: `Marked ${updated.employee?.fullName ?? employeeId} as completed course "${course.title}"${
        meta.score !== null ? ` (score: ${meta.score})` : ""
      }.`,
    },
  });

  return NextResponse.json(toEnrollmentDTO(updated, updated.employee));
}
