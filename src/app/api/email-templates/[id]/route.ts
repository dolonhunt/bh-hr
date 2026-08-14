import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/email-templates/[id]
// Returns the emailSubject + emailBody (plus basic template metadata) for
// the requested DocumentTemplate.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await db.documentTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      category: true,
      description: true,
      status: true,
      subject: true,
      content: true,
      emailSubject: true,
      emailBody: true,
      version: true,
      updatedAt: true,
    },
  });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(template);
}

// PATCH /api/email-templates/[id]
// Body: { emailSubject?: string, emailBody?: string }
// Updates only the emailSubject and/or emailBody fields of an existing
// DocumentTemplate. Other fields (name, content, type, etc.) are untouched.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.documentTemplate.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Template not found." },
      { status: 404 }
    );
  }

  // Build a partial update — only fields the client explicitly sent are
  // touched so callers can PATCH subject-only, body-only, or both.
  const data: any = {};
  if (typeof body.emailSubject === "string") {
    data.emailSubject = body.emailSubject.trim() ? body.emailSubject : null;
  }
  if (typeof body.emailBody === "string") {
    data.emailBody = body.emailBody.trim() ? body.emailBody : null;
  }

  const updated = await db.documentTemplate.update({
    where: { id },
    data,
  });

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "EMAIL_TEMPLATE_UPDATE",
      entityType: "DocumentTemplate",
      entityId: id,
      description: `Updated email template for ${updated.name} (${updated.code}).`,
      metadata: JSON.stringify({
        templateId: id,
        templateName: updated.name,
        templateCode: updated.code,
        subjectLength: (updated.emailSubject ?? "").length,
        bodyLength: (updated.emailBody ?? "").length,
      }),
    },
  });

  return NextResponse.json(updated);
}
