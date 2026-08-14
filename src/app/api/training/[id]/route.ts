import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  toCourseDTO,
  parseEnrollmentMeta,
  TRAINING_CONSTANTS,
  type CourseMeta,
  type CourseStatus,
} from "../route";

const { VALID_COURSE_STATUSES } = TRAINING_CONSTANTS;

function parseCourseMeta(description: string | null): CourseMeta {
  const fallback: CourseMeta = {
    description: null,
    trainer: null,
    startDate: null,
    endDate: null,
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
      status: (parsed.status as CourseStatus) ?? "SCHEDULED",
    };
  } catch {
    return fallback;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity || activity.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }
  const enrollments = await db.activity.count({
    where: {
      type: "TRAINING_ENROLLMENT",
      AND: [
        {
          // crude contains match since courseId lives inside the description JSON
          description: { contains: `"courseId":"${id}"` },
        },
      ],
    },
  });
  // Note: above count includes DROPPED enrollments; we filter below for accuracy.
  const allEnrollments = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      description: { contains: `"courseId":"${id}"` },
    },
    select: { description: true },
  });
  const activeCount = allEnrollments
    .map((e) => parseEnrollmentMeta(e.description))
    .filter((m) => m.status !== "DROPPED").length;

  return NextResponse.json(toCourseDTO(activity, activeCount));
  void enrollments;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  const meta = parseCourseMeta(existing.description);

  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) {
      return NextResponse.json(
        { error: "title cannot be empty" },
        { status: 400 }
      );
    }
  }
  if (body.description !== undefined) {
    meta.description =
      body.description === null || body.description === ""
        ? null
        : String(body.description);
  }
  if (body.trainer !== undefined) {
    meta.trainer =
      body.trainer === null || body.trainer === ""
        ? null
        : String(body.trainer);
  }
  if (body.startDate !== undefined) {
    meta.startDate = body.startDate
      ? new Date(body.startDate).toISOString()
      : null;
  }
  if (body.endDate !== undefined) {
    meta.endDate = body.endDate
      ? new Date(body.endDate).toISOString()
      : null;
  }
  if (body.duration !== undefined) {
    meta.duration = String(body.duration ?? "");
  }
  if (body.capacity !== undefined) {
    meta.capacity = Math.max(0, Number(body.capacity ?? 0) || 0);
  }
  if (body.category !== undefined) {
    meta.category = String(body.category ?? "General") || "General";
  }
  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase() as CourseStatus;
    if (!VALID_COURSE_STATUSES.includes(s)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_COURSE_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    meta.status = s;
  }

  const newTitle =
    body.title !== undefined ? String(body.title).trim() : existing.title;

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: newTitle,
      description: JSON.stringify(meta),
    },
  });

  // If the course title was changed, propagate to enrollments.
  if (newTitle !== existing.title) {
    const enrollments = await db.activity.findMany({
      where: {
        type: "TRAINING_ENROLLMENT",
        description: { contains: `"courseId":"${id}"` },
      },
      select: { id: true, description: true },
    });
    for (const e of enrollments) {
      const m = parseEnrollmentMeta(e.description);
      m.courseTitle = newTitle;
      await db.activity.update({
        where: { id: e.id },
        data: { description: JSON.stringify(m) },
      });
    }
  }

  await db.auditLog.create({
    data: {
      action: "TRAINING_COURSE_UPDATE",
      entityType: "TrainingCourse",
      entityId: id,
      description: `Updated training course "${newTitle}".`,
    },
  });

  return NextResponse.json(toCourseDTO(updated, 0));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  // Cascade delete enrollments
  const enrollments = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      description: { contains: `"courseId":"${id}"` },
    },
    select: { id: true },
  });
  if (enrollments.length > 0) {
    await db.activity.deleteMany({
      where: { id: { in: enrollments.map((e) => e.id) } },
    });
  }

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "TRAINING_COURSE_DELETE",
      entityType: "TrainingCourse",
      entityId: id,
      description: `Deleted training course "${existing.title}" and ${enrollments.length} enrollment(s).`,
    },
  });

  return NextResponse.json({ ok: true });
}
