import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/documents/[id]/preview
// Returns the rendered HTML content of the document so the client can show it
// inside a styled <div dangerouslySetInnerHTML>.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true, designation: true } },
      template: true,
    },
  });
  if (!doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    content: doc.content,
    employee: doc.employee,
    template: doc.template,
    createdAt: doc.createdAt,
    dataJson: doc.dataJson,
  });
}
