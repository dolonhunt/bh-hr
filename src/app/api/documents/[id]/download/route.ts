import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderDocxBuffer, renderPdfBuffer } from "@/lib/document-renderers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/documents/[id]/download?format=docx|pdf
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "docx").toLowerCase();

  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json(
      { error: "format must be 'docx' or 'pdf'" },
      { status: 400 }
    );
  }

  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sanitize file name.
  const safeName = (doc.title || doc.documentNumber)
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  const filename = `${safeName || doc.documentNumber}.${format}`;

  if (format === "docx") {
    const buffer = await renderDocxBuffer({
      title: doc.title,
      html: doc.content,
    });

    // Record the file path so we can list "has docx" later.
    await db.generatedDocument.update({
      where: { id },
      data: { filePath: `/api/documents/${id}/download?format=docx` },
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

  // PDF
  const { buffer } = await renderPdfBuffer({
    title: doc.title,
    html: doc.content,
  });

  await db.generatedDocument.update({
    where: { id },
    data: { pdfPath: `/api/documents/${id}/download?format=pdf` },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
