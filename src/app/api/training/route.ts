import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// Training data is stored in the Activity model:
//
// COURSES
//   type        = "TRAINING_COURSE"
//   title       = course title
//   description = JSON string {
//                   description,
//                   trainer,
//                   startDate,        // ISO | null
//                   endDate,          // ISO | null
//                   duration,         // string (e.g. "8 hours", "2 days")
//                   capacity,         // number
//                   category,         // string (e.g. "Technical", "Soft Skills")
//                   status            // SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
//                 }
//   employeeId  = null
//
// ENROLLMENTS
//   type        = "TRAINING_ENROLLMENT"
//   title       = `Enrollment: <course title>`
//   description = JSON string {
//                   courseId,
//                   courseTitle,
//                   enrolledAt,       // ISO
//                   completedAt,      // ISO | null
//                   score,            // number | null
//                   certificate,      // string | null
//                   status            // ENROLLED | COMPLETED | DROPPED
//                 }
//   employeeId  = the enrolled employee
// ============================================================

export type CourseStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type EnrollmentStatus = "ENROLLED" | "COMPLETED" | "DROPPED";

export interface CourseDTO {
  id: string;
  title: string;
  description: string | null;
  trainer: string | null;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  capacity: number;
  enrolledCount: number;
  status: CourseStatus;
  category: string;
  createdAt: string;
}

interface CourseMeta {
  description: string | null;
  trainer: string | null;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  capacity: number;
  category: string;
  status: CourseStatus;
}

export type { CourseMeta };

const VALID_COURSE_STATUSES: CourseStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const VALID_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  "ENROLLED",
  "COMPLETED",
  "DROPPED",
];

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

export function toCourseDTO(a: any, enrolledCount = 0): CourseDTO {
  const m = parseCourseMeta(a.description);
  return {
    id: a.id,
    title: a.title,
    description: m.description,
    trainer: m.trainer,
    startDate: m.startDate,
    endDate: m.endDate,
    duration: m.duration,
    capacity: m.capacity,
    enrolledCount,
    status: m.status,
    category: m.category,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

interface EnrollmentMeta {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  certificate: string | null;
  status: EnrollmentStatus;
}

export type { EnrollmentMeta };

export function parseEnrollmentMeta(
  description: string | null
): EnrollmentMeta {
  const fallback: EnrollmentMeta = {
    courseId: "",
    courseTitle: "",
    enrolledAt: new Date().toISOString(),
    completedAt: null,
    score: null,
    certificate: null,
    status: "ENROLLED",
  };
  if (!description) return fallback;
  try {
    const parsed = JSON.parse(description);
    return {
      courseId: String(parsed.courseId ?? ""),
      courseTitle: String(parsed.courseTitle ?? ""),
      enrolledAt: parsed.enrolledAt ?? new Date().toISOString(),
      completedAt: parsed.completedAt ?? null,
      score:
        parsed.score === null || parsed.score === undefined
          ? null
          : Number(parsed.score),
      certificate: parsed.certificate ?? null,
      status: (parsed.status as EnrollmentStatus) ?? "ENROLLED",
    };
  } catch {
    return fallback;
  }
}

export interface EnrollmentDTO {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName: string | null;
  employeeCode: string | null;
  photo: string | null;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  certificate: string | null;
  status: EnrollmentStatus;
}

export function toEnrollmentDTO(
  a: any,
  employee?: {
    fullName: string;
    employeeId: string;
    photo?: string | null;
  } | null
): EnrollmentDTO {
  const m = parseEnrollmentMeta(a.description);
  return {
    id: a.id,
    courseId: m.courseId,
    courseTitle: m.courseTitle,
    employeeId: a.employeeId ?? "",
    employeeName: employee?.fullName ?? null,
    employeeCode: employee?.employeeId ?? null,
    photo: employee?.photo ?? null,
    enrolledAt: m.enrolledAt,
    completedAt: m.completedAt,
    score: m.score,
    certificate: m.certificate,
    status: m.status,
  };
}

export const TRAINING_CONSTANTS = {
  VALID_COURSE_STATUSES,
  VALID_ENROLLMENT_STATUSES,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").toUpperCase();
  const search = (searchParams.get("search") || "").toLowerCase();

  const where: any = { type: "TRAINING_COURSE" };
  const courses = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Get enrollment counts per course (only ENROLLED or COMPLETED count toward capacity).
  const enrollments = await db.activity.findMany({
    where: { type: "TRAINING_ENROLLMENT" },
    select: { description: true },
  });

  const countByCourse: Record<string, number> = {};
  for (const e of enrollments) {
    const m = parseEnrollmentMeta(e.description);
    if (!m.courseId) continue;
    if (m.status === "DROPPED") continue;
    countByCourse[m.courseId] = (countByCourse[m.courseId] ?? 0) + 1;
  }

  let courseDTOs = courses.map((c) => toCourseDTO(c, countByCourse[c.id] ?? 0));

  if (status) courseDTOs = courseDTOs.filter((c) => c.status === status);
  if (search) {
    courseDTOs = courseDTOs.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        (c.description ?? "").toLowerCase().includes(search) ||
        (c.trainer ?? "").toLowerCase().includes(search) ||
        c.category.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ items: courseDTOs, total: courseDTOs.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const title = (body.title ?? "").toString().trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const status: CourseStatus = VALID_COURSE_STATUSES.includes(
    String(body.status ?? "SCHEDULED").toUpperCase() as CourseStatus
  )
    ? (String(body.status ?? "SCHEDULED").toUpperCase() as CourseStatus)
    : "SCHEDULED";

  const meta: CourseMeta = {
    description:
      body.description === null || body.description === ""
        ? null
        : String(body.description ?? null),
    trainer:
      body.trainer === null || body.trainer === ""
        ? null
        : String(body.trainer ?? null),
    startDate: body.startDate ? new Date(body.startDate).toISOString() : null,
    endDate: body.endDate ? new Date(body.endDate).toISOString() : null,
    duration: String(body.duration ?? ""),
    capacity: Math.max(0, Number(body.capacity ?? 0) || 0),
    category: String(body.category ?? "General") || "General",
    status,
  };

  const activity = await db.activity.create({
    data: {
      type: "TRAINING_COURSE",
      title,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "TRAINING_COURSE_CREATE",
      entityType: "TrainingCourse",
      entityId: activity.id,
      description: `Created training course "${title}" (category: ${meta.category}, capacity: ${meta.capacity}).`,
    },
  });

  const dto = toCourseDTO(activity, 0);
  return NextResponse.json(dto, { status: 201 });
}
