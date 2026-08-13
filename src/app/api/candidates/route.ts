import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const jobId = searchParams.get("jobId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  const where: any = {};
  if (status) where.status = status;
  if (jobId) where.jobId = jobId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { skills: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.candidate.count({ where }),
    db.candidate.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { appliedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const candidate = await db.candidate.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      jobId: body.jobId || null,
      cvPath: body.cvPath || null,
      experience: body.experience ? Number(body.experience) : 0,
      skills: body.skills || null,
      interviewNotes: body.interviewNotes || null,
      expectedSalary: body.expectedSalary ? Number(body.expectedSalary) : null,
      status: body.status || "APPLIED",
    },
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
      action: "CANDIDATE_CREATE",
      entityType: "Candidate",
      entityId: candidate.id,
      description: `Added candidate ${candidate.name} for ${candidate.job?.title ?? "—"}`,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
