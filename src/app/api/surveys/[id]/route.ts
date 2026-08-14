import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseSurveyMeta,
  toSurveyDTO,
  type SurveyStatus,
  type SurveyQuestion,
  type SurveyQuestionType,
} from "../route";

const VALID_STATUSES: SurveyStatus[] = ["DRAFT", "ACTIVE", "CLOSED"];
const VALID_Q_TYPES: SurveyQuestionType[] = [
  "TEXT",
  "RATING",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
];

function genId() {
  return `q_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity || activity.type !== "SURVEY") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const survey = toSurveyDTO(activity, 0);
  if (!survey) {
    return NextResponse.json(
      { error: "Survey metadata is corrupted" },
      { status: 500 }
    );
  }

  // Fetch all responses for this survey.
  const responses = await db.activity.findMany({
    where: {
      type: "SURVEY_RESPONSE",
      description: { contains: `"surveyId":"${id}"` },
    },
    orderBy: { createdAt: "desc" },
  });

  const parsedResponses = responses
    .map((r) => {
      try {
        const m = JSON.parse(r.description || "{}");
        if (!m || m.surveyId !== id) return null;
        return {
          id: r.id,
          surveyId: m.surveyId,
          employeeId: m.employeeId ?? null,
          employeeName: m.employeeName ?? null,
          answers: Array.isArray(m.answers) ? m.answers : [],
          submittedAt:
            m.submittedAt ?? r.createdAt?.toISOString?.() ?? r.createdAt,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  survey.responseCount = parsedResponses.length;

  return NextResponse.json({ ...survey, responses: parsedResponses });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "SURVEY") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const meta = parseSurveyMeta(existing.description);
  if (!meta) {
    return NextResponse.json(
      { error: "Survey metadata is corrupted" },
      { status: 500 }
    );
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "title must be a non-empty string" },
        { status: 400 }
      );
    }
  }

  if (body.description !== undefined) {
    meta.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description
        : null;
  }

  if (body.status !== undefined) {
    const s = String(body.status).toUpperCase();
    if (!VALID_STATUSES.includes(s as SurveyStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    meta.status = s as SurveyStatus;
  }

  if (body.createdBy !== undefined) {
    meta.createdBy = body.createdBy ? String(body.createdBy) : null;
  }

  if (Array.isArray(body.questions)) {
    if (body.questions.length === 0) {
      return NextResponse.json(
        { error: "Survey must have at least one question" },
        { status: 400 }
      );
    }
    const questions: SurveyQuestion[] = [];
    for (const q of body.questions) {
      if (!q || typeof q.text !== "string" || !q.text.trim()) {
        return NextResponse.json(
          { error: "Each question must have non-empty text" },
          { status: 400 }
        );
      }
      if (!VALID_Q_TYPES.includes(q.type)) {
        return NextResponse.json(
          {
            error: `Question type must be one of: ${VALID_Q_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      if (
        (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") &&
        (!Array.isArray(q.options) || q.options.length < 2)
      ) {
        return NextResponse.json(
          { error: `Question "${q.text}" must have at least 2 options` },
          { status: 400 }
        );
      }
      questions.push({
        id: q.id || genId(),
        text: q.text.trim(),
        type: q.type,
        options:
          q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE"
            ? q.options.map(String)
            : undefined,
      });
    }
    meta.questions = questions;
  }

  const newTitle = body.title !== undefined ? body.title.trim() : existing.title;

  const updated = await db.activity.update({
    where: { id },
    data: {
      title: newTitle,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "SURVEY_UPDATE",
      entityType: "Survey",
      entityId: id,
      description: `Updated survey "${newTitle}"${
        body.status ? ` → ${body.status}` : ""
      }.`,
    },
  });

  return NextResponse.json(toSurveyDTO(updated, 0));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.activity.findUnique({ where: { id } });
  if (!existing || existing.type !== "SURVEY") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Cascade-delete any responses tied to this survey.
  await db.activity.deleteMany({
    where: {
      type: "SURVEY_RESPONSE",
      description: { contains: `"surveyId":"${id}"` },
    },
  });

  await db.activity.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "SURVEY_DELETE",
      entityType: "Survey",
      entityId: id,
      description: `Deleted survey "${existing.title}" and all its responses.`,
    },
  });

  return NextResponse.json({ ok: true });
}
