import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// =============================================================
// GET /api/documents/[id]/verify
//
// Returns signature verification info for a document:
//   { signed, signerName, signerTitle, signedAt, verificationHash,
//     shortHash, reason, hasDrawnSignature, documentNumber, title,
//     type, status, employeeName }
//
// Returns signed:false if the document has not been signed yet.
// =============================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  // Parse signature metadata from dataJson (set by /sign).
  let sig: any = null;
  try {
    const dataObj = JSON.parse(doc.dataJson || "{}");
    sig = dataObj.signature ?? null;
  } catch {
    sig = null;
  }

  return NextResponse.json({
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    employeeName: doc.employee?.fullName ?? null,
    employeeId: doc.employee?.id ?? null,
    templateName: doc.template?.name ?? null,
    signed: !!sig?.signed,
    signerName: sig?.signerName ?? null,
    signerTitle: sig?.signerTitle ?? null,
    signedAt: sig?.signedAt ?? null,
    verificationHash: sig?.verificationHash ?? null,
    shortHash: sig?.shortHash ?? null,
    reason: sig?.reason ?? null,
    hasDrawnSignature: sig?.hasDrawnSignature ?? false,
  });
}
