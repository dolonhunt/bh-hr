import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseInterviewMeta } from "../route";

// =============================================================
// Interview Calendar Export (ICS) — all upcoming interviews
// =============================================================
//
// GET /api/interviews/ics-all
//
// Returns a single iCalendar (.ics) file containing VEVENTs for ALL
// upcoming (status SCHEDULED + scheduledAt >= now) interviews.
//
// Content-Type: text/calendar
// Content-Disposition: attachment; filename="all-interviews.ics"

function fmtIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

function escapeIcsText(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

interface InterviewWithMeta {
  id: string;
  meta: NonNullable<ReturnType<typeof parseInterviewMeta>>;
  interviewerEmail: string | null;
}

function buildIcsForMany(interviews: InterviewWithMeta[]): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeamHub HR//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:TeamHub HR Interviews (${interviews.length})`,
  ];

  for (const it of interviews) {
    const meta = it.meta;
    const start = new Date(meta.scheduledAt);
    const end = new Date(start.getTime() + (meta.duration || 30) * 60 * 1000);
    const location = meta.meetingLink || meta.location || "";
    const summary = `Interview: ${meta.candidateName} - ${meta.jobTitle ?? "General"}`;
    const descParts: string[] = [`${meta.type} interview`];
    if (meta.interviewerName) {
      descParts.push(`Interviewer: ${meta.interviewerName}`);
    } else {
      descParts.push("Interviewer: Unassigned");
    }
    if (meta.notes) {
      descParts.push(`Notes: ${meta.notes}`);
    }
    const description = descParts.join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.id}@teamhub-hr`,
      `DTSTAMP:${fmtIcsDate(now)}`,
      `DTSTART:${fmtIcsDate(start)}`,
      `DTEND:${fmtIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`
    );
    if (location) {
      lines.push(`LOCATION:${escapeIcsText(location)}`);
    }
    lines.push("STATUS:CONFIRMED");
    if (it.interviewerEmail) {
      lines.push(
        `ORGANIZER;CN=${escapeIcsText(meta.interviewerName ?? "Interviewer")}:mailto:${escapeIcsText(it.interviewerEmail)}`
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export async function GET(_req: NextRequest) {
  // Fetch all interview activities
  const activities = await db.activity.findMany({
    where: { type: "INTERVIEW" },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  // Filter to upcoming (SCHEDULED + scheduledAt in the future)
  const upcoming: InterviewWithMeta[] = [];
  for (const a of activities) {
    const meta = parseInterviewMeta(a.description);
    if (!meta) continue;
    if (meta.status !== "SCHEDULED") continue;
    const t = new Date(meta.scheduledAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < now - 60 * 60 * 1000) continue; // 1h grace window
    upcoming.push({
      id: a.id,
      meta,
      interviewerEmail: null,
    });
  }

  // Resolve interviewer emails in parallel
  const interviewerIds = Array.from(
    new Set(upcoming.map((i) => i.meta.interviewerId).filter(Boolean) as string[])
  );
  const interviewerEmails = new Map<string, string>();
  if (interviewerIds.length > 0) {
    const emps = await db.employee.findMany({
      where: { id: { in: interviewerIds } },
      select: { id: true, officialEmail: true, personalEmail: true },
    });
    for (const e of emps) {
      interviewerEmails.set(e.id, e.officialEmail || e.personalEmail || "");
    }
  }
  for (const it of upcoming) {
    if (it.meta.interviewerId) {
      it.interviewerEmail = interviewerEmails.get(it.meta.interviewerId) || null;
    }
  }

  if (upcoming.length === 0) {
    return NextResponse.json(
      { error: "No upcoming interviews to export." },
      { status: 404 }
    );
  }

  // Sort ascending by scheduledAt
  upcoming.sort(
    (a, b) =>
      new Date(a.meta.scheduledAt).getTime() -
      new Date(b.meta.scheduledAt).getTime()
  );

  const ics = buildIcsForMany(upcoming);
  const fileName = "all-interviews.ics";

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "INTERVIEW_ICS_ALL_EXPORTED",
        entityType: "Interview",
        description: `Exported ICS calendar file with ${upcoming.length} upcoming interview(s).`,
        metadata: JSON.stringify({
          count: upcoming.length,
          firstScheduledAt: upcoming[0]?.meta.scheduledAt ?? null,
        }),
      },
    });
  } catch {
    // non-fatal
  }

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
