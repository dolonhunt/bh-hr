import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/email-templates
//
// Returns all non-archived DocumentTemplate rows that have at least an
// emailSubject OR emailBody populated. We surface every template's
// id/name/code/type/category/status/emailSubject/emailBody so the Email
// Template Editor can list them and load whichever one the user picks.
//
// If `?includeEmpty=1` is passed we also return templates that don't yet have
// email fields set — useful when the editor wants to show "no email configured"
// entries. By default we filter them out so the list is concise.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeEmpty = searchParams.get("includeEmpty") === "1";
  const status = searchParams.get("status") || "";

  const where: any = {};
  if (status) where.status = status;
  else where.status = { not: "ARCHIVED" };

  if (!includeEmpty) {
    where.OR = [
      { emailSubject: { not: null } },
      { emailBody: { not: null } },
    ];
  }

  const items = await db.documentTemplate.findMany({
    where,
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
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items, total: items.length });
}

// POST /api/email-templates
//
// Convenience endpoint to update an existing DocumentTemplate's email fields
// (subject + body) without round-tripping through the full template PATCH.
// Body: { templateId: string, emailSubject: string, emailBody: string }
//
// We refuse to create brand-new "email-only" templates here because every
// email template must be backed by a real DocumentTemplate (so that document
// generation can still attach the rendered email + payslip together). To add
// a new email template, use the existing /api/document-templates POST.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { templateId, emailSubject, emailBody } = body ?? ({} as any);

  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required." },
      { status: 400 }
    );
  }

  const existing = await db.documentTemplate.findUnique({
    where: { id: templateId },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Template not found." },
      { status: 404 }
    );
  }

  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  const updated = await db.documentTemplate.update({
    where: { id: templateId },
    data: {
      emailSubject:
        typeof emailSubject === "string" ? emailSubject : existing.emailSubject,
      emailBody:
        typeof emailBody === "string" ? emailBody : existing.emailBody,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "EMAIL_TEMPLATE_UPDATE",
      entityType: "DocumentTemplate",
      entityId: templateId,
      description: `Updated email template for ${updated.name} (${updated.code}).`,
      metadata: JSON.stringify({
        templateId,
        templateName: updated.name,
        templateCode: updated.code,
        subjectLength: (updated.emailSubject ?? "").length,
        bodyLength: (updated.emailBody ?? "").length,
      }),
    },
  });

  return NextResponse.json(updated, { status: 200 });
}
