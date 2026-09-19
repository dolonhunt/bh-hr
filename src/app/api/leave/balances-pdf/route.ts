import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import PDFDocument from "pdfkit";

// =============================================================
// GET /api/leave/balances-pdf
//
// Renders a print-ready "Leave Balances" PDF: one row per
// (employee × active leave type) with allocated / used / pending /
// remaining days. Over-committed rows (used + pending > allocated)
// are highlighted with an OVER badge — the same math enforced by
// the leave approval hard-block (Settings → Leave Types).
// =============================================================

const C = {
  primary: "#10b981",
  primaryDark: "#047857",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderLight: "#eef1f4",
  headerBg: "#f3f4f6",
  rowAlt: "#f9fafb",
  rose: "#e11d48",
  roseBg: "#fff1f2",
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function GET(_req: NextRequest) {
  const [employees, leaveTypes, leaveRequests, company] = await Promise.all([
    db.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        employmentStatus: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        joiningDate: true,
      },
      orderBy: { employeeId: "asc" },
    }),
    db.leaveType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    db.leaveRequest.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      select: { employeeId: true, leaveTypeId: true, status: true, days: true },
    }),
    db.company.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  const sums = new Map<string, { used: number; pending: number }>();
  for (const lr of leaveRequests) {
    const key = `${lr.employeeId}|${lr.leaveTypeId}`;
    const entry = sums.get(key) ?? { used: 0, pending: 0 };
    if (lr.status === "APPROVED") entry.used += lr.days;
    else entry.pending += lr.days;
    sums.set(key, entry);
  }

  interface Row {
    emp: (typeof employees)[number];
    type: (typeof leaveTypes)[number];
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
    over: number;
  }
  const rows: Row[] = [];
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const s = sums.get(`${emp.id}|${lt.id}`) ?? { used: 0, pending: 0 };
      const allocated = lt.defaultDays ?? 0;
      const committed = s.used + s.pending;
      rows.push({
        emp,
        type: lt,
        allocated,
        used: s.used,
        pending: s.pending,
        remaining: allocated - committed,
        over: Math.max(committed - allocated, 0),
      });
    }
  }
  const overCount = rows.filter((r) => r.over > 0).length;

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        // bottom margin must stay small enough that footer text drawn at
        // pageHeight-30 fits ABOVE page.maxY() — otherwise pdfkit silently
        // adds a blank page for every footer (bufferPages pagination bug).
        margins: { top: 56, bottom: 16, left: 48, right: 48 },
        bufferPages: true,
        info: {
          Title: "Leave Balances",
          Author: "BH HR",
          Subject: "Leave balances report",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 48;
      const contentWidth = pageWidth - margin * 2;
      const generatedAt = new Date();

      // ---- Header band ----
      doc.rect(0, 0, pageWidth, 96).fillColor(C.primary).fill();
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("Leave Balances", margin, 24, { width: contentWidth });
      doc
        .font("Helvetica")
        .fontSize(11)
        .opacity(0.9)
        .text(
          `${company?.name ?? "BH HR"} · ${employees.length} employee${employees.length === 1 ? "" : "s"} · ${leaveTypes.length} leave type${leaveTypes.length === 1 ? "" : "s"}`,
          margin,
          56,
          { width: contentWidth }
        )
        .opacity(1);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.textMuted)
        .text(
          `Generated on ${generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}${overCount > 0 ? ` · ${overCount} over-committed entr${overCount === 1 ? "y" : "ies"}` : " · all balances within allocation"}`,
          margin,
          104,
          { width: contentWidth, align: "right" }
        );

      // ---- Table geometry ----
      const cols = {
        employee: 150,
        dept: 78,
        type: 92,
        allocated: 52,
        used: 48,
        pending: 52,
        remaining: 58,
        flag: 40,
      };
      const totalW = Object.values(cols).reduce((a, b) => a + b, 0);
      const scale = contentWidth / totalW;
      const cw = Object.fromEntries(
        Object.entries(cols).map(([k, v]) => [k, v * scale])
      ) as typeof cols;

      const headerLabels: Array<[string, number]> = [
        ["Employee", cw.employee],
        ["Department", cw.dept],
        ["Leave type", cw.type],
        ["Alloc.", cw.allocated],
        ["Used", cw.used],
        ["Pend.", cw.pending],
        ["Remain.", cw.remaining],
        ["", cw.flag],
      ];

      const headerRowH = 22;
      let rowH = 26;
      let y = 128;

      const drawHeader = (topY: number) => {
        let x = margin;
        headerLabels.forEach(([label, w]) => {
          doc
            .rect(x, topY, w, headerRowH)
            .fillColor(C.headerBg)
            .fill();
          doc
            .strokeColor(C.borderLight)
            .lineWidth(0.5)
            .rect(x, topY, w, headerRowH)
            .stroke();
          if (label) {
            doc
              .font("Helvetica-Bold")
              .fontSize(7.5)
              .fillColor(C.text)
              .text(label.toUpperCase(), x + 4, topY + 7, {
                width: w - 8,
                height: headerRowH - 8,
              });
          }
          x += w;
        });
      };

      drawHeader(y);
      y += headerRowH;

      rows.forEach((r, idx) => {
        if (y + rowH > pageHeight - 80) {
          doc.addPage();
          y = margin + 8;
          drawHeader(y);
          y += headerRowH;
        }

        const isOver = r.over > 0;
        const bg = isOver ? C.roseBg : idx % 2 === 1 ? C.rowAlt : null;
        if (bg) {
          doc.rect(margin, y, contentWidth, rowH).fillColor(bg).fill();
        }

        let x = margin;
        const cell = (
          text: string,
          w: number,
          o: {
            bold?: boolean;
            size?: number;
            color?: string;
            valign?: number;
          } = {}
        ) => {
          doc
            .strokeColor(C.borderLight)
            .lineWidth(0.5)
            .rect(x, y, w, rowH)
            .stroke();
          doc
            .font(o.bold ? "Helvetica-Bold" : "Helvetica")
            .fontSize(o.size ?? 8)
            .fillColor(o.color ?? C.text)
            .text(text, x + 4, y + (o.valign ?? 8), {
              width: w - 8,
              height: rowH - 10,
              ellipsis: true,
            });
          x += w;
        };

        // Employee cell: name (bold) + code on second line
        doc
          .strokeColor(C.borderLight)
          .lineWidth(0.5)
          .rect(x, y, cw.employee, rowH)
          .stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(r.emp.fullName, x + 4, y + 4, {
            width: cw.employee - 8,
            height: 11,
            ellipsis: true,
          });
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(C.textMuted)
          .text(
            `${r.emp.employeeId} · joined ${fmtDate(r.emp.joiningDate)}`,
            x + 4,
            y + 15,
            { width: cw.employee - 8, height: 9, ellipsis: true }
          );
        x += cw.employee;

        cell(r.emp.department?.name ?? "—", cw.dept, { size: 7.5 });
        // Type cell with color swatch
        doc
          .strokeColor(C.borderLight)
          .lineWidth(0.5)
          .rect(x, y, cw.type, rowH)
          .stroke();
        doc
          .rect(x + 4, y + rowH / 2 - 3, 6, 6)
          .fillColor(r.type.color || C.primary)
          .fill();
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.text)
          .text(r.type.name, x + 13, y + 8, {
            width: cw.type - 17,
            height: rowH - 10,
            ellipsis: true,
          });
        x += cw.type;

        cell(String(r.allocated), cw.allocated);
        cell(String(r.used), cw.used);
        cell(
          String(r.pending),
          cw.pending,
          r.pending > 0 ? { color: C.textMuted } : {}
        );
        cell(
          String(r.remaining),
          cw.remaining,
          isOver
            ? { bold: true, color: C.rose }
            : r.remaining === 0
              ? { color: C.textMuted }
              : {}
        );

        // Flag cell: OVER badge
        doc
          .strokeColor(C.borderLight)
          .lineWidth(0.5)
          .rect(x, y, cw.flag, rowH)
          .stroke();
        if (isOver) {
          const badgeW = 30;
          doc
            .rect(x + (cw.flag - badgeW) / 2, y + rowH / 2 - 6, badgeW, 12)
            .fillColor(C.rose)
            .fill();
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor("#ffffff")
            .text(`+${r.over} OVER`, x, y + rowH / 2 - 3, {
              width: cw.flag,
              align: "center",
            });
        }

        y += rowH;
      });

      // ---- Per-type totals ----
      y += 14;
      if (y + 30 + leaveTypes.length * 18 > pageHeight - 80) {
        doc.addPage();
        y = margin + 8;
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(C.text)
        .text("Totals by leave type", margin, y, { width: contentWidth });
      y += 20;
      leaveTypes.forEach((lt) => {
        const aggregate = rows
          .filter((r) => r.type.id === lt.id)
          .reduce(
            (acc, r) => ({
              allocated: acc.allocated + r.allocated,
              used: acc.used + r.used,
              pending: acc.pending + r.pending,
              remaining: acc.remaining + r.remaining,
            }),
            { allocated: 0, used: 0, pending: 0, remaining: 0 }
          );
        doc.rect(margin, y + 3, 6, 6).fillColor(lt.color || C.primary).fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(C.text)
          .text(lt.name, margin + 12, y, { width: 160 });
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(C.textMuted)
          .text(
            `allocated ${aggregate.allocated}d · used ${aggregate.used}d · pending ${aggregate.pending}d · remaining ${aggregate.remaining}d`,
            margin + 180,
            y,
            { width: contentWidth - 180 }
          );
        y += 18;
      });

      // ---- Footers ----
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const footerY = pageHeight - 36;
        doc
          .moveTo(margin, footerY)
          .lineTo(pageWidth - margin, footerY)
          .strokeColor(C.border)
          .lineWidth(0.5)
          .stroke();
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.textMuted)
          .text(
            `${company?.name ?? "BH HR"} · Leave Balances`,
            margin,
            footerY + 6,
            { width: contentWidth / 2 }
          );
        doc.text(`Page ${i + 1} of ${range.count}`, pageWidth / 2, footerY + 6, {
          width: contentWidth / 2,
          align: "right",
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

  // Audit (non-fatal)
  try {
    const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    await db.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action: "LEAVE_BALANCES_PDF",
        entityType: "Leave",
        description: `Generated leave balances PDF (${employees.length} employees × ${leaveTypes.length} types, ${overCount} over-committed)`,
        metadata: JSON.stringify({ employees: employees.length, overCount }),
      },
    });
  } catch {
    // ignore
  }

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="leave-balances-${dateStr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
