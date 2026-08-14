import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// INTERVIEWS are stored as Activity rows:
//   type        = "INTERVIEW"
//   title       = `Interview — {candidateName} — {jobTitle}`
//   description = JSON {
//                    candidateId, candidateName,
//                    jobId, jobTitle,
//                    interviewerId, interviewerName,
//                    scheduledAt,         // ISO datetime
//                    duration,            // minutes (number)
//                    type,                // PHONE | VIDEO | ONSITE | TECHNICAL | HR | FINAL
//                    location,            // optional string
//                    meetingLink,         // optional string (video call URL)
//                    status,              // SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
//                    notes,               // optional string
//                    rating,              // 1-5 number | null
//                    recommendation,      // HIRE | REJECT | HOLD | null
//                  }
//   employeeId  = null (interviews are not employee-bound)
// ============================================================

export type InterviewType =
  | "PHONE"
  | "VIDEO"
  | "ONSITE"
  | "TECHNICAL"
  | "HR"
  | "FINAL";

export type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type InterviewRecommendation = "HIRE" | "REJECT" | "HOLD";

export interface InterviewDTO {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string | null;
  jobTitle: string | null;
  interviewerId: string | null;
  interviewerName: string | null;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  location?: string | null;
  meetingLink?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  rating?: number | null;
  recommendation?: InterviewRecommendation | null;
  createdAt: string;
}

interface InterviewMeta {
  candidateId: string;
  candidateName: string;
  jobId?: string | null;
  jobTitle?: string | null;
  interviewerId?: string | null;
  interviewerName?: string | null;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  location?: string | null;
  meetingLink?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  rating?: number | null;
  recommendation?: InterviewRecommendation | null;
}

const VALID_TYPES: InterviewType[] = [
  "PHONE",
  "VIDEO",
  "ONSITE",
  "TECHNICAL",
  "HR",
  "FINAL",
];

const VALID_STATUSES: InterviewStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export function parseInterviewMeta(description: string | null): InterviewMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    if (!p || typeof p !== "object" || !p.candidateId || !p.scheduledAt) return null;
    return {
      candidateId: String(p.candidateId),
      candidateName: String(p.candidateName ?? "Unknown"),
      jobId: p.jobId ?? null,
      jobTitle: p.jobTitle ?? null,
      interviewerId: p.interviewerId ?? null,
      interviewerName: p.interviewerName ?? null,
      scheduledAt: String(p.scheduledAt),
      duration: typeof p.duration === "number" ? p.duration : 30,
      type: (VALID_TYPES.includes(p.type) ? p.type : "PHONE") as InterviewType,
      location: p.location ?? null,
      meetingLink: p.meetingLink ?? null,
      status: (VALID_STATUSES.includes(p.status) ? p.status : "SCHEDULED") as InterviewStatus,
      notes: p.notes ?? null,
      rating:
        typeof p.rating === "number" && p.rating >= 1 && p.rating <= 5
          ? p.rating
          : null,
      recommendation: (["HIRE", "REJECT", "HOLD"].includes(p.recommendation)
        ? p.recommendation
        : null) as InterviewRecommendation | null,
    };
  } catch {
    return null;
  }
}

export function toInterviewDTO(a: any): InterviewDTO | null {
  const m = parseInterviewMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    candidateId: m.candidateId,
    candidateName: m.candidateName,
    jobId: m.jobId ?? null,
    jobTitle: m.jobTitle ?? null,
    interviewerId: m.interviewerId ?? null,
    interviewerName: m.interviewerName ?? null,
    scheduledAt: m.scheduledAt,
    duration: m.duration,
    type: m.type,
    location: m.location ?? null,
    meetingLink: m.meetingLink ?? null,
    status: m.status,
    notes: m.notes ?? null,
    rating: m.rating ?? null,
    recommendation: m.recommendation ?? null,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId") || "";
  const jobId = searchParams.get("jobId") || "";
  const status = (searchParams.get("status") || "").toUpperCase();
  const date = searchParams.get("date") || ""; // YYYY-MM-DD filter on scheduledAt
  const search = (searchParams.get("search") || "").toLowerCase();

  const where: any = { type: "INTERVIEW" };
  if (status && VALID_STATUSES.includes(status as InterviewStatus)) {
    where.description = { contains: `"status":"${status}"` };
  }
  // Other filters operate on the JSON payload; applied post-fetch below.

  const activities = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  let interviews = activities
    .map(toInterviewDTO)
    .filter((x): x is InterviewDTO => x !== null);

  if (candidateId) {
    interviews = interviews.filter((i) => i.candidateId === candidateId);
  }
  if (jobId) {
    interviews = interviews.filter((i) => i.jobId === jobId);
  }
  if (date) {
    interviews = interviews.filter((i) => i.scheduledAt.startsWith(date));
  }
  if (search) {
    interviews = interviews.filter((i) =>
      [i.candidateName, i.jobTitle, i.interviewerName, i.location, i.type]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(search))
    );
  }

  // Sort by scheduledAt descending (most recent first).
  interviews.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  return NextResponse.json({
    items: interviews,
    total: interviews.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate required fields.
  if (!body.candidateId) {
    return NextResponse.json(
      { error: "candidateId is required" },
      { status: 400 }
    );
  }
  if (!body.scheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt is required" },
      { status: 400 }
    );
  }
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Resolve candidate name + job title for denormalised storage (so list
  // views don't need to N+1 fetch candidates/jobs).
  const candidate = await db.candidate.findUnique({
    where: { id: body.candidateId },
    select: { id: true, name: true, jobId: true },
  });
  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate not found" },
      { status: 404 }
    );
  }

  let jobTitle: string | null = null;
  const jobId = body.jobId || candidate.jobId || null;
  if (jobId) {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { title: true },
    });
    jobTitle = job?.title ?? null;
  }

  // Resolve interviewer name (if an employee id was supplied).
  let interviewerName: string | null = null;
  if (body.interviewerId) {
    const emp = await db.employee.findUnique({
      where: { id: body.interviewerId },
      select: { id: true, fullName: true },
    });
    interviewerName = emp?.fullName ?? null;
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json(
      { error: "scheduledAt is not a valid date" },
      { status: 400 }
    );
  }

  const meta: InterviewMeta = {
    candidateId: candidate.id,
    candidateName: candidate.name,
    jobId,
    jobTitle,
    interviewerId: body.interviewerId || null,
    interviewerName,
    scheduledAt: scheduledAt.toISOString(),
    duration: typeof body.duration === "number" ? body.duration : 30,
    type: body.type,
    location: body.location || null,
    meetingLink: body.meetingLink || null,
    status: "SCHEDULED",
    notes: body.notes || null,
    rating: null,
    recommendation: null,
  };

  const activity = await db.activity.create({
    data: {
      type: "INTERVIEW",
      title: `Interview — ${candidate.name} — ${jobTitle ?? "General"}`,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "INTERVIEW_SCHEDULE",
      entityType: "Interview",
      entityId: activity.id,
      description: `Scheduled ${body.type} interview for ${candidate.name}${
        jobTitle ? ` (${jobTitle})` : ""
      } on ${scheduledAt.toLocaleString()}.`,
    },
  });

  return NextResponse.json(toInterviewDTO(activity), { status: 201 });
}
