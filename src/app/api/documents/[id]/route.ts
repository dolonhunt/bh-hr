import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: {
      employee: {
        include: { department: true, designation: true, role: true },
      },
      template: true,
      generatedBy: true,
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sentBy: true },
      },
    },
  });
  if (!doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.generatedDocument.update({
    where: { id },
    data: {
      status: body.status,
      title: body.title,
      content: body.content,
      month: body.month,
    },
    include: {
      employee: true,
      template: true,
    },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_UPDATE",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Updated document ${updated.documentNumber} (status=${body.status ?? updated.status})`,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Soft delete via archive.
  const archived = await db.generatedDocument.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id,
      action: "DOCUMENT_ARCHIVE",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Archived document ${archived.documentNumber}`,
    },
  });

  return NextResponse.json({ ok: true });
}
