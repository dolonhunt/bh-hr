/**
 * Shared print helper for HR documents (payslips, offer letters, etc.).
 *
 * Opens a new browser window, writes the document's HTML content wrapped in a
 * print-friendly HTML scaffold (serif font, 800px max width, 2cm page margins),
 * triggers the browser's print dialog, and closes the window afterwards.
 *
 * The print window inherits no app chrome (sidebar, topbar, etc.) — only the
 * rendered document content + a small page header showing the title and the
 * document number.
 */

const PRINT_CSS = `
  @page { margin: 2cm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #1a1a1a;
  }
  body {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
  .print-header {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  .print-header h1 {
    font-size: 20px;
    margin: 0 0 4px 0;
    color: #1a1a1a;
    font-weight: 700;
  }
  .print-header .doc-number {
    font-family: "Courier New", monospace;
    font-size: 12px;
    color: #555;
  }
  h1, h2, h3, h4 {
    color: #1a1a1a;
    line-height: 1.3;
  }
  h1 { font-size: 22px; margin: 1em 0 0.5em; }
  h2 { font-size: 18px; margin: 1em 0 0.5em; }
  h3 { font-size: 16px; margin: 1em 0 0.5em; }
  p { margin: 0.6em 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f4f4f4;
    font-weight: 600;
  }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 1em 0;
  }
  ul, ol { padding-left: 1.5em; }
  a { color: #1a1a1a; text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  strong, b { font-weight: 700; }
  /* Hide anything specifically marked for screen only */
  .no-print { display: none !important; }
`;

export interface PrintOptions {
  /** Document title — shown in the page header above the content. */
  title: string;
  /** Rendered HTML content of the document body. */
  html: string;
  /** Optional document number (e.g. "OFFER_...") shown in the page header. */
  docNumber?: string;
}

/**
 * Print a document in a clean, chrome-free new window.
 *
 * Returns true if the print window was opened successfully, false otherwise
 * (e.g. if the browser blocked the popup).
 */
export function printDocument({ title, html, docNumber }: PrintOptions): boolean {
  const printWin = window.open("", "_blank", "width=900,height=700");
  if (!printWin) {
    return false;
  }

  const safeTitle = escapeHtml(title);
  const safeDocNumber = docNumber ? escapeHtml(docNumber) : "";

  const doc = printWin.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}${safeDocNumber ? ` · ${safeDocNumber}` : ""}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-header">
    <h1>${safeTitle}</h1>
    ${safeDocNumber ? `<div class="doc-number">Document No: ${safeDocNumber}</div>` : ""}
  </div>
  <div class="print-content">
    ${html}
  </div>
  <script>
    (function() {
      // Give the new window a moment to lay out, then print.
      function triggerPrint() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          // ignore — the user can still print via Ctrl+P
        }
      }
      // Most browsers fire onafterprint when the print dialog closes.
      window.onafterprint = function() {
        try { window.close(); } catch (e) {}
      };
      // Defer print so styles + images have a chance to apply.
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function() {
          window.requestAnimationFrame(triggerPrint);
        });
      } else {
        setTimeout(triggerPrint, 250);
      }
    })();
  </script>
</body>
</html>`);
  doc.close();

  // Fallback: some browsers don't fire onafterprint reliably — try closing
  // after a delay if the window still exists. Wrapped in try/catch so we
  // never throw if the window is already closed.
  setTimeout(() => {
    try {
      if (printWin && !printWin.closed) {
        // Don't force-close — let the user dismiss the print dialog naturally.
      }
    } catch (e) {
      // ignore
    }
  }, 1000);

  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
