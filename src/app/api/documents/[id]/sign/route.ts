import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// =============================================================
// POST /api/documents/[id]/sign
// Body: { signerName, signerTitle, signatureData?, reason? }
//
// Appends a signature block to the document's rendered HTML content
// and marks the document as ISSUED (signed = issued/finalized).
//
// The signature block contains:
//   - "Digitally signed by {signerName}"
//   - "Title: {signerTitle}"
//   - "Date: {currentDate}"
//   - "Reason: {reason}" (if provided)
//   - If signatureData is provided (base64 PNG data URL): an <img> tag
//     showing the drawn signature. Otherwise: a cursive-typed rendering
//     of the signer name.
//   - A verification hash (SHA256 of content + signer + date).
//
// The signature metadata is also persisted into the document's dataJson
// snapshot so the /verify endpoint can surface it without re-parsing HTML.
// =============================================================

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { signerName, signerTitle, signatureData, reason } = body as {
    signerName: string;
    signerTitle: string;
    signatureData?: string;
    reason?: string;
  };

  if (!signerName || !String(signerName).trim()) {
    return NextResponse.json(
      { error: "signerName is required" },
      { status: 400 }
    );
  }
  if (!signerTitle || !String(signerTitle).trim()) {
    return NextResponse.json(
      { error: "signerTitle is required" },
      { status: 400 }
    );
  }

  // Basic sanity check on signatureData — must be a PNG data URL if provided.
  if (
    signatureData &&
    !/^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/.test(signatureData)
  ) {
    return NextResponse.json(
      { error: "signatureData must be a base64 PNG/JPEG data URL" },
      { status: 400 }
    );
  }

  const existing = await db.generatedDocument.findUnique({
    where: { id },
    include: { employee: true, template: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
  if (existing.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Cannot sign an archived document" },
      { status: 400 }
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dateTimeStr = now.toLocaleString("en-GB");

  // ---- Build the signature block HTML ----
  const safeName = escapeHtml(signerName.trim());
  const safeTitle = escapeHtml(signerTitle.trim());
  const safeReason = reason ? escapeHtml(reason.trim()) : "";

  const sigVisual = signatureData
    ? `<img src="${signatureData}" alt="Signature of ${safeName}" style="max-height:90px; max-width:300px; display:block; margin-bottom:6px;" />`
    : `<div style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive, serif; font-size: 38px; color: #1a1a1a; line-height: 1; margin-bottom: 2px; min-height: 44px; transform: rotate(-2deg); display: inline-block;">${safeName}</div>`;

  const reasonRow = safeReason
    ? `<tr><td style="padding:2px 8px; color:#6b7280; font-size:11px; vertical-align:top;">Reason:</td><td style="padding:2px 0; font-size:11px; color:#1f2937;">${safeReason}</td></tr>`
    : "";

  // Verification hash — SHA256 of document content + signer + date.
  const hashInput = `${existing.content}|${signerName}|${signerTitle}|${now.toISOString()}|${reason ?? ""}`;
  const verificationHash = crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("hex");
  const shortHash = verificationHash.slice(0, 16).toUpperCase();

  const signatureBlock = `
<div style="margin-top:48px; padding:18px 22px; border: 2px solid #047857; border-radius:8px; background:#ecfdf5; page-break-inside: avoid; font-family: Arial, Helvetica, sans-serif;">
  <div style="font-size:11px; font-weight:700; color:#047857; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
    <span style="display:inline-block; width:16px; height:16px; border-radius:50%; background:#047857; color:#fff; text-align:center; line-height:16px; font-size:10px;">✓</span>
    Digitally Signed
  </div>
  <div style="margin-bottom:8px;">
    ${sigVisual}
  </div>
  <table style="width:100%; border-collapse:collapse;">
    <tbody>
      <tr>
        <td style="padding:2px 8px 2px 0; color:#6b7280; font-size:11px; width:90px; vertical-align:top;">Signed by:</td>
        <td style="padding:2px 0; font-size:12px; color:#1f2937; font-weight:600;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding:2px 8px 2px 0; color:#6b7280; font-size:11px; vertical-align:top;">Title:</td>
        <td style="padding:2px 0; font-size:12px; color:#1f2937;">${safeTitle}</td>
      </tr>
      <tr>
        <td style="padding:2px 8px 2px 0; color:#6b7280; font-size:11px; vertical-align:top;">Date:</td>
        <td style="padding:2px 0; font-size:12px; color:#1f2937;">${dateStr}</td>
      </tr>
      ${reasonRow}
    </tbody>
  </table>
  <div style="margin-top:10px; padding-top:8px; border-top: 1px dashed #6ee7b7; font-size:10px; color:#047857; font-family: 'Courier New', monospace;">
    Verification Hash: <strong>${shortHash}</strong><br/>
    Signed at: ${dateTimeStr}
  </div>
</div>`;

  // Append the signature block to the existing rendered content.
  const signedContent = `${existing.content}\n${signatureBlock}`;

  // Decide new status: signed documents become ISSUED (unless already SENT, in which case leave it).
  const oldStatus = existing.status;
  const newStatus = ["SENT", "ISSUED"].includes(oldStatus)
    ? oldStatus
    : "ISSUED";

  // Update document content + status (signed content is locked from here on).
  const updated = await db.generatedDocument.update({
    where: { id },
    data: {
      content: signedContent,
      status: newStatus,
    },
    include: { employee: true, template: true },
  });

  // Persist signature metadata into the dataJson snapshot so /verify can
  // find it without re-parsing HTML. We merge with the existing JSON.
  let dataObj: any = {};
  try {
    dataObj = JSON.parse(existing.dataJson || "{}");
  } catch {
    dataObj = {};
  }
  dataObj.signature = {
    signed: true,
    signerName: signerName.trim(),
    signerTitle: signerTitle.trim(),
    signedAt: now.toISOString(),
    verificationHash,
    shortHash,
    reason: reason?.trim() || null,
    hasDrawnSignature: !!signatureData,
    fromStatus: oldStatus,
    toStatus: newStatus,
  };
  await db.generatedDocument.update({
    where: { id },
    data: { dataJson: JSON.stringify(dataObj) },
  });

  // Audit + activity logs
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: "DOCUMENT_SIGNED",
      entityType: "GeneratedDocument",
      entityId: id,
      description: `Document ${updated.documentNumber} signed by ${signerName.trim()} (${signerTitle.trim()})`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        signedAt: now.toISOString(),
        verificationHash,
        shortHash,
        reason: reason?.trim() || null,
        hasDrawnSignature: !!signatureData,
        fromStatus: oldStatus,
        toStatus: newStatus,
      }),
    },
  });

  await db.activity.create({
    data: {
      employeeId: existing.employeeId,
      type: "DOCUMENT_SIGNED",
      title: `Document signed: ${updated.title}`,
      description: `${updated.documentNumber} (${existing.template?.name ?? updated.type}) was digitally signed by ${signerName.trim()} (${signerTitle.trim()}) and is now ${newStatus}. Verification hash: ${shortHash}.`,
      metadata: JSON.stringify({
        documentId: id,
        documentNumber: updated.documentNumber,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        signedAt: now.toISOString(),
        verificationHash,
        shortHash,
        reason: reason?.trim() || null,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    signedContent,
    verificationHash,
    shortHash,
    document: {
      id: updated.id,
      documentNumber: updated.documentNumber,
      status: updated.status,
      title: updated.title,
    },
  });
}
