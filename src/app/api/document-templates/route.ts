import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/document-templates?status=&type=&category=&search=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";

  const where: any = {};
  if (status) where.status = status;
  else where.status = { not: "ARCHIVED" };
  if (type) where.type = type;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const items = await db.documentTemplate.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items, total: items.length });
}

// POST /api/document-templates
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Make sure code is unique.
  if (body.code) {
    const existing = await db.documentTemplate.findUnique({
      where: { code: body.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Template code "${body.code}" already exists.` },
        { status: 400 }
      );
    }
  }

  // Get default HR user to attribute creation.
  const user =
    (await db.user.findFirst({ orderBy: { createdAt: "asc" } })) ?? undefined;

  const created = await db.documentTemplate.create({
    data: {
      name: body.name,
      code: body.code,
      type: body.type || "CUSTOM",
      category: body.category || "EMPLOYMENT",
      description: body.description ?? null,
      subject: body.subject ?? null,
      content: body.content ?? "",
      emailSubject: body.emailSubject ?? null,
      emailBody: body.emailBody ?? null,
      version: body.version ?? "1.0",
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      status: body.status || "ACTIVE",
      createdBy: user?.id ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "TEMPLATE_CREATE",
      entityType: "DocumentTemplate",
      entityId: created.id,
      description: `Created document template ${created.name} (${created.code})`,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
