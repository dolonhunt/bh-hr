import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const reviewPeriod = searchParams.get("reviewPeriod") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (reviewPeriod) where.reviewPeriod = { contains: reviewPeriod };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { reviewer: { contains: search } },
      { reviewPeriod: { contains: search } },
      { comments: { contains: search } },
      { employee: { fullName: { contains: search } } },
      { employee: { employeeId: { contains: search } } },
    ];
  }

  const [total, items] = await Promise.all([
    db.performance.count({ where }),
    db.performance.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
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

  const goals = Number(body.goals ?? 0);
  const quality = Number(body.quality ?? 0);
  const attendance = Number(body.attendance ?? 0);
  const teamwork = Number(body.teamwork ?? 0);
  const communication = Number(body.communication ?? 0);
  const overallScore = Math.round((goals + quality + attendance + teamwork + communication) / 5);

  const review = await db.performance.create({
    data: {
      employeeId: body.employeeId,
      reviewPeriod: body.reviewPeriod || "",
      reviewer: body.reviewer || null,
      goals,
      quality,
      attendance,
      teamwork,
      communication,
      overallScore,
      comments: body.comments || null,
      status: body.status || "DRAFT",
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
      action: "PERFORMANCE_CREATE",
      entityType: "Performance",
      entityId: review.id,
      description: `Created performance review for ${review.employee.fullName} (${review.reviewPeriod})`,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
