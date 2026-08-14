import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// GET  /api/surveys/[id]/responses   → list responses for a survey
// POST /api/surveys/[id]/responses   → submit a response
//   Body: { employeeId?, answers: [{ questionId, value }] }
// ============================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const survey = await db.activity.findUnique({ where: { id } });
  if (!survey || survey.type !== "SURVEY") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const responses = await db.activity.findMany({
    where: {
      type: "SURVEY_RESPONSE",
      description: { contains: `"surveyId":"${id}"` },
    },
    orderBy: { createdAt: "desc" },
  });

  const parsed = responses
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

  return NextResponse.json({ items: parsed, total: parsed.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const survey = await db.activity.findUnique({ where: { id } });
  if (!survey || survey.type !== "SURVEY") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Parse survey questions so we can validate answers + types.
  let questions: any[] = [];
  try {
    const m = JSON.parse(survey.description || "{}");
    questions = Array.isArray(m.questions) ? m.questions : [];
  } catch {
    questions = [];
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json(
      { error: "answers must be a non-empty array" },
      { status: 400 }
    );
  }

  // Normalise answers: ensure each { questionId, value } pair corresponds
  // to a known question on the survey.
  const sanitisedAnswers = body.answers.map((a: any) => {
    if (!a || !a.questionId) {
      throw new Error("Each answer must have a questionId");
    }
    const q = questions.find((qq) => qq.id === a.questionId);
    let value = a.value;
    if (q) {
      if (q.type === "RATING") {
        const n = Number(value);
        if (isNaN(n) || n < 1 || n > 5) {
          throw new Error(
            `Answer for "${q.text}" must be a rating between 1 and 5`
          );
        }
        value = n;
      }
      if (q.type === "TEXT") {
        value = String(value ?? "");
      }
      if (q.type === "SINGLE_CHOICE") {
        value = String(value);
      }
      if (q.type === "MULTIPLE_CHOICE") {
        value = Array.isArray(value) ? value.map(String) : [String(value)];
      }
    }
    return { questionId: a.questionId, value };
  });

  // Resolve employee name (optional).
  let employeeName: string | null = null;
  if (body.employeeId) {
    const emp = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, fullName: true },
    });
    if (!emp) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    employeeName = emp.fullName;
  }

  const submittedAt = new Date().toISOString();
  const meta = {
    surveyId: id,
    employeeId: body.employeeId || null,
    employeeName,
    answers: sanitisedAnswers,
    submittedAt,
  };

  const activity = await db.activity.create({
    data: {
      type: "SURVEY_RESPONSE",
      employeeId: body.employeeId || null,
      title: `Response — ${survey.title}`,
      description: JSON.stringify(meta),
    },
  });

  await db.auditLog.create({
    data: {
      action: "SURVEY_RESPONSE_SUBMIT",
      entityType: "SurveyResponse",
      entityId: activity.id,
      description: `Submitted response to survey "${survey.title}"${
        employeeName ? ` by ${employeeName}` : ""
      }.`,
    },
  });

  return NextResponse.json(
    {
      id: activity.id,
      ...meta,
      createdAt: activity.createdAt?.toISOString?.() ?? activity.createdAt,
    },
    { status: 201 }
  );
}
