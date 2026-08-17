// HTML -> DOCX and HTML -> PDF renderers for generated HR documents.
// The templates use a small subset of HTML (headings, paragraphs, hr, br,
// tables with tr/td/th, and inline <strong>/<b>/<em>/<i>/<u>). We parse that
// into a tiny block tree and then emit docx elements or pdfkit calls.

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx";
import PDFDocument from "pdfkit";

interface InlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; runs: InlineRun[] }
  | { kind: "paragraph"; runs: InlineRun[]; align?: "left" | "center" | "right" }
  | { kind: "hr" }
  | { kind: "spacer" }
  | {
      kind: "table";
      rows: { cells: { runs: InlineRun[]; header?: boolean; colspan?: number }[] }[];
    };

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parse a small subset of inline HTML into a list of InlineRun.
 * Supports <strong>/<b>, <em>/<i>, <u> and plain text.
 */
function parseInline(html: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let bold = false;
  let italics = false;
  let underline = false;
  let buffer = "";

  function flush() {
    if (buffer.length > 0) {
      runs.push({
        text: decodeEntities(buffer),
        bold: bold || undefined,
        italics: italics || undefined,
        underline: underline || undefined,
      });
      buffer = "";
    }
  }

  // Token-by-token walk over the input.
  const re = /(<\/?(?:strong|b|em|i|u)\s*>)/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > lastIndex) buffer += html.slice(lastIndex, m.index);
    const tag = m[1].toLowerCase();
    const closing = tag.startsWith("</");
    const name = tag.replace(/[<\/>]/g, "");
    flush();
    if (name === "strong" || name === "b") bold = !closing;
    else if (name === "em" || name === "i") italics = !closing;
    else if (name === "u") underline = !closing;
    lastIndex = re.lastIndex;
  }
  buffer += html.slice(lastIndex);
  flush();
  return runs;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/**
 * Parse a tiny HTML body into a list of blocks. We support a very deliberate
 * subset (h1-h6, p, hr, br, table, tr, td, th, strong/b, em/i, u) which is
 * exactly what the seeded templates emit.
 */
export function parseHtmlBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  if (!html) return blocks;

  // Normalise whitespace but preserve <pre>-free inline structure.
  const src = html.replace(/\r\n/g, "\n").trim();

  // Walk through the source and pick off the next top-level element each time.
  let i = 0;
  const len = src.length;
  const pushText = (text: string) => {
    if (text.trim()) {
      blocks.push({ kind: "paragraph", runs: parseInline(text) });
    }
  };

  while (i < len) {
    // Skip whitespace between elements.
    while (i < len && /\s/.test(src[i])) i++;
    if (i >= len) break;

    if (src[i] !== "<") {
      // Plain text outside any container — emit as paragraph.
      const next = src.indexOf("<", i);
      const chunk = next === -1 ? src.slice(i) : src.slice(i, next);
      pushText(chunk);
      i = next === -1 ? len : next;
      continue;
    }

    // We're at a tag. Read the tag name.
    const tagEnd = src.indexOf(">", i);
    if (tagEnd === -1) {
      pushText(src.slice(i));
      break;
    }
    const rawTag = src.slice(i + 1, tagEnd).trim();
    const isClosing = rawTag.startsWith("/");
    const tagName = rawTag.replace(/^\//, "").split(/\s+/)[0].toLowerCase();
    const tagAttrs = rawTag.slice(tagName.length).trim();
    i = tagEnd + 1;

    if (isClosing) {
      // Stray closing tag — ignore.
      continue;
    }

    if (tagName === "hr") {
      blocks.push({ kind: "hr" });
      continue;
    }
    if (tagName === "br") {
      blocks.push({ kind: "spacer" });
      continue;
    }

    if (/^h[1-6]$/.test(tagName)) {
      const level = Number(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6;
      const close = src.indexOf(`</${tagName}>`, i);
      const inner = close === -1 ? src.slice(i) : src.slice(i, close);
      blocks.push({ kind: "heading", level, runs: parseInline(inner) });
      i = close === -1 ? len : close + tagName.length + 3;
      continue;
    }

    if (tagName === "p") {
      const close = src.indexOf("</p>", i);
      const inner = close === -1 ? src.slice(i) : src.slice(i, close);
      const alignMatch = /align\s*=\s*"([^"]+)"/i.exec(tagAttrs);
      const align = alignMatch
        ? (alignMatch[1].toLowerCase() as "left" | "center" | "right")
        : undefined;
      blocks.push({ kind: "paragraph", runs: parseInline(inner), align });
      i = close === -1 ? len : close + 4;
      continue;
    }

    if (tagName === "table") {
      const close = src.indexOf("</table>", i);
      const inner = close === -1 ? src.slice(i) : src.slice(i, close);
      i = close === -1 ? len : close + 8;

      const rows: Block extends infer T
        ? T extends { kind: "table" }
          ? T["rows"]
          : never
        : never = [] as any;
      // Parse <tr>...</tr> blocks.
      let ri = 0;
      while (ri < inner.length) {
        const trStart = inner.indexOf("<tr", ri);
        if (trStart === -1) break;
        const trOpenEnd = inner.indexOf(">", trStart);
        if (trOpenEnd === -1) break;
        const trClose = inner.indexOf("</tr>", trOpenEnd);
        if (trClose === -1) break;
        const trInner = inner.slice(trOpenEnd + 1, trClose);
        ri = trClose + 5;

        const cells: {
          runs: InlineRun[];
          header?: boolean;
          colspan?: number;
        }[] = [];
        let ci = 0;
        while (ci < trInner.length) {
          const cellStart = trInner.indexOf("<", ci);
          if (cellStart === -1) break;
          // identify th or td
          const cellOpenEnd = trInner.indexOf(">", cellStart);
          if (cellOpenEnd === -1) break;
          const cellTag = trInner
            .slice(cellStart + 1, cellOpenEnd)
            .trim()
            .split(/\s+/)[0]
            .toLowerCase();
          if (cellTag !== "th" && cellTag !== "td") {
            ci = cellOpenEnd + 1;
            continue;
          }
          const cellClose = trInner.indexOf(`</${cellTag}>`, cellOpenEnd);
          const cellInner =
            cellClose === -1
              ? trInner.slice(cellOpenEnd + 1)
              : trInner.slice(cellOpenEnd + 1, cellClose);
          const colspanMatch = /colspan\s*=\s*"?(\d+)"?/i.exec(
            trInner.slice(cellStart, cellOpenEnd)
          );
          cells.push({
            runs: parseInline(cellInner),
            header: cellTag === "th",
            colspan: colspanMatch ? Number(colspanMatch[1]) : undefined,
          });
          ci = cellClose === -1 ? trInner.length : cellClose + cellTag.length + 3;
        }
        if (cells.length > 0) {
          (rows as any).push({ cells });
        }
      }
      blocks.push({ kind: "table", rows });
      continue;
    }

    // Unknown tag — strip and continue.
    const closeIdx = src.indexOf(`</${tagName}>`, i);
    if (closeIdx === -1) {
      pushText(stripTags(src.slice(i)));
      break;
    } else {
      pushText(stripTags(src.slice(i, closeIdx)));
      i = closeIdx + tagName.length + 3;
    }
  }

  return blocks;
}

function runsToText(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join("");
}

// =============================================================
// DOCX
// =============================================================

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function toDocxRuns(runs: InlineRun[]) {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italics,
        underline: r.underline ? {} : undefined,
      })
  );
}

function blocksToDocxChildren(blocks: Block[]) {
  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.kind === "heading") {
      children.push(
        new Paragraph({
          heading: HEADING_MAP[block.level] ?? HeadingLevel.HEADING_2,
          children: toDocxRuns(block.runs),
        })
      );
    } else if (block.kind === "paragraph") {
      const alignment =
        block.align === "center"
          ? AlignmentType.CENTER
          : block.align === "right"
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT;
      children.push(
        new Paragraph({
          alignment,
          children: toDocxRuns(block.runs),
        })
      );
    } else if (block.kind === "spacer") {
      children.push(new Paragraph({ children: [] }));
    } else if (block.kind === "hr") {
      children.push(
        new Paragraph({
          border: {
            bottom: {
              color: "999999",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );
    } else if (block.kind === "table") {
      const rows = block.rows.map(
        (row) =>
          new TableRow({
            children: row.cells.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: toDocxRuns(cell.runs),
                    }),
                  ],
                  shading: cell.header
                    ? {
                        type: ShadingType.CLEAR,
                        color: "auto",
                        fill: "EEEEEE",
                      }
                    : undefined,
                  columnSpan: cell.colspan,
                })
            ),
          })
      );
      children.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }
  return children;
}

export async function renderDocxBuffer(opts: {
  title: string;
  html: string;
}): Promise<Buffer> {
  const blocks = parseHtmlBlocks(opts.html);
  const doc = new Document({
    creator: "BH HR",
    title: opts.title,
    description: opts.title,
    sections: [
      {
        properties: {},
        children: blocksToDocxChildren(blocks),
      },
    ],
  });
  // Packer.toBuffer returns a Node Buffer when running on the server.
  return (await Packer.toBuffer(doc)) as unknown as Buffer;
}

// =============================================================
// PDF (pdfkit)
// =============================================================

interface PdfRenderResult {
  buffer: Buffer;
}

export async function renderPdfBuffer(opts: {
  title: string;
  html: string;
}): Promise<PdfRenderResult> {
  const blocks = parseHtmlBlocks(opts.html);

  return new Promise<PdfRenderResult>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 56, bottom: 56, left: 56, right: 56 },
        info: {
          Title: opts.title,
          Author: "BH HR",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve({ buffer: Buffer.concat(chunks) }));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 56;
      const contentWidth = pageWidth - margin * 2;

      for (const block of blocks) {
        if (block.kind === "heading") {
          const size = [22, 18, 16, 14, 13, 12][block.level - 1] ?? 14;
          doc.moveDown(0.4);
          doc
            .fontSize(size)
            .font("Helvetica-Bold")
            .text(runsToText(block.runs), {
              width: contentWidth,
              align: "left",
            });
          doc.font("Helvetica");
          doc.moveDown(0.2);
        } else if (block.kind === "paragraph") {
          const align =
            block.align === "center"
              ? "center"
              : block.align === "right"
                ? "right"
                : "left";
          doc.fontSize(11).font("Helvetica").moveDown(0.2);
          // Render runs with mixed bold/italic.
          let x = margin;
          const yStart = doc.y;
          // pdfkit doesn't easily compose inline mixed runs across wrapping
          // paragraphs; we fall back to a single styled line per paragraph.
          const hasMixedStyle = block.runs.some((r) => r.bold || r.italics || r.underline);
          if (!hasMixedStyle) {
            doc.text(runsToText(block.runs), {
              width: contentWidth,
              align: align as "left" | "center" | "right",
            });
          } else {
            // Render each run sequentially on the same line.
            const y = doc.y;
            doc.text("", { width: contentWidth });
            doc.y = y;
            for (const r of block.runs) {
              const font =
                r.bold && r.italics
                  ? "Helvetica-BoldOblique"
                  : r.bold
                    ? "Helvetica-Bold"
                    : r.italics
                      ? "Helvetica-Oblique"
                      : "Helvetica";
              doc.font(font).text(r.text, {
                width: contentWidth,
                align: align as "left" | "center" | "right",
                continued: true,
              });
            }
            doc.font("Helvetica").text("", { continued: false });
          }
          doc.x = margin;
          void x;
          void yStart;
        } else if (block.kind === "spacer") {
          doc.moveDown(0.4);
        } else if (block.kind === "hr") {
          doc.moveDown(0.4);
          const y = doc.y;
          doc
            .moveTo(margin, y)
            .lineTo(pageWidth - margin, y)
            .strokeColor("#cccccc")
            .lineWidth(1)
            .stroke();
          doc.moveDown(0.4);
        } else if (block.kind === "table") {
          doc.moveDown(0.2);
          const startY = doc.y;
          // Compute column count from max cells in any row.
          const colCount = block.rows.reduce(
            (max, r) => Math.max(max, r.cells.length),
            0
          );
          if (colCount === 0) continue;
          const colWidth = contentWidth / colCount;
          const rowHeight = 22;

          // Estimate table height and start a new page if needed.
          const totalHeight = block.rows.length * rowHeight + 8;
          if (doc.y + totalHeight > pageHeight - margin) {
            doc.addPage();
          }

          let y = doc.y;
          for (const row of block.rows) {
            let x = margin;
            for (let ci = 0; ci < colCount; ci++) {
              const cell = row.cells[ci];
              const colspan = cell?.colspan ?? 1;
              const w = colWidth * colspan;
              if (cell) {
                if (cell.header) {
                  doc
                    .rect(x, y, w, rowHeight)
                    .fillColor("#EEEEEE")
                    .fill();
                }
                doc
                  .rect(x, y, w, rowHeight)
                  .strokeColor("#cccccc")
                  .lineWidth(0.5)
                  .stroke();
                doc
                  .fillColor("#000000")
                  .font(cell.header ? "Helvetica-Bold" : "Helvetica")
                  .fontSize(10)
                  .text(runsToText(cell.runs), x + 4, y + 6, {
                    width: w - 8,
                    height: rowHeight - 8,
                    align: "left",
                  });
                x += w;
              } else {
                x += colWidth;
              }
            }
            y += rowHeight;
          }
          doc.y = y + 4;
          doc.x = margin;
          void startY;
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
