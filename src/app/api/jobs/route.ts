import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);

  const where: any = {};
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { location: { contains: search } },
      { requirements: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Include candidate counts by stage for each job
  const enriched = await Promise.all(
    items.map(async (job) => {
      const grouped = await db.candidate.groupBy({
        by: ["status"],
        where: { jobId: job.id },
        _count: { _all: true },
      });
      const stageCounts: Record<string, number> = {};
      grouped.forEach((g) => {
        stageCounts[g.status] = g._count._all;
      });
      return {
        ...job,
        candidateCount: job._count.candidates,
        stageCounts,
      };
    })
  );

  return NextResponse.json({
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const job = await db.job.create({
    data: {
      title: body.title,
      departmentId: body.departmentId || null,
      employmentType: body.employmentType || "FULL_TIME",
      location: body.location || null,
      vacancy: Number(body.vacancy ?? 1),
      closingDate: body.closingDate ? new Date(body.closingDate) : null,
      description: body.description || null,
      requirements: body.requirements || null,
      salaryMin: body.salaryMin ? Number(body.salaryMin) : null,
      salaryMax: body.salaryMax ? Number(body.salaryMax) : null,
      status: body.status || "OPEN",
    },
    include: {
      department: { select: { id: true, name: true, color: true } },
    },
  });

  await db.auditLog.create({
    data: {
      action: "JOB_CREATE",
      entityType: "Job",
      entityId: job.id,
      description: `Created job posting: ${job.title}`,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
