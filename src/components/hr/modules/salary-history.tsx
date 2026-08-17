"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingUp,
  Wallet,
  CalendarDays,
  Percent,
  History,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { EmptyState } from "../shared/empty-state";

interface RevisionItem {
  id: string;
  employeeId: string;
  oldBasicSalary: number;
  newBasicSalary: number;
  oldAllowances: number;
  newAllowances: number;
  oldDeductions: number;
  newDeductions: number;
  oldTax: number;
  newTax: number;
  oldNetSalary: number;
  newNetSalary: number;
  reason: string | null;
  changedBy: string | null;
  changedAt: string;
}

function computePctChange(oldV: number, newV: number): number {
  if (!oldV) return 0;
  return ((newV - oldV) / oldV) * 100;
}

export function SalaryHistory({
  employeeId,
  currentNetSalary,
  joiningDate,
}: {
  employeeId: string;
  currentNetSalary: number;
  joiningDate?: string | null;
}) {
  const { data, isLoading } = useQuery<{ items: RevisionItem[]; total: number }>({
    queryKey: ["salary-revisions", employeeId],
    queryFn: () =>
      fetch(`/api/salary-revisions?employeeId=${employeeId}`).then((r) => r.json()),
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="size-4 text-primary" /> Salary Revision History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const revisions = data?.items ?? [];

  // Summary calculations.
  // totalIncrease = current net - earliest known net (or 0 if no history).
  // avgAnnualIncrease = compound rate from first revision date to today.
  const earliest = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const totalIncrease = earliest
    ? currentNetSalary - earliest.oldNetSalary
    : 0;

  let avgAnnualPct = 0;
  if (earliest && earliest.oldNetSalary > 0 && joiningDate) {
    const start = new Date(joiningDate);
    const now = new Date();
    const years =
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years > 0 && currentNetSalary > 0 && earliest.oldNetSalary > 0) {
      const ratio = currentNetSalary / earliest.oldNetSalary;
      avgAnnualPct = (Math.pow(ratio, 1 / years) - 1) * 100;
    }
  } else if (revisions.length > 0 && currentNetSalary > 0 && earliest) {
    // Fall back to simple average per revision if no joining date.
    const first = revisions[revisions.length - 1];
    const last = revisions[0];
    const daysDiff =
      (new Date(last.changedAt).getTime() -
        new Date(first.changedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    if (years > 0 && first.oldNetSalary > 0) {
      const ratio = last.newNetSalary / first.oldNetSalary;
      avgAnnualPct = (Math.pow(ratio, 1 / years) - 1) * 100;
    }
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4 text-primary" /> Salary Revision History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryTile
            icon={Wallet}
            label="Current Net Salary"
            value={formatCurrency(currentNetSalary)}
            tone="emerald"
          />
          <SummaryTile
            icon={TrendingUp}
            label="Total Increase"
            value={`${totalIncrease >= 0 ? "+" : ""}${formatCurrency(Math.abs(totalIncrease))}`}
            tone={totalIncrease >= 0 ? "emerald" : "rose"}
          />
          <SummaryTile
            icon={Percent}
            label="Avg Annual Increase"
            value={
              isFinite(avgAnnualPct) && avgAnnualPct !== 0
                ? `${avgAnnualPct >= 0 ? "+" : ""}${avgAnnualPct.toFixed(1)}%`
                : "—"
            }
            tone={avgAnnualPct >= 0 ? "emerald" : "rose"}
          />
        </div>

        {/* Timeline */}
        {revisions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No salary revisions yet"
            description="When this employee's salary is edited, each change will be tracked here as a revision entry."
          />
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div
              className="absolute left-2 top-1 bottom-1 w-px bg-border"
              aria-hidden
            />
            <ol className="space-y-5">
              {revisions.map((rev) => {
                const delta = rev.newNetSalary - rev.oldNetSalary;
                const pct = computePctChange(rev.oldNetSalary, rev.newNetSalary);
                const isUp = delta > 0;
                const isDown = delta < 0;
                const isFlat = delta === 0;
                const nodeIcon = isUp ? (
                  <ArrowUpRight className="size-3.5" />
                ) : isDown ? (
                  <ArrowDownRight className="size-3.5" />
                ) : (
                  <Minus className="size-3.5" />
                );
                const nodeTone = isUp
                  ? "text-emerald-500 text-white"
                  : isDown
                    ? "bg-rose-500 text-white"
                    : "bg-muted-foreground text-white";
                const deltaTone = isUp
                  ? "text-primary dark:text-emerald-400"
                  : isDown
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground";

                return (
                  <li key={rev.id} className="relative">
                    {/* Node */}
                    <div
                      className={cn(
                        "absolute -left-[1.40rem] top-0.5 size-4 rounded-full flex items-center justify-center ring-2 ring-background",
                        nodeTone
                      )}
                    >
                      {nodeIcon}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            {formatDate(rev.changedAt, "datetime")}
                            {rev.changedBy && (
                              <>
                                <span aria-hidden>·</span>
                                <span>by {rev.changedBy}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-mono tabular-nums text-muted-foreground">
                              {formatCurrency(rev.oldNetSalary)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-base font-bold tabular-nums">
                              {formatCurrency(rev.newNetSalary)}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-muted",
                                deltaTone
                              )}
                            >
                              {isUp ? "+" : isDown ? "−" : ""}
                              {formatCurrency(Math.abs(delta))}
                              <span className="opacity-70">
                                ({pct >= 0 ? "+" : ""}
                                {pct.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          {/* Breakdown if individual components changed */}
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <BreakdownCell
                              label="Basic"
                              oldV={rev.oldBasicSalary}
                              newV={rev.newBasicSalary}
                            />
                            <BreakdownCell
                              label="Allow."
                              oldV={rev.oldAllowances}
                              newV={rev.newAllowances}
                            />
                            <BreakdownCell
                              label="Deduct."
                              oldV={rev.oldDeductions}
                              newV={rev.newDeductions}
                            />
                            <BreakdownCell
                              label="Tax"
                              oldV={rev.oldTax}
                              newV={rev.newTax}
                            />
                          </div>
                        </div>
                      </div>
                      {rev.reason && (
                        <div className="mt-2 pt-2 border-t border-border/60 text-sm text-foreground/80 italic">
                          “{rev.reason}”
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownCell({
  label,
  oldV,
  newV,
}: {
  label: string;
  oldV: number;
  newV: number;
}) {
  const changed = oldV !== newV;
  return (
    <div className="flex items-center gap-1">
      <span className="opacity-70">{label}:</span>
      <span className={cn("tabular-nums", changed && "font-medium text-foreground")}>
        {formatCurrency(newV)}
      </span>
      {changed && (
        <span
          className={cn(
            "text-[10px]",
            newV > oldV
              ? "text-primary dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {newV > oldV ? "↑" : "↓"}
          {formatCurrency(Math.abs(newV - oldV))}
        </span>
      )}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "emerald" | "rose";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-500/10 text-primary dark:text-primary/80",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center gap-3">
      <div
        className={cn(
          "size-9 rounded-lg flex items-center justify-center flex-shrink-0",
          tones[tone]
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-base font-semibold tabular-nums truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
