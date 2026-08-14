import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderDocxBuffer } from "@/lib/document-renderers";
import { ZipArchive } from "archiver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/documents/bulk-download
// Body: { documentIds: string[] }
// Returns a ZIP file containing the DOCX rendering of each requested document.
// File names inside the ZIP: `{documentNumber}_{employeeName}.docx` (sanitised).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { documentIds } = body ?? ({} as any);

  if (
    !Array.isArray(documentIds) ||
    documentIds.length === 0
  ) {
    return NextResponse.json(
      { error: "documentIds must be a non-empty array." },
      { status: 400 }
    );
  }
  if (documentIds.length > 500) {
    return NextResponse.json(
      { error: "Bulk download is capped at 500 documents per request." },
      { status: 400 }
    );
  }

  const docs = await db.generatedDocument.findMany({
    where: { id: { in: documentIds } },
    include: { employee: true, template: true },
  });

  if (docs.length === 0) {
    return NextResponse.json(
      { error: "No documents found for the given IDs." },
      { status: 404 }
    );
  }

  // Build the ZIP stream. archiver v8 is ESM and exposes ZipArchive as a
  // named export (extends Node's Transform stream).
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  let archiveError: Error | null = null;

  archive.on("data", (c: Buffer) => chunks.push(c));
  archive.on("error", (err: Error) => {
    archiveError = err;
  });
  archive.on("warning", (err: any) => {
    // warnings are non-fatal; log to stdout for visibility.
    if (err?.code !== "ENOENT") {
      console.warn("archiver warning:", err?.message ?? err);
    }
  });

  // Track used file names so two docs that would produce the same name don't
  // overwrite each other inside the ZIP.
  const usedNames = new Set<string>();
  const pickName = (base: string): string => {
    let name = `${base}.docx`;
    let suffix = 1;
    while (usedNames.has(name.toLowerCase())) {
      name = `${base}_${suffix}.docx`;
      suffix += 1;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };

  for (const doc of docs) {
    try {
      const buffer = await renderDocxBuffer({
        title: doc.title,
        html: doc.content,
      });

      const safeDocNum = (doc.documentNumber || "doc")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 60);
      const safeEmpName = (doc.employee?.fullName || "employee")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      const base = `${safeDocNum}_${safeEmpName}`;
      const filename = pickName(base);

      archive.append(buffer, { name: filename });
    } catch (err: any) {
      // Skip a doc that fails to render but keep going.
      console.error(
        `Failed to render docx for document ${doc.documentNumber}:`,
        err?.message ?? err
      );
    }
  }

  // Finalize the archive and wait for the 'end' event so we have all chunks.
  const finalizePromise = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => {
      if (archiveError) reject(archiveError);
      else resolve(Buffer.concat(chunks));
    });
    archive.on("error", (err: Error) => reject(err));
    archive.finalize();
  });

  let zipBuffer: Buffer;
  try {
    zipBuffer = await finalizePromise;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to build ZIP: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="documents.zip"`,
      "Content-Length": String(zipBuffer.length),
    },
  });
}
