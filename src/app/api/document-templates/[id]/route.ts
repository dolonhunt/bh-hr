import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // If updating code, ensure uniqueness.
  if (body.code) {
    const clash = await db.documentTemplate.findFirst({
      where: { code: body.code, NOT: { id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: `Template code "${body.code}" already exists.` },
        { status: 400 }
      );
    }
  }

  const updated = await db.documentTemplate.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      type: body.type,
      category: body.category,
      description: body.description,
      subject: body.subject,
      content: body.content,
      emailSubject: body.emailSubject,
      emailBody: body.emailBody,
      version: body.version,
      effectiveDate: body.effectiveDate
        ? new Date(body.effectiveDate)
        : undefined,
      status: body.status,
    },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "TEMPLATE_UPDATE",
      entityType: "DocumentTemplate",
      entityId: id,
      description: `Updated document template ${updated.name} (${updated.code})`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Soft delete: archive instead of hard delete to preserve history.
  const archived = await db.documentTemplate.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "TEMPLATE_ARCHIVE",
      entityType: "DocumentTemplate",
      entityId: id,
      description: `Archived document template ${archived.name} (${archived.code})`,
    },
  });

  return NextResponse.json({ ok: true });
}
