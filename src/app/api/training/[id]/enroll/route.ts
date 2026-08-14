import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toEnrollmentDTO,
  parseEnrollmentMeta,
  type EnrollmentMeta,
  type EnrollmentStatus,
} from "../../route";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Confirm course exists.
  const course = await db.activity.findUnique({ where: { id } });
  if (!course || course.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  // Find enrollments for this course by filtering on the JSON courseId.
  const all = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      description: { contains: `"courseId":"${id}"` },
    },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter accurately by parsed courseId (avoid substring false positives).
  const items = all
    .filter((a) => parseEnrollmentMeta(a.description).courseId === id)
    .map((a) => toEnrollmentDTO(a, a.employee));

  return NextResponse.json({ items, total: items.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const employeeIds: string[] = Array.isArray(body.employeeIds)
    ? body.employeeIds
    : body.employeeId
      ? [body.employeeId]
      : [];

  if (employeeIds.length === 0) {
    return NextResponse.json(
      { error: "employeeId (or employeeIds[]) is required" },
      { status: 400 }
    );
  }

  // Validate course
  const course = await db.activity.findUnique({ where: { id } });
  if (!course || course.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  // Validate all employees exist
  const employees = await db.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, fullName: true, employeeId: true },
  });
  if (employees.length !== employeeIds.length) {
    return NextResponse.json(
      { error: "One or more employees not found" },
      { status: 404 }
    );
  }

  // Find existing enrollments for this course to dedupe.
  const existing = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      description: { contains: `"courseId":"${id}"` },
    },
    select: { id: true, description: true, employeeId: true },
  });

  const existingByEmployee = new Map<string, EnrollmentMeta>();
  for (const e of existing) {
    if (!e.employeeId) continue;
    const m = parseEnrollmentMeta(e.description);
    if (m.courseId === id) {
      existingByEmployee.set(e.employeeId, m);
    }
  }

  // Capacity check
  const activeEnrolled = Array.from(existingByEmployee.values()).filter(
    (m) => m.status !== "DROPPED"
  ).length;
  const newActive = employees.filter(
    (e) => !existingByEmployee.has(e.id) || existingByEmployee.get(e.id)?.status === "DROPPED"
  ).length;
  const courseMeta = JSON.parse(course.description ?? "{}");
  const capacity = Number(courseMeta.capacity ?? 0) || 0;
  if (capacity > 0 && activeEnrolled + newActive > capacity) {
    return NextResponse.json(
      {
        error: `Course capacity exceeded. Capacity: ${capacity}, currently enrolled: ${activeEnrolled}, attempting to add ${newActive}.`,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const created: any[] = [];

  for (const emp of employees) {
    const existingMeta = existingByEmployee.get(emp.id);
    if (existingMeta && existingMeta.status !== "DROPPED") {
      // Already enrolled — skip silently.
      continue;
    }

    const meta: EnrollmentMeta = {
      courseId: id,
      courseTitle: course.title,
      enrolledAt: now,
      completedAt: null,
      score: null,
      certificate: null,
      status: "ENROLLED" as EnrollmentStatus,
    };

    const activity = await db.activity.create({
      data: {
        type: "TRAINING_ENROLLMENT",
        employeeId: emp.id,
        title: `Enrollment: ${course.title}`,
        description: JSON.stringify(meta),
      },
      include: {
        employee: {
          select: { fullName: true, employeeId: true, photo: true },
        },
      },
    });

    created.push(activity);

    await db.auditLog.create({
      data: {
        action: "TRAINING_ENROLL",
        entityType: "TrainingEnrollment",
        entityId: activity.id,
        description: `Enrolled ${emp.fullName} (${emp.employeeId}) in course "${course.title}".`,
      },
    });
  }

  return NextResponse.json(
    {
      enrolled: created.length,
      items: created.map((a) => toEnrollmentDTO(a, a.employee)),
    },
    { status: 201 }
  );
}
