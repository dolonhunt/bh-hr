import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, color: true } },
      candidates: {
        orderBy: { appliedAt: "desc" },
      },
    },
  });
  if (!job)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.job.update({
    where: { id },
    data: {
      title: body.title,
      departmentId: body.departmentId,
      employmentType: body.employmentType,
      location: body.location,
      vacancy: body.vacancy !== undefined ? Number(body.vacancy) : undefined,
      closingDate: body.closingDate ? new Date(body.closingDate) : undefined,
      description: body.description,
      requirements: body.requirements,
      salaryMin: body.salaryMin !== undefined ? Number(body.salaryMin) : undefined,
      salaryMax: body.salaryMax !== undefined ? Number(body.salaryMax) : undefined,
      status: body.status,
    },
    include: {
      department: { select: { id: true, name: true, color: true } },
    },
  });

  await db.auditLog.create({
    data: {
      action: "JOB_UPDATE",
      entityType: "Job",
      entityId: id,
      description: `Updated job posting: ${updated.title} (${updated.status})`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  await db.job.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      action: "JOB_DELETE",
      entityType: "Job",
      entityId: id,
      description: `Deleted job posting: ${job?.title ?? id}`,
    },
  });

  return NextResponse.json({ ok: true });
}
