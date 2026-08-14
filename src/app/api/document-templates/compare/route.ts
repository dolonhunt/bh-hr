import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// =============================================================
// Document template comparison / diff
// =============================================================
//
// GET /api/document-templates/compare?id1=...&id2=...
//
// Returns a side-by-side line diff of the two templates' content
// (the main HTML body), plus inline diffs for the shorter string
// fields (subject, emailSubject, emailBody).

type DiffOp = "added" | "removed" | "unchanged";

interface LineDiffEntry {
  type: DiffOp;
  line: string;
  // Optional line number from the source side (1-indexed).
  lineNum?: number;
}

interface FieldDiffEntry {
  type: DiffOp;
  text: string;
}

interface CompareResponse {
  template1: {
    id: string;
    name: string;
    code: string;
    type: string;
    category: string;
    version: string;
    status: string;
    subject: string | null;
    content: string;
    emailSubject: string | null;
    emailBody: string | null;
    updatedAt: string;
  };
  template2: {
    id: string;
    name: string;
    code: string;
    type: string;
    category: string;
    version: string;
    status: string;
    subject: string | null;
    content: string;
    emailSubject: string | null;
    emailBody: string | null;
    updatedAt: string;
  };
  contentDiff: LineDiffEntry[];
  subjectDiff: FieldDiffEntry[];
  emailSubjectDiff: FieldDiffEntry[];
  emailBodyDiff: LineDiffEntry[];
  stats: {
    content: { added: number; removed: number; unchanged: number };
    subject: { added: number; removed: number; unchanged: number };
    emailSubject: { added: number; removed: number; unchanged: number };
    emailBody: { added: number; removed: number; unchanged: number };
  };
}

// =============================================================
// Diff algorithm — classic LCS dynamic programming on lines.
// =============================================================

function splitLines(s: string): string[] {
  if (!s) return [];
  // Normalize CRLF -> LF, then split on \n. We keep empty trailing lines.
  return s.replace(/\r\n/g, "\n").split("\n");
}

/**
 * Compute a line-by-line diff between two strings using LCS.
 * Returns a sequence of { type, line } entries that, when walked
 * from top to bottom, reconstructs both inputs (removed lines come
 * from `a`, added lines come from `b`, unchanged lines are common).
 */
function lineDiff(a: string, b: string): LineDiffEntry[] {
  const A = splitLines(a);
  const B = splitLines(b);
  const n = A.length;
  const m = B.length;

  // Build the LCS table. We use Uint32Array for speed (lines can be long).
  // dp[i][j] = length of LCS of A[0..i) and B[0..j).
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    dp[i] = new Uint32Array(m + 1);
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce the diff.
  const out: LineDiffEntry[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) {
      out.push({ type: "unchanged", line: A[i - 1], lineNum: i });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      // Removed line (present in A only)
      out.push({ type: "removed", line: A[i - 1], lineNum: i });
      i--;
    } else {
      // Added line (present in B only)
      out.push({ type: "added", line: B[j - 1], lineNum: j });
      j--;
    }
  }
  while (i > 0) {
    out.push({ type: "removed", line: A[i - 1], lineNum: i });
    i--;
  }
  while (j > 0) {
    out.push({ type: "added", line: B[j - 1], lineNum: j });
    j--;
  }
  out.reverse();
  return out;
}

/**
 * Compute a token-level diff between two short strings (used for the
 * subject / emailSubject fields). Tokenises on whitespace but keeps
 * the spaces attached to each token so the rendered output reads
 * naturally. Falls back to a single added/removed entry pair if
 * either side is empty.
 */
function tokenDiff(a: string, b: string): FieldDiffEntry[] {
  const av = a ?? "";
  const bv = b ?? "";
  if (av === bv) {
    return av ? [{ type: "unchanged", text: av }] : [];
  }
  if (!av) return [{ type: "added", text: bv }];
  if (!bv) return [{ type: "removed", text: av }];

  // Tokenise: capture word + trailing whitespace as a single token so
  // the diff renders naturally when concatenated.
  const tokensA = av.match(/\S+\s*/g) ?? [av];
  const tokensB = bv.match(/\S+\s*/g) ?? [bv];

  // Reuse the line diff routine (it's generic on string arrays).
  const n = tokensA.length;
  const m = tokensB.length;
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const out: FieldDiffEntry[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (tokensA[i - 1] === tokensB[j - 1]) {
      out.push({ type: "unchanged", text: tokensA[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.push({ type: "removed", text: tokensA[i - 1] });
      i--;
    } else {
      out.push({ type: "added", text: tokensB[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    out.push({ type: "removed", text: tokensA[i - 1] });
    i--;
  }
  while (j > 0) {
    out.push({ type: "added", text: tokensB[j - 1] });
    j--;
  }
  out.reverse();
  return out;
}

function countDiff<T extends { type: DiffOp }>(diff: T[]): {
  added: number;
  removed: number;
  unchanged: number;
} {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const d of diff) {
    if (d.type === "added") added++;
    else if (d.type === "removed") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}

function templateToPublic(t: any) {
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    type: t.type,
    category: t.category,
    version: t.version,
    status: t.status,
    subject: t.subject ?? null,
    content: t.content ?? "",
    emailSubject: t.emailSubject ?? null,
    emailBody: t.emailBody ?? null,
    updatedAt: t.updatedAt?.toISOString?.() ?? String(t.updatedAt ?? ""),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id1 = searchParams.get("id1") || "";
  const id2 = searchParams.get("id2") || "";

  if (!id1 || !id2) {
    return NextResponse.json(
      { error: "Both id1 and id2 query parameters are required." },
      { status: 400 }
    );
  }
  if (id1 === id2) {
    return NextResponse.json(
      { error: "Cannot compare a template with itself. Choose two different templates." },
      { status: 400 }
    );
  }

  const [t1, t2] = await Promise.all([
    db.documentTemplate.findUnique({ where: { id: id1 } }),
    db.documentTemplate.findUnique({ where: { id: id2 } }),
  ]);

  if (!t1 || !t2) {
    return NextResponse.json(
      { error: "One or both templates were not found." },
      { status: 404 }
    );
  }

  const contentDiff = lineDiff(t1.content ?? "", t2.content ?? "");
  const subjectDiff = tokenDiff(t1.subject ?? "", t2.subject ?? "");
  const emailSubjectDiff = tokenDiff(t1.emailSubject ?? "", t2.emailSubject ?? "");
  const emailBodyDiff = lineDiff(t1.emailBody ?? "", t2.emailBody ?? "");

  const body: CompareResponse = {
    template1: templateToPublic(t1),
    template2: templateToPublic(t2),
    contentDiff,
    subjectDiff,
    emailSubjectDiff,
    emailBodyDiff,
    stats: {
      content: countDiff(contentDiff),
      subject: countDiff(subjectDiff),
      emailSubject: countDiff(emailSubjectDiff),
      emailBody: countDiff(emailBodyDiff),
    },
  };

  return NextResponse.json(body);
}
