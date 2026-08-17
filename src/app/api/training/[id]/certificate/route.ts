import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import PDFDocument from "pdfkit";
import { parseEnrollmentMeta, type CourseMeta, type CourseStatus } from "../../route";

// Local parser — same shape as parseCourseMeta in /api/training/route.ts
// (which is intentionally not exported to keep that module's API minimal).
function parseCourseMeta(description: string | null): CourseMeta {
  const fallback: CourseMeta = {
    description: null,
    trainer: null,
    startDate: null,
    endDate: null,
    duration: "",
    capacity: 0,
    category: "General",
    status: "SCHEDULED",
  };
  if (!description) return fallback;
  try {
    const p = JSON.parse(description);
    return {
      description: p.description ?? null,
      trainer: p.trainer ?? null,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      duration: String(p.duration ?? ""),
      capacity: Number(p.capacity ?? 0) || 0,
      category: String(p.category ?? "General"),
      status: (p.status as CourseStatus) ?? "SCHEDULED",
    };
  } catch {
    return fallback;
  }
}

// =============================================================
// Training certificate PDF generator
// =============================================================
//
// Generates a professional, decorative PDF certificate for an employee
// who has completed a training course. The certificate includes:
//   - Decorative double-border frame
//   - Company name + logo (if available)
//   - "Certificate of Completion" title
//   - Employee name (large, bold)
//   - Course title
//   - Trainer, dates, duration, score
//   - Unique certificate ID
//   - Issue date
//   - Signature line for HR
//
// Route: GET /api/training/[id]/certificate?employeeId=...
//   where [id] = course (activity) id

interface CertificateData {
  employeeName: string;
  employeeCode: string | null;
  courseTitle: string;
  courseDescription: string | null;
  trainer: string | null;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  score: number | null;
  completedAt: string | null;
  companyName: string;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyLogo: string | null;
  certificateId: string;
  issuedAt: Date;
}

// ---- Color palette (emerald primary, no indigo/blue) ----
const C = {
  primary: "10b981", // emerald-500
  primaryDark: "047857", // emerald-700
  primaryLight: "a7f3d0", // emerald-200
  gold: "b8860b", // dark goldenrod — for "seal" ring
  goldLight: "f5d76e",
  text: "1f2937", // gray-800
  textMuted: "6b7280", // gray-500
  border: "d1d5db", // gray-300
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Generate a unique certificate id like "CERT-2025-AB12CD34"
function makeCertificateId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `CERT-${year}-${rand}`;
}

// =============================================================
// PDF builder
// =============================================================

async function buildCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      // Landscape A4 — typical certificate orientation
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: `Certificate of Completion - ${data.employeeName}`,
          Author: data.companyName,
          Subject: data.courseTitle,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width; // 841.89 (A4 landscape)
      const pageHeight = doc.page.height; // 595.28
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // =====================================================
      // 1. Decorative border frame
      // =====================================================
      // Outer thick border
      doc
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .strokeColor(C.primary)
        .lineWidth(3)
        .stroke();
      // Inner thin border
      doc
        .rect(28, 28, pageWidth - 56, pageHeight - 56)
        .strokeColor(C.primaryDark)
        .lineWidth(0.75)
        .stroke();
      // Decorative corner accents (small squares)
      const cornerSize = 14;
      const corners = [
        { x: 20, y: 20 },
        { x: pageWidth - 20 - cornerSize, y: 20 },
        { x: 20, y: pageHeight - 20 - cornerSize },
        { x: pageWidth - 20 - cornerSize, y: pageHeight - 20 - cornerSize },
      ];
      corners.forEach((c) => {
        doc.rect(c.x, c.y, cornerSize, cornerSize).fillColor(C.primary).fill();
      });

      // =====================================================
      // 2. Header — Company logo (if available) + name
      // =====================================================
      let y = margin + 16;

      // Company name (centered)
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor(C.primaryDark)
        .text(data.companyName.toUpperCase(), margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 22;

      // Subtitle line — small emerald separator
      const sepY = y;
      doc
        .moveTo(pageWidth / 2 - 80, sepY)
        .lineTo(pageWidth / 2 + 80, sepY)
        .strokeColor(C.primary)
        .lineWidth(1)
        .stroke();
      // Small diamond in the middle
      doc
        .save()
        .moveTo(pageWidth / 2, sepY - 3)
        .lineTo(pageWidth / 2 + 3, sepY)
        .lineTo(pageWidth / 2, sepY + 3)
        .lineTo(pageWidth / 2 - 3, sepY)
        .closePath()
        .fillColor(C.primary)
        .fill()
        .restore();
      y += 18;

      // =====================================================
      // 3. "Certificate of Completion" title (large, centered)
      // =====================================================
      doc
        .font("Helvetica-Bold")
        .fontSize(40)
        .fillColor(C.text)
        .text("Certificate of Completion", margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 48;

      // "This is to certify that"
      doc
        .font("Helvetica-Oblique")
        .fontSize(13)
        .fillColor(C.textMuted)
        .text("This is to certify that", margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 22;

      // =====================================================
      // 4. Employee name (large, bold)
      // =====================================================
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor(C.primaryDark)
        .text(data.employeeName, margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 38;

      // Decorative underline under the employee name
      const empNameWidth = doc.widthOfString(data.employeeName);
      const centerX = pageWidth / 2;
      doc
        .moveTo(centerX - empNameWidth / 2 - 8, y - 6)
        .lineTo(centerX + empNameWidth / 2 + 8, y - 6)
        .strokeColor(C.primaryLight)
        .lineWidth(1)
        .stroke();

      // "has successfully completed"
      doc
        .font("Helvetica-Oblique")
        .fontSize(13)
        .fillColor(C.textMuted)
        .text("has successfully completed", margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 22;

      // =====================================================
      // 5. Course title (bold)
      // =====================================================
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(C.text)
        .text(data.courseTitle, margin, y, {
          width: contentWidth,
          align: "center",
        });
      y += 30;

      // =====================================================
      // 6. Course details — trainer, dates, duration
      // =====================================================
      const details: string[] = [];
      if (data.trainer) details.push(`conducted by ${data.trainer}`);
      if (data.startDate || data.endDate) {
        details.push(
          `from ${fmtDate(data.startDate)} to ${fmtDate(data.endDate)}`
        );
      }
      if (data.duration) details.push(`Duration: ${data.duration}`);

      if (details.length > 0) {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor(C.textMuted)
          .text(details.join("    •    "), margin, y, {
            width: contentWidth,
            align: "center",
          });
        y += 18;
      }

      // Score line (if available)
      if (data.score !== null) {
        const scoreColor =
          data.score >= 80
            ? C.primaryDark
            : data.score >= 50
              ? C.gold
              : "b91c1c";
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor(scoreColor)
          .text(`Score: ${data.score} / 100`, margin, y, {
            width: contentWidth,
            align: "center",
          });
        y += 20;
      }

      // =====================================================
      // 7. Decorative seal (gold circle on the left)
      // =====================================================
      const sealY = pageHeight - 130;
      const sealX = margin + 80;
      // Outer ring
      doc
        .circle(sealX, sealY, 38)
        .strokeColor(C.gold)
        .lineWidth(1.5)
        .stroke();
      // Inner ring
      doc
        .circle(sealX, sealY, 30)
        .strokeColor(C.gold)
        .lineWidth(0.75)
        .stroke();
      // Filled center
      doc.circle(sealX, sealY, 24).fillColor(C.goldLight).fill();
      // Star
      drawStar(doc, sealX, sealY, 5, 11, 5);
      doc.fillColor(C.gold).fill();
      // Text below seal
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(C.gold)
        .text("OFFICIAL", sealX - 30, sealY + 30, {
          width: 60,
          align: "center",
        });

      // =====================================================
      // 8. Certificate ID + Issue date (centered, below details)
      // =====================================================
      const metaY = pageHeight - 110;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(C.textMuted)
        .text(`Certificate ID: ${data.certificateId}`, margin, metaY, {
          width: contentWidth,
          align: "center",
        });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(C.textMuted)
        .text(`Issued on: ${fmtDate(data.issuedAt)}`, margin, metaY + 14, {
          width: contentWidth,
          align: "center",
        });

      // =====================================================
      // 9. Signature line for HR (right side)
      // =====================================================
      const sigX = pageWidth - margin - 160;
      const sigY = pageHeight - 100;
      // Signature line
      doc
        .moveTo(sigX, sigY)
        .lineTo(sigX + 160, sigY)
        .strokeColor(C.text)
        .lineWidth(0.75)
        .stroke();
      // "HR Manager" label below
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(C.text)
        .text("HR Manager", sigX, sigY + 6, { width: 160, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.textMuted)
        .text(data.companyName, sigX, sigY + 20, {
          width: 160,
          align: "center",
        });

      // Cursive-y "Approved" stamp text above signature (subtle)
      doc
        .font("Helvetica-Oblique")
        .fontSize(11)
        .fillColor(C.primary)
        .text("Authorized Signature", sigX, sigY - 18, {
          width: 160,
          align: "center",
        });

      // =====================================================
      // 10. Footer — company contact (centered, bottom)
      // =====================================================
      const footerY = pageHeight - 38;
      const contactBits: string[] = [];
      if (data.companyEmail) contactBits.push(data.companyEmail);
      if (data.companyPhone) contactBits.push(data.companyPhone);
      if (contactBits.length > 0) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.textMuted)
          .text(contactBits.join("   ·   "), margin, footerY, {
            width: contentWidth,
            align: "center",
          });
      }
      // Verification note
      doc
        .font("Helvetica-Oblique")
        .fontSize(7)
        .fillColor(C.border)
        .text(
          `Verify at ${data.companyName.toLowerCase().replace(/\s+/g, "")}.io/cert/${data.certificateId}`,
          margin,
          footerY + 10,
          { width: contentWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Draw an N-point star centered at (cx, cy)
function drawStar(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number
) {
  const step = Math.PI / points;
  doc.save();
  doc.moveTo(cx, cy - outerR);
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i + 1) * step;
    doc.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  doc.closePath();
  doc.restore();
}

// =============================================================
// Route handler
// =============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const { searchParams } = new URL(req.url);
  const employeeId = (searchParams.get("employeeId") || "").trim();

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId query parameter is required" },
      { status: 400 }
    );
  }

  // Validate course exists
  const course = await db.activity.findUnique({ where: { id: courseId } });
  if (!course || course.type !== "TRAINING_COURSE") {
    return NextResponse.json(
      { error: "Training course not found" },
      { status: 404 }
    );
  }

  const courseMeta = parseCourseMeta(course.description);
  // Some legacy seeded courses store a separate `id` field inside the
  // course metadata (distinct from the Activity.id). We need to accept
  // an enrollment that references either the activity id OR the meta id.
  const rawMeta = course.description ? (() => {
    try { return JSON.parse(course.description); } catch { return {}; }
  })() : {};
  const metaCourseId: string | undefined = rawMeta.id ?? undefined;
  const validCourseIds = new Set<string>([courseId, metaCourseId].filter(Boolean) as string[]);

  // Find this employee's enrollment for this course.
  // We look up by employeeId first (cheap index) and then filter by parsed
  // courseId — this handles both legacy seeded data and API-created data.
  const candidates = await db.activity.findMany({
    where: {
      type: "TRAINING_ENROLLMENT",
      employeeId,
    },
    include: {
      employee: {
        select: { fullName: true, employeeId: true, photo: true },
      },
    },
  });

  const enrollment = candidates.find((a) => {
    const m = parseEnrollmentMeta(a.description);
    return validCourseIds.has(m.courseId);
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found for this employee" },
      { status: 404 }
    );
  }

  const enrollmentMeta = parseEnrollmentMeta(enrollment.description);
  if (enrollmentMeta.status !== "COMPLETED") {
    return NextResponse.json(
      {
        error: `Enrollment is not COMPLETED (current: ${enrollmentMeta.status})`,
      },
      { status: 400 }
    );
  }

  const [company] = await Promise.all([
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  const certificateId = makeCertificateId();
  const issuedAt = new Date();

  const certData: CertificateData = {
    employeeName: enrollment.employee?.fullName ?? "Unknown Employee",
    employeeCode: enrollment.employee?.employeeId ?? null,
    courseTitle: course.title,
    courseDescription: courseMeta.description,
    trainer: courseMeta.trainer,
    startDate: courseMeta.startDate,
    endDate: courseMeta.endDate,
    duration: courseMeta.duration,
    score: enrollmentMeta.score,
    completedAt: enrollmentMeta.completedAt,
    companyName: company?.name ?? "BH HR",
    companyAddress: company?.address ?? null,
    companyEmail: company?.email ?? null,
    companyPhone: company?.phone ?? null,
    companyLogo: company?.logo ?? null,
    certificateId,
    issuedAt,
  };

  const pdfBuffer = await buildCertificatePdf(certData);

  // Audit log
  try {
    await db.auditLog.create({
      data: {
        action: "CERTIFICATE_GENERATED",
        entityType: "TrainingEnrollment",
        entityId: enrollment.id,
        description: `Generated training certificate for ${certData.employeeName} - ${certData.courseTitle}`,
        metadata: JSON.stringify({
          certificateId,
          courseId,
          employeeId,
          score: enrollmentMeta.score,
        }),
      },
    });
  } catch {
    // non-fatal
  }

  // Persist the certificate ID onto the enrollment metadata so future
  // downloads are reproducible & trackable. We re-use the existing
  // `certificate` field on the enrollment meta — only set if missing.
  if (!enrollmentMeta.certificate) {
    try {
      const updatedMeta = {
        ...enrollmentMeta,
        certificate: certificateId,
      };
      await db.activity.update({
        where: { id: enrollment.id },
        data: { description: JSON.stringify(updatedMeta) },
      });
    } catch {
      // non-fatal
    }
  }

  const fileName = `certificate-${slugify(certData.employeeName)}-${slugify(certData.courseTitle)}.pdf`;
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
