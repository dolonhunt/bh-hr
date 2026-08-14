import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseEnrollmentMeta,
} from "../../route";

// ============================================================
// Training Feedback (Post-Course Surveys)
//
// Feedback records are stored in the Activity model:
//
//   type        = "TRAINING_FEEDBACK"
//   title       = <courseId>          ← stored for efficient querying
//   employeeId  = the employee who submitted (FK-valid)
//   description = JSON {
//                   courseId,
//                   courseTitle,        // denormalised for display
//                   employeeName,       // denormalised for display
//                   rating,             // 1-5
//                   content,            // overall feedback text
//                   whatWorked,         // string | null
//                   whatCouldImprove,   // string | null
//                   wouldRecommend,     // boolean
//                   submittedAt         // ISO
//                 }
//
// We use the `title` field as the indexed join key back to the course
// (avoids expensive JSON-contains queries).
// ============================================================

export interface FeedbackMeta {
  courseId: string;
  courseTitle: string;
  employeeName: string;
  rating: number;
  content: string;
  whatWorked: string | null;
  whatCouldImprove: string | null;
  wouldRecommend: boolean;
  submittedAt: string;
}

export interface FeedbackDTO {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string | null;
  rating: number;
  content: string;
  whatWorked: string | null;
  whatCouldImprove: string | null;
  wouldRecommend: boolean;
  submittedAt: string;
}

function parseFeedbackMeta(description: string | null): FeedbackMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    return {
      courseId: String(p.courseId ?? ""),
      courseTitle: String(p.courseTitle ?? ""),
      employeeName: String(p.employeeName ?? ""),
      rating: Math.max(1, Math.min(5, Math.round(Number(p.rating ?? 0)) || 0)),
      content: String(p.content ?? ""),
      whatWorked: p.whatWorked ?? null,
      whatCouldImprove: p.whatCouldImprove ?? null,
      wouldRecommend: Boolean(p.wouldRecommend),
      submittedAt: p.submittedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function toFeedbackDTO(a: any): FeedbackDTO | null {
  const m = parseFeedbackMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    courseId: m.courseId || a.title,
    employeeId: a.employeeId ?? "",
    employeeName: m.employeeName || a.employee?.fullName || null,
    rating: m.rating,
    content: m.content,
    whatWorked: m.whatWorked,
    whatCouldImprove: m.whatCouldImprove,
    wouldRecommend: m.wouldRecommend,
    submittedAt: m.submittedAt,
  };
}

export interface FeedbackSummary {
  totalResponses: number;
  avgRating: number;
  recommendCount: number;
  recommendPct: number;
  distribution: { rating: number; count: number }[];
}

function computeSummary(items: FeedbackDTO[]): FeedbackSummary {
  const totalResponses = items.length;
  const sum = items.reduce((s, x) => s + x.rating, 0);
  const avgRating =
    totalResponses > 0 ? Math.round((sum / totalResponses) * 100) / 100 : 0;
  const recommendCount = items.filter((x) => x.wouldRecommend).length;
  const recommendPct =
    totalResponses > 0
      ? Math.round((recommendCount / totalResponses) * 100)
      : 0;
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: items.filter((x) => x.rating === rating).length,
  }));
  return { totalResponses, avgRating, recommendCount, recommendPct, distribution };
}

// GET /api/training/[id]/feedback  → list feedback for a course
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

  const records = await db.activity.findMany({
    where: { type: "TRAINING_FEEDBACK", title: id },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = records
    .map(toFeedbackDTO)
    .filter((x): x is FeedbackDTO => x !== null);

  return NextResponse.json({
    items,
    total: items.length,
    summary: computeSummary(items),
  });
}

// POST /api/training/[id]/feedback  → submit feedback
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const body = await req.json();

  // Validate course exists.
  const course = await db.activity.findUnique({ where: { id: courseId } });
  if (!course || course.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  // Validate employee.
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

  // Enforce: employee must have a COMPLETED enrollment for this course.
  const candidates = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      employeeId,
      description: { contains: `"courseId":"${courseId}"` },
    },
  });
  const hasCompleted = candidates.some((a) => {
    const m = parseEnrollmentMeta(a.description);
    return m.courseId === courseId && m.status === "COMPLETED";
  });
  if (!hasCompleted) {
    return NextResponse.json(
      {
        error:
          "Employee must have a COMPLETED enrollment for this course before submitting feedback.",
      },
      { status: 400 }
    );
  }

  // Validate rating (1-5).
  const ratingRaw = Number(body.rating);
  if (
    !Number.isFinite(ratingRaw) ||
    ratingRaw < 1 ||
    ratingRaw > 5 ||
    !Number.isInteger(ratingRaw)
  ) {
    return NextResponse.json(
      { error: "rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }
  const rating = ratingRaw;

  // Validate content.
  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json(
      { error: "content (overall feedback) is required" },
      { status: 400 }
    );
  }

  const whatWorked =
    body.whatWorked === null || body.whatWorked === ""
      ? null
      : String(body.whatWorked);

  const whatCouldImprove =
    body.whatCouldImprove === null || body.whatCouldImprove === ""
      ? null
      : String(body.whatCouldImprove);

  const wouldRecommend = Boolean(body.wouldRecommend ?? false);
  const submittedAt = new Date().toISOString();

  const meta: FeedbackMeta = {
    courseId,
    courseTitle: course.title,
    employeeName: employee.fullName,
    rating,
    content,
    whatWorked,
    whatCouldImprove,
    wouldRecommend,
    submittedAt,
  };

  // Prevent duplicate feedback from the same employee for the same course.
  const existing = await db.activity.findFirst({
    where: {
      type: "TRAINING_FEEDBACK",
      title: courseId,
      employeeId,
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "This employee has already submitted feedback for this course. Update it instead.",
      },
      { status: 409 }
    );
  }

  const activity = await db.activity.create({
    data: {
      type: "TRAINING_FEEDBACK",
      title: courseId,
      employeeId,
      description: JSON.stringify(meta),
    },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "TRAINING_FEEDBACK_SUBMIT",
      entityType: "TrainingCourse",
      entityId: courseId,
      description: `${employee.fullName} submitted feedback for course "${course.title}" (${rating}★${wouldRecommend ? ", would recommend" : ""}).`,
    },
  });

  const dto = toFeedbackDTO(activity);
  return NextResponse.json(dto, { status: 201 });
}
