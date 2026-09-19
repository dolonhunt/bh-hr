import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/message-logs?status=&channel=&announcementId=&employeeId=&search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const channel = searchParams.get("channel") || "";
  const announcementId = searchParams.get("announcementId") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

  const where: any = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (announcementId) where.announcementId = announcementId;
  if (employeeId) where.employeeId = employeeId;
  if (search) {
    where.OR = [
      { recipientTo: { contains: search } },
      { body: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.messageLog.count({ where }),
    db.messageLog.findMany({
      where,
      include: {
        employee: true,
        announcement: { select: { id: true, title: true } },
        sentBy: true,
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
