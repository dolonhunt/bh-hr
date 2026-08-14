import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseInterviewMeta } from "../../route";

// =============================================================
// Interview Calendar Export (ICS) — single interview
// =============================================================
//
// GET /api/interviews/[id]/ics
//
// Returns an iCalendar (.ics) file for a single interview. The file
// contains one VEVENT with:
//   - UID           {interviewId}@teamhub-hr
//   - DTSTAMP       current UTC timestamp
//   - DTSTART       scheduledAt (UTC)
//   - DTEND         scheduledAt + duration (UTC)
//   - SUMMARY       "Interview: {candidateName} - {jobTitle}"
//   - DESCRIPTION   "{type} interview\nInterviewer: {interviewerName}\nNotes: {notes}"
//   - LOCATION      {location or meetingLink}
//   - STATUS        CONFIRMED
//   - ORGANIZER      mailto:{interviewerEmail}
//
// Content-Type: text/calendar
// Content-Disposition: attachment; filename="interview-{candidateName}.ics"

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "interview";
}

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

function buildIcsForInterview(
  interviewId: string,
  meta: NonNullable<ReturnType<typeof parseInterviewMeta>>,
  interviewerEmail: string | null
): string {
  const start = new Date(meta.scheduledAt);
  const end = new Date(start.getTime() + (meta.duration || 30) * 60 * 1000);
  const now = new Date();
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

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeamHub HR//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${interviewId}@teamhub-hr`,
    `DTSTAMP:${fmtIcsDate(now)}`,
    `DTSTART:${fmtIcsDate(start)}`,
    `DTEND:${fmtIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
  ];
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  lines.push("STATUS:CONFIRMED");
  if (interviewerEmail) {
    lines.push(
      `ORGANIZER;CN=${escapeIcsText(meta.interviewerName ?? "Interviewer")}:mailto:${escapeIcsText(interviewerEmail)}`
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  // RFC5545 requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}

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
  const meta = parseInterviewMeta(activity.description);
  if (!meta) {
    return NextResponse.json(
      { error: "Interview metadata is corrupted" },
      { status: 500 }
    );
  }

  // Resolve interviewer email if available
  let interviewerEmail: string | null = null;
  if (meta.interviewerId) {
    const emp = await db.employee.findUnique({
      where: { id: meta.interviewerId },
      select: { officialEmail: true, personalEmail: true },
    });
    interviewerEmail = emp?.officialEmail || emp?.personalEmail || null;
  }

  const ics = buildIcsForInterview(id, meta, interviewerEmail);
  const fileName = `interview-${slugify(meta.candidateName)}.ics`;

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "INTERVIEW_ICS_EXPORTED",
        entityType: "Interview",
        entityId: id,
        description: `Exported ICS calendar invite for interview with ${meta.candidateName}.`,
        metadata: JSON.stringify({
          interviewId: id,
          candidateName: meta.candidateName,
          scheduledAt: meta.scheduledAt,
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
