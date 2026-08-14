import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseInterviewMeta, toInterviewDTO } from "../../route";

// ============================================================
// POST /api/interviews/[id]/complete
// Body: { rating (1-5), notes, recommendation (HIRE|REJECT|HOLD) }
// Marks the interview as COMPLETED and stores feedback.
// ============================================================

const VALID_RECS = ["HIRE", "REJECT", "HOLD"];

export async function POST(
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

  // Validate rating.
  const ratingNum = Number(body.rating);
  if (
    body.rating === undefined ||
    body.rating === null ||
    isNaN(ratingNum) ||
    ratingNum < 1 ||
    ratingNum > 5
  ) {
    return NextResponse.json(
      { error: "rating must be a number between 1 and 5" },
      { status: 400 }
    );
  }

  // Validate recommendation.
  if (!body.recommendation || !VALID_RECS.includes(body.recommendation)) {
    return NextResponse.json(
      { error: `recommendation must be one of: ${VALID_RECS.join(", ")}` },
      { status: 400 }
    );
  }

  meta.status = "COMPLETED";
  meta.rating = ratingNum;
  meta.recommendation = body.recommendation;
  meta.notes = body.notes ? String(body.notes) : meta.notes;

  const updated = await db.activity.update({
    where: { id },
    data: { description: JSON.stringify(meta) },
  });

  await db.auditLog.create({
    data: {
      action: "INTERVIEW_COMPLETE",
      entityType: "Interview",
      entityId: id,
      description: `Marked interview for ${meta.candidateName} as COMPLETED (rating ${ratingNum}/5, recommendation: ${body.recommendation}).`,
    },
  });

  return NextResponse.json(toInterviewDTO(updated));
}
