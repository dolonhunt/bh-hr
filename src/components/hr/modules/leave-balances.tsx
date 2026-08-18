"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  Search,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeaveBalanceItem = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeePhoto: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
};

/**
 * Leave Balances view — shows every employee × leave-type combination with
 * allocated / used / pending / remaining days and a usage bar. Renders KPI
 * cards summarising the totals and the lowest balance.
 */
export function LeaveBalances() {
  const [search, setSearch] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => fetch("/api/leave-types").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => fetch("/api/leave/balances").then((r) => r.json()),
  });

  const allItems: LeaveBalanceItem[] = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((it) => {
      if (leaveTypeId && it.leaveTypeId !== leaveTypeId) return false;
      if (!q) return true;
      return (
        it.employeeName.toLowerCase().includes(q) ||
        it.employeeCode.toLowerCase().includes(q)
      );
    });
  }, [allItems, search, leaveTypeId]);

  // Summary KPIs across the (filtered) data set.
  const totals = useMemo(() => {
    let allocated = 0;
    let used = 0;
    let remaining = 0;
    for (const it of filtered) {
      allocated += it.allocated;
      used += it.used;
      remaining += it.remaining;
    }
    return {
      allocated: round2(allocated),
      used: round2(used),
      remaining: round2(remaining),
    };
  }, [filtered]);

  // Lowest balance — only consider rows where allocated > 0 (otherwise
  // zero-allocated types like "Unpaid" would always win).
  const lowest = useMemo(() => {
    const candidates = filtered.filter((it) => it.allocated > 0);
    if (candidates.length === 0) return null;
    let best = candidates[0];
    for (const it of candidates) {
      if (it.remaining < best.remaining) best = it;
    }
    return best;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Allocated"
          value={`${totals.allocated}d`}
          icon={Scale}
          iconClass="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Total Used"
          value={`${totals.used}d`}
          icon={CheckCircle2}
          iconClass="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Total Remaining"
          value={`${totals.remaining}d`}
          icon={PieChart}
          iconClass="bg-teal-500/10 text-teal-600"
        />
        <KpiCard
          label="Lowest Balance"
          value={lowest ? `${lowest.remaining}d` : "—"}
          icon={TrendingDown}
          iconClass="bg-rose-500/10 text-rose-600"
          footer={
            lowest ? (
              <span className="text-muted-foreground">
                {lowest.employeeName} · {lowest.leaveTypeName}
              </span>
            ) : (
              <span className="text-muted-foreground">No data</span>
            )
          }
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Select
          value={leaveTypeId || "ALL"}
          onValueChange={(v) => setLeaveTypeId(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-52">
            <SelectValue placeholder="All leave types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All leave types</SelectItem>
            {(leaveTypes?.items ?? []).map((lt: any) => (
              <SelectItem key={lt.id} value={lt.id}>
                {lt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search employee name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{filtered.length}</span>{" "}
        balance {filtered.length === 1 ? "row" : "rows"}
      </div>

      {/* Loading */}
      {isLoading && (
        <Card className="border-border/30 shadow-soft p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Scale}
          title="No leave balances"
          description={
            search || leaveTypeId
              ? "No balances match the current filters."
              : "Leave balances will appear here once employees and leave types are set up."
          }
        />
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <Card className="border-border/30 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[200px]">Employee</TableHead>
                  <TableHead className="min-w-[150px]">Leave Type</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="min-w-[180px]">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it, idx) => {
                  const pct =
                    it.allocated > 0
                      ? Math.min(
                          100,
                          Math.round((it.used / it.allocated) * 100)
                        )
                      : 0;
                  const remainingPct =
                    it.allocated > 0
                      ? it.remaining / it.allocated
                      : 0;
                  const remainingColor =
                    it.allocated === 0
                      ? "text-muted-foreground"
                      : remainingPct > 0.5
                        ? "text-primary"
                        : remainingPct >= 0.2
                          ? "text-amber-600"
                          : "text-rose-600";
                  return (
                    <TableRow key={`${it.employeeId}|${it.leaveTypeId}|${idx}`} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarBadge
                            name={it.employeeName}
                            photo={it.employeePhoto}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {it.employeeName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {it.employeeCode}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: it.leaveTypeColor }}
                          />
                          <span className="text-sm">{it.leaveTypeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {it.allocated}d
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {it.used}d
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {it.pending > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {it.pending}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0d</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className={cn("font-semibold", remainingColor)}>
                          {it.remaining}d
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={pct}
                            className={cn(
                              "h-2 flex-1",
                              pct >= 80
                                ? "[&>[data-slot=progress-indicator]]:bg-rose-500"
                                : pct >= 50
                                  ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
                                  : "[&>[data-slot=progress-indicator]]:bg-primary"
                            )}
                          />
                          <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Legend */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">Remaining:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            &gt; 50%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            20% – 50%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500" />
            &lt; 20%
          </span>
          <span className="inline-flex items-center gap-1.5 ml-auto">
            <AlertTriangle className="size-3.5 text-amber-500" />
            Pending days are deducted from the remaining balance.
          </span>
        </div>
      )}
    </div>
  );
}

function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
