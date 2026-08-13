import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/email-logs?status=&documentId=&employeeId=&search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const documentId = searchParams.get("documentId") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

  const where: any = {};
  if (status) where.status = status;
  if (documentId) where.documentId = documentId;
  if (employeeId) where.employeeId = employeeId;
  if (search) {
    where.OR = [
      { recipientTo: { contains: search } },
      { subject: { contains: search } },
      { body: { contains: search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.emailLog.count({ where }),
    db.emailLog.findMany({
      where,
      include: {
        document: { include: { employee: true, template: true } },
        sentBy: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // EmailLog has employeeId but no Prisma relation to Employee, so we fetch
  // referenced employees manually and attach them.
  const empIds = Array.from(
    new Set(
      items
        .map((l) => l.employeeId)
        .filter((id): id is string => !!id)
    )
  );
  const employees = empIds.length
    ? await db.employee.findMany({
        where: { id: { in: empIds } },
        include: { department: true },
      })
    : [];
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
  const enriched = items.map((l) => ({
    ...l,
    employee: l.employeeId ? empMap[l.employeeId] ?? null : null,
  }));

  return NextResponse.json({
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
