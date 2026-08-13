import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/documents/pending-approval
// Returns the documents currently awaiting approval (status=PENDING_APPROVAL)
// along with summary KPI counts for the approval queue view.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  const where: any = { status: "PENDING_APPROVAL" };
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { documentNumber: { contains: search } },
      { title: { contains: search } },
    ];
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    total,
    items,
    pendingCount,
    approvedTodayCount,
    issuedTodayCount,
  ] = await Promise.all([
    db.generatedDocument.count({ where }),
    db.generatedDocument.findMany({
      where,
      include: {
        employee: {
          include: { department: true, designation: true, role: true },
        },
        template: true,
        generatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.generatedDocument.count({ where: { status: "PENDING_APPROVAL" } }),
    db.generatedDocument.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    db.generatedDocument.count({
      where: {
        status: "ISSUED",
        updatedAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
  ]);

  // "Rejected today" = documents that were moved back to GENERATED today.
  // We surface this from the audit log so it captures the action even though
  // the document's current status is GENERATED (not PENDING_APPROVAL).
  const rejectedTodayLogs = await db.auditLog.count({
    where: {
      action: "DOCUMENT_STATUS_CHANGE",
      createdAt: { gte: startOfToday, lte: endOfToday },
      description: { contains: "to GENERATED" },
    },
  });

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    kpis: {
      pending: pendingCount,
      approvedToday: approvedTodayCount,
      issuedToday: issuedTodayCount,
      rejectedToday: rejectedTodayLogs,
    },
  });
}
