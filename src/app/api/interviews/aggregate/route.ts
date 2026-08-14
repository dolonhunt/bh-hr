import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toInterviewDTO, type InterviewRecommendation } from "../route";

// ============================================================
// GET /api/interviews/aggregate?candidateId=<id>
//   Aggregates all interviews for a single candidate and returns
//   per-interview ratings, recommendations and notes plus a
//   summary block (avg rating, recommendation split, etc.) and a
//   chronological timeline.
// ============================================================

function emptyCounts() {
  return { HIRE: 0, REJECT: 0, HOLD: 0 } as Record<
    InterviewRecommendation,
    number
  >;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId") || "";
  if (!candidateId) {
    return NextResponse.json(
      { error: "candidateId query param is required" },
      { status: 400 }
    );
  }

  // Verify candidate exists (graceful: still aggregate if missing).
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, jobId: true, status: true, email: true },
  });

  const activities = await db.activity.findMany({
    where: { type: "INTERVIEW" },
    orderBy: { createdAt: "asc" },
  });

  const all = activities
    .map(toInterviewDTO)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((i) => i.candidateId === candidateId);

  const completed = all.filter((i) => i.status === "COMPLETED");
  // For aggregations below, include any interview that has a rating or
  // recommendation set (regardless of status) so partially-completed seed
  // data is still represented. completedInterviews stays strict (status).
  const withRating = all.filter(
    (i) => typeof i.rating === "number" && i.rating > 0
  );
  const avgRating =
    withRating.length > 0
      ? withRating.reduce((s, i) => s + (i.rating ?? 0), 0) / withRating.length
      : 0;

  const recCounts = emptyCounts();
  for (const i of all) {
    if (i.recommendation) {
      recCounts[i.recommendation] += 1;
    }
  }

  // Determine overall recommendation by majority.
  let overallRecommendation: InterviewRecommendation | null = null;
  let maxVotes = 0;
  let tie = false;
  (Object.keys(recCounts) as InterviewRecommendation[]).forEach((k) => {
    if (recCounts[k] > maxVotes) {
      maxVotes = recCounts[k];
      overallRecommendation = k;
      tie = false;
    } else if (recCounts[k] === maxVotes && recCounts[k] > 0) {
      tie = true;
    }
  });
  if (tie) overallRecommendation = "HOLD";

  // Unique interviewers (deduplicate by id, fall back to name).
  const interviewerMap = new Map<
    string,
    { id: string | null; name: string; interviewCount: number }
  >();
  for (const i of all) {
    const key = i.interviewerId ?? `name:${i.interviewerName ?? "—"}`;
    const entry = interviewerMap.get(key);
    if (entry) {
      entry.interviewCount += 1;
    } else {
      interviewerMap.set(key, {
        id: i.interviewerId,
        name: i.interviewerName ?? "Unassigned",
        interviewCount: 1,
      });
    }
  }
  const interviewers = Array.from(interviewerMap.values());

  // Chronological timeline (oldest first).
  const timeline = [...all].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() -
      new Date(b.scheduledAt).getTime()
  );

  return NextResponse.json({
    candidate: candidate
      ? {
          id: candidate.id,
          name: candidate.name,
          jobId: candidate.jobId,
          status: candidate.status,
          email: candidate.email ?? null,
        }
      : null,
    summary: {
      avgRating: Number(avgRating.toFixed(2)),
      recommendationCounts: recCounts,
      totalInterviews: all.length,
      completedInterviews: completed.length,
      ratedInterviews: withRating.length,
      interviewers,
      overallRecommendation,
      tie,
    },
    timeline,
  });
}
