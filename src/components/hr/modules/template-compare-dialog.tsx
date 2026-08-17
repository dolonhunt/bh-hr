"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  GitCompareArrows,
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  Equal,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

// =============================================================
// Types — mirror the shape returned by /api/document-templates/compare
// =============================================================

type DiffOp = "added" | "removed" | "unchanged";

interface LineDiffEntry {
  type: DiffOp;
  line: string;
  lineNum?: number;
}

interface FieldDiffEntry {
  type: DiffOp;
  text: string;
}

interface TemplateSummary {
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
}

interface CompareResponse {
  template1: TemplateSummary;
  template2: TemplateSummary;
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
// Props
// =============================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional initial template ids (e.g. when triggered from a row action). */
  templateId1?: string;
  templateId2?: string;
}

// =============================================================
// Component
// =============================================================

export function TemplateCompareDialog({
  open,
  onOpenChange,
  templateId1,
  templateId2,
}: Props) {
  // Two-step state: we keep the externally-provided initial ids on mount,
  // then let the user override them via the dropdowns. We deliberately
  // don't reset on every prop change so the user can keep working in the
  // dialog without losing their selection.
  const [sel1, setSel1] = useState<string>(templateId1 ?? "");
  const [sel2, setSel2] = useState<string>(templateId2 ?? "");

  // Sync selections from the parent each time the dialog is opened with
  // fresh prop ids. Using the documented "adjust state when props change"
  // pattern (tracking the previous prop value during render) avoids the
  // react-hooks/set-state-in-effect lint warning.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSel1(templateId1 ?? "");
      setSel2(templateId2 ?? "");
    }
  }

  // Fetch the list of templates so we can populate the dropdowns.
  // We use the default endpoint behaviour (excludes ARCHIVED templates)
  // — comparing archived templates isn't a common workflow.
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["document-templates", "compare-dialog", "all"],
    queryFn: async () => {
      const r = await fetch("/api/document-templates");
      return r.json();
    },
    enabled: open,
  });

  const templates: TemplateSummary[] = useMemo(() => {
    const items: any[] = templatesData?.items ?? [];
    // Default to the two most recently updated templates.
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? 0).getTime()
    );
    return sorted;
  }, [templatesData]);

  // Auto-pick the two most recently updated templates if the user hasn't
  // provided explicit ids and the dropdowns are empty. We use the same
  // "adjust state when prop changes" pattern — track the previous
  // templates.length and only re-run the auto-pick when it changes.
  const [prevTplCount, setPrevTplCount] = useState(0);
  if (open && templates.length > 0 && templates.length !== prevTplCount) {
    setPrevTplCount(templates.length);
    if (!sel1 && !sel2) {
      setSel1(templates[0]?.id ?? "");
      setSel2(templates[1]?.id ?? templates[0]?.id ?? "");
    } else if (!sel1) {
      const other = templates.find((t) => t.id !== sel2);
      setSel1(other?.id ?? "");
    } else if (!sel2) {
      const other = templates.find((t) => t.id !== sel1);
      setSel2(other?.id ?? "");
    }
  }

  const canFetch: boolean = open && !!sel1 && !!sel2 && sel1 !== sel2;

  const { data: compareData, isLoading: compareLoading, error } = useQuery<CompareResponse>({
    queryKey: ["document-templates", "compare", sel1, sel2],
    queryFn: async () => {
      const r = await fetch(
        `/api/document-templates/compare?id1=${encodeURIComponent(sel1)}&id2=${encodeURIComponent(sel2)}`
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to compare templates.");
      }
      return (await r.json()) as CompareResponse;
    },
    enabled: canFetch,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[97vw] sm:max-w-6xl max-h-[94vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="size-5 text-primary flex-shrink-0" />
            <span>Compare Templates</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick two templates to see a line-by-line diff of their content,
            subject, and email fields.
          </DialogDescription>
        </DialogHeader>

        {/* Template pickers */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Template A
              </label>
              <Select
                value={sel1 || "NONE"}
                onValueChange={(v) => setSel1(v === "NONE" ? "" : v)}
              >
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder="Select template A">
                    {templates.find((t) => t.id === sel1)?.name ?? "Select template A"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={t.id === sel2}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {t.code}
                        </Badge>
                        <span>{t.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          v{t.version}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:flex items-center justify-center pb-2">
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Template B
              </label>
              <Select
                value={sel2 || "NONE"}
                onValueChange={(v) => setSel2(v === "NONE" ? "" : v)}
              >
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder="Select template B">
                    {templates.find((t) => t.id === sel2)?.name ?? "Select template B"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={t.id === sel1}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {t.code}
                        </Badge>
                        <span>{t.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          v{t.version}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Body — diff content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {templatesLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="size-5 mr-2 animate-spin" />
                Loading templates…
              </div>
            )}

            {!templatesLoading && !canFetch && (
              <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                <GitCompareArrows className="size-10 mb-3 opacity-40" />
                <div className="font-medium">Select two different templates</div>
                <div className="text-xs mt-1">
                  Pick a Template A and Template B above to see what changed.
                </div>
              </div>
            )}

            {canFetch && compareLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="size-5 mr-2 animate-spin" />
                Computing diff…
              </div>
            )}

            {canFetch && !compareLoading && error && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300">
                {(error as Error)?.message || "Failed to load diff."}
              </div>
            )}

            {canFetch && !compareLoading && compareData && (
              <CompareView data={compareData} />
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// CompareView — renders the actual diff
// =============================================================

function CompareView({ data }: { data: CompareResponse }) {
  const { template1, template2, stats } = data;

  return (
    <div className="space-y-5">
      {/* Header strip: template metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TemplateMetaCard template={template1} side="A" />
        <TemplateMetaCard template={template2} side="B" />
      </div>

      {/* Statistics bar */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-medium text-sm mr-2">Content diff:</span>
        <StatPill kind="added" count={stats.content.added} />
        <StatPill kind="removed" count={stats.content.removed} />
        <StatPill kind="unchanged" count={stats.content.unchanged} />
        <span className="text-muted-foreground hidden sm:inline">
          ({stats.content.added + stats.content.removed + stats.content.unchanged} lines total)
        </span>
        {stats.emailBody.added + stats.emailBody.removed > 0 && (
          <span className="text-muted-foreground ml-auto">
            Email body: <span className="text-primary dark:text-emerald-400 font-medium">+{stats.emailBody.added}</span>{" "}
            <span className="text-rose-700 dark:text-rose-400 font-medium">-{stats.emailBody.removed}</span>
          </span>
        )}
      </div>

      {/* Inline field diffs for subject / emailSubject */}
      {(template1.subject || template2.subject) && (
        <FieldDiffRow
          label="Subject"
          diff={data.subjectDiff}
          stats={stats.subject}
        />
      )}
      {(template1.emailSubject || template2.emailSubject) && (
        <FieldDiffRow
          label="Email Subject"
          diff={data.emailSubjectDiff}
          stats={stats.emailSubject}
        />
      )}

      {/* Side-by-side content diff */}
      <div>
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <span>Content</span>
          <Badge variant="outline" className="text-[10px] font-normal">
            side-by-side
          </Badge>
        </div>
        <SideBySideDiff diff={data.contentDiff} />
      </div>

      {/* Email body diff (only if either side has one) */}
      {(template1.emailBody || template2.emailBody) && (
        <div>
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <span>Email Body</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              side-by-side
            </Badge>
          </div>
          <SideBySideDiff diff={data.emailBodyDiff} />
        </div>
      )}
    </div>
  );
}

function TemplateMetaCard({
  template,
  side,
}: {
  template: TemplateSummary;
  side: "A" | "B";
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-1">
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px]",
            side === "A"
              ? "border-rose-300 text-rose-700 dark:text-rose-400 dark:border-rose-800"
              : "border-emerald-300 text-primary dark:text-emerald-400 dark:border-emerald-800"
          )}
        >
          {side === "A" ? "Template A" : "Template B"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          Updated {formatDate(template.updatedAt, "datetime")}
        </span>
      </div>
      <div className="font-semibold truncate">{template.name}</div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="font-mono text-[10px]">
          {template.code}
        </Badge>
        <span>{template.type?.replace(/_/g, " ")}</span>
        <span>·</span>
        <span>v{template.version}</span>
        <span>·</span>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px]",
            template.status === "ACTIVE"
              ? "text-emerald-500/15 text-primary dark:text-primary/80"
              : template.status === "DRAFT"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
          )}
        >
          {template.status}
        </span>
      </div>
    </div>
  );
}

function StatPill({
  kind,
  count,
}: {
  kind: "added" | "removed" | "unchanged";
  count: number;
}) {
  const config = {
    added: {
      icon: Plus,
      label: "added",
      cls: "text-emerald-500/15 text-primary dark:text-primary/80",
    },
    removed: {
      icon: Minus,
      label: "removed",
      cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    },
    unchanged: {
      icon: Equal,
      label: "unchanged",
      cls: "bg-muted text-muted-foreground",
    },
  }[kind];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
        config.cls
      )}
    >
      <Icon className="size-3" />
      <span>{count}</span>
      <span className="opacity-70">{config.label}</span>
    </span>
  );
}

// =============================================================
// SideBySideDiff — split a single LCS diff into two columns.
// Left column shows template A content (unchanged + removed).
// Right column shows template B content (unchanged + added).
// Unchanged rows are aligned across both columns; removed-only
// rows have an empty right cell, added-only rows have an empty
// left cell. This produces a GitHub-style side-by-side diff.
// =============================================================

interface DiffRow {
  left?: LineDiffEntry; // present in template A (unchanged or removed)
  right?: LineDiffEntry; // present in template B (unchanged or added)
}

function buildRows(diff: LineDiffEntry[]): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const entry of diff) {
    if (entry.type === "unchanged") {
      rows.push({ left: entry, right: entry });
    } else if (entry.type === "removed") {
      rows.push({ left: entry });
    } else {
      // added
      rows.push({ right: entry });
    }
  }
  return rows;
}

function SideBySideDiff({ diff }: { diff: LineDiffEntry[] }) {
  const rows = useMemo(() => buildRows(diff), [diff]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
        Both sides are empty.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-2 border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="px-3 py-1.5 border-r border-border flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500/70" />
          Template A
        </div>
        <div className="px-3 py-1.5 flex items-center gap-1.5">
          <span className="size-2 rounded-full text-emerald-500/70" />
          Template B
        </div>
      </div>
      <div className="max-h-[55vh] overflow-auto font-mono text-[11.5px] leading-relaxed">
        {rows.map((row, idx) => {
          const leftCls = row.left
            ? row.left.type === "removed"
              ? "bg-rose-500/10 text-rose-900 dark:text-rose-200"
              : "bg-transparent"
            : "bg-muted/30";
          const rightCls = row.right
            ? row.right.type === "added"
              ? "text-emerald-500/10 text-emerald-900 dark:text-muted-foreground"
              : "bg-transparent"
            : "bg-muted/30";
          const leftMark = row.left
            ? row.left.type === "removed"
              ? "-"
              : " "
            : " ";
          const rightMark = row.right
            ? row.right.type === "added"
              ? "+"
              : " "
            : " ";
          return (
            <div
              key={idx}
              className="grid grid-cols-2 border-b border-border/40 last:border-b-0"
            >
              <div
                className={cn(
                  "px-2 py-0.5 border-r border-border/40 whitespace-pre-wrap break-words",
                  leftCls
                )}
              >
                <span className="select-none text-muted-foreground/60 mr-1">
                  {leftMark}
                </span>
                {row.left?.line ?? ""}
              </div>
              <div
                className={cn(
                  "px-2 py-0.5 whitespace-pre-wrap break-words",
                  rightCls
                )}
              >
                <span className="select-none text-muted-foreground/60 mr-1">
                  {rightMark}
                </span>
                {row.right?.line ?? ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// FieldDiffRow — inline token-level diff for short fields.
// =============================================================

function FieldDiffRow({
  label,
  diff,
  stats,
}: {
  label: string;
  diff: FieldDiffEntry[];
  stats: { added: number; removed: number; unchanged: number };
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {stats.added > 0 && (
            <span className="text-primary dark:text-emerald-400">
              +{stats.added}
            </span>
          )}
          {stats.removed > 0 && (
            <span className="text-rose-700 dark:text-rose-400">
              -{stats.removed}
            </span>
          )}
          {stats.added + stats.removed === 0 && (
            <span className="text-muted-foreground">identical</span>
          )}
        </div>
      </div>
      <div className="text-sm leading-relaxed flex flex-wrap">
        {diff.length === 0 && (
          <span className="text-muted-foreground italic">— empty —</span>
        )}
        {diff.map((entry, idx) => (
          <span
            key={idx}
            className={cn(
              entry.type === "added" &&
                "text-emerald-500/15 text-emerald-900 dark:text-muted-foreground rounded px-0.5",
              entry.type === "removed" &&
                "bg-rose-500/15 text-rose-900 dark:text-rose-200 line-through rounded px-0.5",
              entry.type === "unchanged" && "text-foreground"
            )}
          >
            {entry.text}
          </span>
        ))}
      </div>
    </div>
  );
}
