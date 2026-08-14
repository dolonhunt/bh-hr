import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseInterviewMeta,
  toInterviewDTO,
  type InterviewStatus,
  type InterviewType,
} from "../route";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity || activity.type !== "INTERVIEW") {
    return NextResponse.json(
      { error: "Interview not found" },
      { status: 404 }
    );
  }
  const dto = toInterviewDTO(activity);
  if (!dto) {
    return NextResponse.json(
      { error: "Interview metadata is corrupted" },
      { status: 500 }
    );
  }
  return NextResponse.json(dto);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "INTERVIEW") {
    return NextResponse.json(
      { error: "Interview not found" },
      { status: 404 }
    );
  }

  const meta = parseInterviewMeta(existing.description);
  if (!meta) {
    return NextResponse.json(
      { error: "Interview metadata is corrupted" },
      { status: 500 }
    );
  }

  // Validate + apply partial updates.
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.type = body.type;
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.status = body.status;
  }

  if (body.scheduledAt !== undefined) {
    const d = new Date(body.scheduledAt);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt is not a valid date" },
        { status: 400 }
      );
    }
    meta.scheduledAt = d.toISOString();
  }

  if (body.duration !== undefined) {
    const n = Number(body.duration);
    if (isNaN(n) || n <= 0) {
      return NextResponse.json(
        { error: "duration must be a positive number" },
        { status: 400 }
      );
    }
    meta.duration = n;
  }

  if (body.location !== undefined) {
    meta.location = body.location || null;
  }
  if (body.meetingLink !== undefined) {
    meta.meetingLink = body.meetingLink || null;
  }
  if (body.notes !== undefined) {
    meta.notes = body.notes || null;
  }

  // Re-resolve candidate/job/interviewer names if their IDs changed.
  if (body.candidateId !== undefined && body.candidateId !== meta.candidateId) {
    const cand = await db.candidate.findUnique({
      where: { id: body.candidateId },
      select: { id: true, name: true, jobId: true },
    });
    if (!cand) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    meta.candidateId = cand.id;
    meta.candidateName = cand.name;
  }

  if (body.jobId !== undefined) {
    if (body.jobId) {
      const job = await db.job.findUnique({
        where: { id: body.jobId },
        select: { title: true },
      });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      meta.jobId = body.jobId;
      meta.jobTitle = job.title;
    } else {
      meta.jobId = null;
      meta.jobTitle = null;
    }
  }

  if (body.interviewerId !== undefined) {
    if (body.interviewerId) {
      const emp = await db.employee.findUnique({
        where: { id: body.interviewerId },
        select: { id: true, fullName: true },
      });
      if (!emp) {
        return NextResponse.json(
          { error: "Interviewer (employee) not found" },
          { status: 404 }
        );
      }
      meta.interviewerId = emp.id;
      meta.interviewerName = emp.fullName;
    } else {
      meta.interviewerId = null;
      meta.interviewerName = null;
    }
  }

  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (body.rating !== null && (isNaN(r) || r < 1 || r > 5)) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5 (or null)" },
        { status: 400 }
      );
    }
    meta.rating = body.rating === null ? null : r;
  }

  if (body.recommendation !== undefined) {
    if (!["HIRE", "REJECT", "HOLD", null].includes(body.recommendation)) {
      return NextResponse.json(
        { error: "recommendation must be HIRE, REJECT, HOLD or null" },
        { status: 400 }
      );
    }
    meta.recommendation = body.recommendation || null;
  }

  // Refresh title so it stays in sync with denormalised names.
  const newTitle = `Interview — ${meta.candidateName} — ${
    meta.jobTitle ?? "General"
  }`;

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: newTitle,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "INTERVIEW_UPDATE",
      entityType: "Interview",
      entityId: id,
      description: `Updated interview for ${meta.candidateName}${
        body.status ? ` → ${body.status}` : ""
      }.`,
    },
  });

  return NextResponse.json(toInterviewDTO(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "INTERVIEW") {
    return NextResponse.json(
      { error: "Interview not found" },
      { status: 404 }
    );
  }
  const meta = parseInterviewMeta(existing.description);

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "INTERVIEW_DELETE",
      entityType: "Interview",
      entityId: id,
      description: `Deleted interview for ${
        meta?.candidateName ?? "unknown candidate"
      }.`,
    },
  });

  return NextResponse.json({ ok: true });
}
