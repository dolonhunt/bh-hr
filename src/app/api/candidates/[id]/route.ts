import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });
  if (!candidate)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // If transitioning to HIRED, optionally link employee
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.jobId !== undefined) data.jobId = body.jobId;
  if (body.employeeId !== undefined) data.employeeId = body.employeeId;
  if (body.cvPath !== undefined) data.cvPath = body.cvPath;
  if (body.experience !== undefined) data.experience = Number(body.experience);
  if (body.skills !== undefined) data.skills = body.skills;
  if (body.interviewNotes !== undefined) data.interviewNotes = body.interviewNotes;
  if (body.expectedSalary !== undefined)
    data.expectedSalary = body.expectedSalary ? Number(body.expectedSalary) : null;
  if (body.status !== undefined) data.status = body.status;

  const updated = await db.candidate.update({
    where: { id },
    data,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "CANDIDATE_UPDATE",
      entityType: "Candidate",
      entityId: id,
      description: `Updated candidate ${updated.name} - status: ${updated.status}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await db.candidate.findUnique({ where: { id } });
  await db.candidate.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "CANDIDATE_DELETE",
      entityType: "Candidate",
      entityId: id,
      description: `Deleted candidate ${candidate?.name ?? id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
