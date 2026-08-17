"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  Plus,
  Search,
  MoreVertical,
  Check,
  X,
  Eye,
  Pencil,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  List as ListIcon,
  Scale,
} from "lucide-react";
import { formatDate, relativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LeaveEntryDialog } from "./leave-entry-dialog";
import { ExportButton } from "../shared/export-button";
import { LeaveBalances } from "./leave-balances";

type View = "list" | "calendar" | "balances";

type LeaveCalendarItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  leaveTypeName: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
};

export function LeaveModule() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(
    "ALL"
  );
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<{ id: string } | null>(null);
  const [viewRecord, setViewRecord] = useState<any | null>(null);
  const [decision, setDecision] = useState<
    { id: string; action: "APPROVED" | "REJECTED" } | null
  >(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dayDialog, setDayDialog] = useState<{
    date: string;
    items: LeaveCalendarItem[];
  } | null>(null);

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => fetch("/api/leave-types").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["leave", tab, leaveTypeId, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "ALL") params.set("status", tab);
      if (leaveTypeId) params.set("leaveTypeId", leaveTypeId);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/leave?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  // Calendar data — only fetched when calendar view is active
  const { data: calData, isLoading: calLoading } = useQuery({
    queryKey: ["leave-calendar", calMonth],
    queryFn: async () => {
      const r = await fetch(`/api/leave/calendar?month=${calMonth}`);
      return r.json();
    },
    enabled: view === "calendar",
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // KPIs computed from current page items (good enough for MVP)
  const allForKpi = items;
  const pendingCount = allForKpi.filter((l: any) => l.status === "PENDING").length;
  const approvedCount = allForKpi.filter((l: any) => l.status === "APPROVED").length;
  const rejectedCount = allForKpi.filter((l: any) => l.status === "REJECTED").length;

  // Calendar grid math — memoised per month.
  const calItems: LeaveCalendarItem[] = calData?.items ?? [];
  const { weeks, monthLabel, isCurrentMonth } = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const days = buildCalendarDays(y, m - 1);
    // Group into weeks of 7
    const w: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const now = new Date();
    const cur =
      y === now.getFullYear() && m - 1 === now.getMonth();
    return { weeks: w, monthLabel: label, isCurrentMonth: cur };
  }, [calMonth]);

  function addNew() {
    setEditRecord(null);
    setEntryOpen(true);
  }

  function editFn(id: string) {
    setEditRecord({ id });
    setEntryOpen(true);
  }

  async function deleteFn(id: string) {
    if (!confirm("Delete this leave request?")) return;
    try {
      const r = await fetch(`/api/leave/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      toast.success("Leave request deleted.");
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["leave-calendar"] });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  async function submitDecision() {
    if (!decision) return;
    setDeciding(true);
    try {
      const r = await fetch(`/api/leave/${decision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision.action,
          approverNote: decisionNote || null,
          approverId: "hr-user",
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      toast.success(
        decision.action === "APPROVED"
          ? "Leave request approved."
          : "Leave request rejected."
      );
      setDecision(null);
      setDecisionNote("");
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["leave-calendar"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setDeciding(false);
    }
  }

  function shiftMonth(delta: number) {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  function goToday() {
    const now = new Date();
    setCalMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Apply, approve, and track employee leave requests"
        icon={<CalendarDays className="size-5" />}
        actions={
          <>
            <ExportButton
              module="leave"
              filters={{
                search,
                status: tab !== "ALL" ? tab : "",
                leaveTypeId,
              }}
            />
            <Button size="sm" onClick={addNew}>
              <Plus className="size-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Add Leave</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Requests"
          value={total}
          icon={CalendarDays}
          iconClass="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconClass="bg-amber-500/10 text-amber-600"
        />
        <KpiCard
          label="Approved"
          value={approvedCount}
          icon={Check}
          iconClass="text-emerald-500/10 text-primary"
        />
        <KpiCard
          label="Rejected"
          value={rejectedCount}
          icon={X}
          iconClass="bg-rose-500/10 text-rose-600"
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5">
          <Button
            size="sm"
            variant={view === "list" ? "default" : "ghost"}
            className={cn(
              "h-7 rounded-sm gap-1.5",
              view === "list"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("list")}
          >
            <ListIcon className="size-3.5" />
            <span>List View</span>
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "default" : "ghost"}
            className={cn(
              "h-7 rounded-sm gap-1.5",
              view === "calendar"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="size-3.5" />
            <span>Calendar View</span>
          </Button>
          <Button
            size="sm"
            variant={view === "balances" ? "default" : "ghost"}
            className={cn(
              "h-7 rounded-sm gap-1.5",
              view === "balances"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("balances")}
          >
            <Scale className="size-3.5" />
            <span>Balances View</span>
          </Button>
        </div>

        {view === "calendar" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0"
                onClick={() => shiftMonth(-1)}
                title="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-[140px] sm:min-w-[160px] text-center text-sm font-semibold">
                {monthLabel}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0"
                onClick={() => shiftMonth(1)}
                title="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={goToday}
              disabled={isCurrentMonth}
            >
              Today
            </Button>
          </div>
        )}
      </div>

      {/* BALANCES VIEW */}
      {view === "balances" && <LeaveBalances />}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as any);
              setPage(1);
            }}
          >
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="flex w-max">
                <TabsTrigger value="ALL">All Requests</TabsTrigger>
                <TabsTrigger value="PENDING">Pending Approval</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Select
              value={leaveTypeId || "ALL"}
              onValueChange={(v) => {
                setLeaveTypeId(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-48">
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{items.length}</span>{" "}
            of <span className="font-medium text-foreground">{total}</span>{" "}
            requests
          </div>

          {/* Loading */}
          {isLoading && (
            <Card className="border-border/60 shadow-soft p-4">
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-md bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Empty */}
          {!isLoading && items.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              description={
                leaveTypeId || search || tab !== "ALL"
                  ? "No requests match the current filters."
                  : "Add the first leave request to get started."
              }
              actionLabel="Add Leave"
              onAction={addNew}
            />
          )}

          {/* Table */}
          {!isLoading && items.length > 0 && (
            <Card className="border-border/60 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="min-w-[180px]">Employee</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Leave Type
                      </TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead className="hidden sm:table-cell">End</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead className="min-w-[180px] hidden lg:table-cell">
                        Reason
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Applied
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((l: any) => (
                      <TableRow key={l.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarBadge
                              name={l.employee?.fullName}
                              photo={l.employee?.photo}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {l.employee?.fullName}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {l.employee?.employeeId}
                              </div>
                              <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{
                                    background:
                                      l.leaveType?.color ?? "#94a3b8",
                                  }}
                                />
                                {l.leaveType?.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                background:
                                  l.leaveType?.color ?? "#94a3b8",
                              }}
                            />
                            <span className="text-xs">{l.leaveType?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(l.startDate)}
                        </TableCell>
                        <TableCell className="text-xs hidden sm:table-cell">
                          {formatDate(l.endDate)}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums font-medium">
                          {l.days}d
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate hidden lg:table-cell">
                          {l.reason}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {relativeTime(l.appliedAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={l.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {l.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="size-8 text-primary hover:text-primary hover:text-emerald-500/10"
                                  onClick={() => {
                                    setDecision({ id: l.id, action: "APPROVED" });
                                    setDecisionNote(l.approverNote || "");
                                  }}
                                  title="Approve"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                  onClick={() => {
                                    setDecision({ id: l.id, action: "REJECTED" });
                                    setDecisionNote(l.approverNote || "");
                                  }}
                                  title="Reject"
                                >
                                  <X className="size-4" />
                                </Button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                >
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setViewRecord(l)}
                                >
                                  <Eye className="size-4 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => editFn(l.id)}>
                                  <Pencil className="size-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-rose-600"
                                  onClick={() => deleteFn(l.id)}
                                >
                                  <Trash2 className="size-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* CALENDAR VIEW */}
      {view === "calendar" && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full text-emerald-500" />
              Approved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: "#f59e0b",
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 2px, transparent 2px 4px)",
                }}
              />
              Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-muted-foreground/15" />
              Weekend
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full ring-2 ring-primary ring-offset-1 ring-offset-background" />
              Today
            </span>
          </div>

          <Card className="border-border/60 shadow-soft p-3 sm:p-4">
            {calLoading ? (
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-6" />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 sm:h-24" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => (
                      <div
                        key={d}
                        className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1"
                      >
                        <span className="hidden sm:inline">{d}</span>
                        <span className="sm:hidden">
                          {d.slice(0, 1)}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* Day grid */}
                <div className="space-y-1 sm:space-y-1.5">
                  {weeks.map((week, wi) => (
                    <div
                      key={wi}
                      className="grid grid-cols-7 gap-1 sm:gap-1.5"
                    >
                      {week.map((day) => {
                        const inMonth =
                          day.getMonth() ===
                          parseInt(calMonth.split("-")[1], 10) - 1;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const today = new Date();
                        const isToday =
                          day.getFullYear() === today.getFullYear() &&
                          day.getMonth() === today.getMonth() &&
                          day.getDate() === today.getDate();
                        const dayLeaves = leavesOnDay(calItems, day);

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() =>
                              dayLeaves.length > 0 &&
                              setDayDialog({
                                date: localDateKey(day),
                                items: dayLeaves,
                              })
                            }
                            className={cn(
                              "relative text-left rounded-md border min-h-[64px] sm:min-h-[92px] p-1 sm:p-1.5 transition-colors",
                              "flex flex-col gap-1",
                              inMonth
                                ? "bg-card border-border/60"
                                : "bg-muted/20 border-border/30 text-muted-foreground/70",
                              isWeekend && inMonth && "bg-muted/30",
                              isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                              dayLeaves.length > 0
                                ? "hover:border-primary/40 hover:bg-accent/40 cursor-pointer"
                                : "cursor-default"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-[10px] sm:text-xs font-medium tabular-nums",
                                  !inMonth && "text-muted-foreground/60",
                                  isToday && "text-primary font-bold"
                                )}
                              >
                                {day.getDate()}
                              </span>
                              {dayLeaves.length > 0 && (
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground tabular-nums">
                                  {dayLeaves.length}
                                </span>
                              )}
                            </div>

                            {/* Dots */}
                            {dayLeaves.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-auto">
                                {dayLeaves.slice(0, 3).map((l) => (
                                  <span
                                    key={l.id}
                                    className="size-1.5 sm:size-2 rounded-full"
                                    style={
                                      l.status === "PENDING"
                                        ? {
                                            backgroundColor: l.leaveTypeColor,
                                            backgroundImage:
                                              "repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 2px, transparent 2px 4px)",
                                          }
                                        : { backgroundColor: l.leaveTypeColor }
                                    }
                                    title={`${l.employeeName} — ${l.leaveTypeName}`}
                                  />
                                ))}
                                {dayLeaves.length > 3 && (
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground leading-none self-center">
                                    +{dayLeaves.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}

      <LeaveEntryDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) setEditRecord(null);
        }}
        record={editRecord}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["leave"] });
          qc.invalidateQueries({ queryKey: ["leave-calendar"] });
        }}
      />

      {/* View dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Submitted {viewRecord ? relativeTime(viewRecord.appliedAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <AvatarBadge
                  name={viewRecord.employee?.fullName}
                  photo={viewRecord.employee?.photo}
                  size="md"
                />
                <div>
                  <div className="font-medium">
                    {viewRecord.employee?.fullName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {viewRecord.employee?.employeeId}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Leave Type" value={viewRecord.leaveType?.name} />
                <Detail label="Status" value={<StatusBadge status={viewRecord.status} />} />
                <Detail label="Start Date" value={formatDate(viewRecord.startDate, "long")} />
                <Detail label="End Date" value={formatDate(viewRecord.endDate, "long")} />
                <Detail label="Days" value={`${viewRecord.days} day(s)`} />
                <Detail
                  label="Decided At"
                  value={viewRecord.decidedAt ? formatDate(viewRecord.decidedAt) : "—"}
                />
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Reason
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  {viewRecord.reason || "—"}
                </div>
              </div>
              {viewRecord.approverNote && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Approver Note
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    {viewRecord.approverNote}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day dialog (calendar view) */}
      <Dialog
        open={!!dayDialog}
        onOpenChange={(o) => !o && setDayDialog(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave on {dayDialog ? formatDate(dayDialog.date, "long") : ""}</DialogTitle>
            <DialogDescription>
              {dayDialog?.items.length ?? 0} employee
              {(dayDialog?.items.length ?? 0) === 1 ? "" : "s"} on leave this day
            </DialogDescription>
          </DialogHeader>
          {dayDialog && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {dayDialog.items.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 rounded-md border border-border/60 bg-card p-2.5"
                >
                  <AvatarBadge
                    name={l.employeeName}
                    photo={l.employeePhoto}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate text-sm">
                        {l.employeeName}
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: l.leaveTypeColor,
                          ...(l.status === "PENDING"
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 2px, transparent 2px 4px)",
                              }
                            : {}),
                        }}
                      />
                      {l.leaveTypeName}
                      <span className="text-muted-foreground/60">·</span>
                      <span>
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="tabular-nums">{l.days}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decision dialog */}
      <Dialog
        open={!!decision}
        onOpenChange={(o) => {
          if (!o) {
            setDecision(null);
            setDecisionNote("");
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "APPROVED" ? "Approve Leave" : "Reject Leave"}
            </DialogTitle>
            <DialogDescription>
              Add an optional note that the employee will see.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Approver Note
              </Label>
              <Textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  decision?.action === "APPROVED"
                    ? "Approved - coverage arranged."
                    : "Rejected - peak period."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDecision(null);
                setDecisionNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitDecision}
              disabled={deciding}
              variant={
                decision?.action === "APPROVED" ? "default" : "destructive"
              }
            >
              Confirm{" "}
              {decision?.action === "APPROVED" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

// ----- Calendar helpers -----

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildCalendarDays(year: number, monthIdx: number): Date[] {
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);
  // Monday-indexed day-of-week (Mon=0 ... Sun=6)
  const startOffset = (first.getDay() + 6) % 7;
  const endDay = (last.getDay() + 6) % 7;
  const endOffset = (7 - endDay - 1) % 7;

  const start = new Date(first);
  start.setDate(start.getDate() - startOffset);
  const end = new Date(last);
  end.setDate(end.getDate() + endOffset);

  const days: Date[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function leavesOnDay(items: LeaveCalendarItem[], date: Date): LeaveCalendarItem[] {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
  const dayEnd = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
  return items.filter((l) => {
    const s = new Date(l.startDate);
    const e = new Date(l.endDate);
    return s <= dayEnd && e >= dayStart;
  });
}
