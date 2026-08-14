import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const review = await db.performance.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          photo: true,
          department: { select: { id: true, name: true, color: true } },
          designation: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!review)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(review);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.performance.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const goals = body.goals !== undefined ? Number(body.goals) : existing.goals;
  const quality = body.quality !== undefined ? Number(body.quality) : existing.quality;
  const attendance = body.attendance !== undefined ? Number(body.attendance) : existing.attendance;
  const teamwork = body.teamwork !== undefined ? Number(body.teamwork) : existing.teamwork;
  const communication = body.communication !== undefined ? Number(body.communication) : existing.communication;
  const overallScore = Math.round((goals + quality + attendance + teamwork + communication) / 5);

  const updated = await db.performance.update({
    where: { id },
    data: {
      reviewPeriod: body.reviewPeriod,
      reviewer: body.reviewer,
      goals,
      quality,
      attendance,
      teamwork,
      communication,
      overallScore,
      comments: body.comments,
      status: body.status,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          photo: true,
          department: { select: { id: true, name: true, color: true } },
          designation: { select: { id: true, name: true } },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      action: "PERFORMANCE_UPDATE",
      entityType: "Performance",
      entityId: id,
      description: `Updated performance review for ${updated.employee.fullName} (${updated.reviewPeriod}) - ${updated.status}`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const review = await db.performance.findUnique({ where: { id } });
  await db.performance.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "PERFORMANCE_DELETE",
      entityType: "Performance",
      entityId: id,
      description: `Deleted performance review ${review?.reviewPeriod ?? id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
