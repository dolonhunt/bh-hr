import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// SURVEYS are stored as Activity rows:
//   type        = "SURVEY"
//   title       = survey title
//   description = JSON {
//                    description,            // optional long-form text
//                    status,                 // DRAFT | ACTIVE | CLOSED
//                    createdBy,              // optional creator label/id
//                    questions: [
//                      { id, text, type, options? }
//                    ]
//                  }
//   employeeId  = null
//
// RESPONSES are stored as Activity rows:
//   type        = "SURVEY_RESPONSE"
//   title       = `Response — {surveyTitle}`
//   description = JSON {
//                    surveyId,
//                    employeeId,             // responder employee id (nullable)
//                    employeeName,           // denormalised
//                    answers: [ { questionId, value } ],
//                    submittedAt
//                  }
//   employeeId  = responder's employee id (if provided)
// ============================================================

export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type SurveyQuestionType =
  | "TEXT"
  | "RATING"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
}

export interface SurveyDTO {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  anonymous: boolean;
  createdAt: string;
  createdBy: string | null;
  questions: SurveyQuestion[];
  responseCount: number;
}

interface SurveyMeta {
  description: string | null;
  status: SurveyStatus;
  anonymous: boolean;
  createdBy: string | null;
  questions: SurveyQuestion[];
}

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

export function parseSurveyMeta(description: string | null): SurveyMeta | null {
  if (!description) return null;
  try {
    const p = JSON.parse(description);
    if (!p || typeof p !== "object") return null;
    const rawQuestions = Array.isArray(p.questions) ? p.questions : [];
    const questions: SurveyQuestion[] = rawQuestions
      .map((q: any) => {
        if (!q || typeof q !== "object") return null;
        const type = VALID_Q_TYPES.includes(q.type) ? q.type : "TEXT";
        const text = typeof q.text === "string" ? q.text : "";
        const id = typeof q.id === "string" && q.id ? q.id : genId();
        const options =
          Array.isArray(q.options) && q.options.length
            ? q.options.map(String)
            : undefined;
        return { id, text, type, options } as SurveyQuestion;
      })
      .filter(Boolean) as SurveyQuestion[];

    return {
      description: typeof p.description === "string" ? p.description : null,
      status: (VALID_STATUSES.includes(p.status) ? p.status : "DRAFT") as SurveyStatus,
      anonymous: p.anonymous === true,
      createdBy: p.createdBy ?? null,
      questions,
    };
  } catch {
    return null;
  }
}

export function toSurveyDTO(a: any, responseCount?: number): SurveyDTO | null {
  const m = parseSurveyMeta(a.description);
  if (!m) return null;
  return {
    id: a.id,
    title: a.title,
    description: m.description,
    status: m.status,
    anonymous: m.anonymous,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    createdBy: m.createdBy,
    questions: m.questions,
    responseCount: responseCount ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").toUpperCase();
  const search = (searchParams.get("search") || "").toLowerCase();

  const where: any = { type: "SURVEY" };
  if (status && VALID_STATUSES.includes(status as SurveyStatus)) {
    where.description = { contains: `"status":"${status}"` };
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [activities, responses] = await Promise.all([
    db.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: { type: "SURVEY_RESPONSE" },
      select: { description: true },
    }),
  ]);

  // Build a surveyId → responseCount map.
  const counts: Record<string, number> = {};
  for (const r of responses) {
    try {
      const m = JSON.parse(r.description || "{}");
      if (m.surveyId) counts[m.surveyId] = (counts[m.surveyId] ?? 0) + 1;
    } catch {
      // ignore
    }
  }

  const surveys = activities
    .map((a) => toSurveyDTO(a, counts[a.id] ?? 0))
    .filter((x): x is SurveyDTO => x !== null);

  return NextResponse.json({ items: surveys, total: surveys.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json(
      { error: "At least one question is required" },
      { status: 400 }
    );
  }

  // Normalise + validate questions.
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
        { error: `Question type must be one of: ${VALID_Q_TYPES.join(", ")}` },
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

  // Determine status (default DRAFT unless caller explicitly says ACTIVE).
  const requestedStatus = (body.status || "DRAFT").toUpperCase();
  const status: SurveyStatus = VALID_STATUSES.includes(requestedStatus as SurveyStatus)
    ? (requestedStatus as SurveyStatus)
    : "DRAFT";

  const meta: SurveyMeta = {
    description: body.description ? String(body.description) : null,
    status,
    anonymous: body.anonymous === true,
    createdBy: body.createdBy ? String(body.createdBy) : null,
    questions,
  };

  const activity = await db.activity.create({
    data: {
      type: "SURVEY",
      title: body.title.trim(),
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "SURVEY_CREATE",
      entityType: "Survey",
      entityId: activity.id,
      description: `Created survey "${activity.title}" (${status}, ${questions.length} question(s)).`,
    },
  });

  return NextResponse.json(toSurveyDTO(activity, 0), { status: 201 });
}
