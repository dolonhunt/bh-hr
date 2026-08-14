"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Calendar,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  Loader2,
  ChevronsUpDown,
  Check as CheckIcon,
  Download,
  AlertTriangle,
  Timer,
  PlayCircle,
  StopCircle,
  Briefcase,
  User,
  BarChart3,
  CalendarDays,
  History,
  CircleCheck,
  Search,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, formatDate, downloadBlob } from "@/lib/utils";

// =========================================================
// Constants & types
// =========================================================

type TimesheetStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

const STATUS_COLOR: Record<TimesheetStatus, string> = {
  DRAFT: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  SUBMITTED: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const PROJECT_BAR_COLORS = [
  "#10b981",
  "#14b8a6",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#0ea5e9",
  "#84cc16",
  "#f97316",
];

interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  projectId: string | null;
  projectName: string | null;
  task: string;
  date: string;
  hours: number;
  description: string | null;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  fullName: string;
  photo?: string | null;
  department?: { name: string; color?: string | null } | null;
  designation?: { name: string } | null;
}

interface SummaryResponse {
  totalHours: number;
  entryCount: number;
  distinctDays: number;
  avgHoursPerDay: number;
  byProject: { projectName: string; hours: number; entries: number }[];
  byEmployee: {
    employeeId: string;
    employeeName: string;
    photo: string | null;
    hours: number;
    entries: number;
  }[];
  dailyTotals: { date: string; hours: number; entries: number }[];
}

// =========================================================
// Hooks
// =========================================================

function useTimesheets(filters: {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ["timesheets", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.search) params.set("search", filters.search);
      if (filters.employeeId)
        params.set("employeeId", filters.employeeId);
      const r = await fetch(`/api/timesheets?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load timesheets");
      return r.json();
    },
  });
}

function useEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const r = await fetch(`/api/employees?pageSize=500`);
      return r.json();
    },
    enabled,
  });
}

function useSummary(from: string, to: string, employeeId: string) {
  return useQuery({
    queryKey: ["timesheets", "summary", { from, to, employeeId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (employeeId) params.set("employeeId", employeeId);
      const r = await fetch(`/api/timesheets/summary?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load summary");
      return r.json() as Promise<SummaryResponse>;
    },
  });
}

// =========================================================
// Clock in/out state (persisted to localStorage)
// =========================================================

interface ClockState {
  employeeId: string;
  startedAt: string;
}

const CLOCK_KEY = "teamhub-clock-state";

function readClock(): ClockState | null {
  try {
    const v = localStorage.getItem(CLOCK_KEY);
    return v ? (JSON.parse(v) as ClockState) : null;
  } catch {
    return null;
  }
}

function writeClock(c: ClockState | null) {
  try {
    if (c) localStorage.setItem(CLOCK_KEY, JSON.stringify(c));
    else localStorage.removeItem(CLOCK_KEY);
  } catch {
    /* noop */
  }
}

// =========================================================
// Main module
// =========================================================

export function TimesheetsModule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"entries" | "pending" | "summary">("entries");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Timesheet | null>(null);
  const [rejectEntry, setRejectEntry] = useState<Timesheet | null>(null);
  const [viewEntry, setViewEntry] = useState<Timesheet | null>(null);

  // Load all entries for the entries tab and pending tab. We fetch
  // everything (no status filter) so the user can switch tabs without
  // re-fetching; we filter on the client.
  const { data, isLoading, isError } = useTimesheets({ search });
  const allEntries: Timesheet[] = data?.items ?? [];

  // KPIs - based on the current week (Mon-Sun).
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

  const weekEntries = allEntries.filter(
    (e) => new Date(e.date).getTime() >= weekStartMs
  );
  const totalHoursThisWeek = weekEntries.reduce((s, e) => s + e.hours, 0);
  const pendingApproval = allEntries.filter((e) => e.status === "SUBMITTED").length;
  const approvedHours = allEntries
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + e.hours, 0);
  // distinct days this week with entries
  const distinctDaysThisWeek = new Set(
    weekEntries.map((e) => new Date(e.date).toISOString().slice(0, 10))
  ).size;
  const avgHoursPerDay =
    distinctDaysThisWeek > 0
      ? Math.round((totalHoursThisWeek / distinctDaysThisWeek) * 100) / 100
      : 0;

  function openCreate() {
    setEditEntry(null);
    setFormOpen(true);
  }
  function openEdit(e: Timesheet) {
    setEditEntry(e);
    setFormOpen(true);
  }
  async function deleteEntry(e: Timesheet) {
    if (!confirm(`Delete this timesheet entry (${e.hours}h on ${e.task})?`))
      return;
    try {
      const r = await fetch(`/api/timesheets/${e.id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete entry");
      }
      toast.success("Entry deleted.");
      qc.invalidateQueries({ queryKey: ["timesheets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entry.");
    }
  }
  async function submitEntry(e: Timesheet) {
    try {
      const r = await fetch(`/api/timesheets/${e.id}/submit`, {
        method: "POST",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to submit entry");
      }
      toast.success("Entry submitted for approval.");
      qc.invalidateQueries({ queryKey: ["timesheets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit entry.");
    }
  }
  async function approveEntry(e: Timesheet) {
    try {
      const r = await fetch(`/api/timesheets/${e.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to approve entry");
      }
      toast.success("Entry approved.");
      qc.invalidateQueries({ queryKey: ["timesheets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve entry.");
    }
  }

  function exportCSV() {
    if (allEntries.length === 0) {
      toast.error("No timesheet entries to export.");
      return;
    }
    const headers = [
      "Employee",
      "Project",
      "Task",
      "Date",
      "Hours",
      "Description",
      "Status",
      "Submitted At",
      "Approved By",
      "Approved At",
      "Reject Reason",
    ];
    const rows = allEntries.map((e) => [
      e.employeeName,
      e.projectName ?? "",
      e.task,
      formatDate(e.date),
      e.hours,
      e.description ?? "",
      e.status,
      e.submittedAt ? formatDate(e.submittedAt, "datetime") : "",
      e.approvedBy ?? "",
      e.approvedAt ? formatDate(e.approvedAt, "datetime") : "",
      e.rejectReason ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "");
            return s.includes(",") || s.includes('"') || s.includes("\n")
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      )
      .join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `timesheets-${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success(`Exported ${allEntries.length} entr${allEntries.length === 1 ? "y" : "ies"}.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Tracking"
        description="Track employee work hours and timesheets"
        icon={<Clock className="size-5" />}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={exportCSV}
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Entry</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        }
      />

      {/* Clock widget */}
      <ClockWidget onSaved={() => qc.invalidateQueries({ queryKey: ["timesheets"] })} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Hours This Week"
          value={totalHoursThisWeek.toFixed(1)}
          icon={Clock}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">From {weekEntries.length} entr{weekEntries.length === 1 ? "y" : "ies"}</span>}
        />
        <KpiCard
          label="Pending Approval"
          value={pendingApproval}
          icon={History}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={<span className="text-muted-foreground">Awaiting review</span>}
        />
        <KpiCard
          label="Approved Hours"
          value={approvedHours.toFixed(1)}
          icon={CircleCheck}
          iconClass="bg-emerald-500/15 text-emerald-600"
          footer={<span className="text-muted-foreground">All-time total</span>}
        />
        <KpiCard
          label="Avg Hours/Day"
          value={avgHoursPerDay.toFixed(1)}
          icon={CalendarDays}
          iconClass="bg-violet-500/15 text-violet-600"
          footer={<span className="text-muted-foreground">This week</span>}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries" className="gap-1.5">
            <History className="size-4" />
            My Entries
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="size-4" />
            Pending Approval
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <BarChart3 className="size-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Entries tab */}
        <TabsContent value="entries" className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by task, employee, project…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {allEntries.length}
                  </span>{" "}
                  entr{allEntries.length === 1 ? "y" : "ies"}
                  {search && " (filtered)"}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <TimesheetsSkeleton />
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load entries"
              description="Please try again."
              actionLabel="Retry"
              onAction={() => qc.invalidateQueries({ queryKey: ["timesheets"] })}
            />
          ) : allEntries.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={search ? "No matching entries" : "No timesheet entries yet"}
              description={
                search
                  ? "Try adjusting your filters."
                  : "Add an entry or use the clock widget to start tracking time."
              }
              actionLabel="Add Entry"
              onAction={openCreate}
            />
          ) : (
            <TimesheetsTable
              entries={allEntries}
              onEdit={openEdit}
              onDelete={deleteEntry}
              onSubmit={submitEntry}
              onApprove={approveEntry}
              onReject={(e) => setRejectEntry(e)}
              onView={(e) => setViewEntry(e)}
            />
          )}
        </TabsContent>

        {/* Pending tab */}
        <TabsContent value="pending" className="space-y-4">
          <PendingTab
            entries={allEntries.filter((e) => e.status === "SUBMITTED")}
            onApprove={approveEntry}
            onReject={(e) => setRejectEntry(e)}
            onView={(e) => setViewEntry(e)}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Summary tab */}
        <TabsContent value="summary" className="space-y-4">
          <SummaryTab />
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <EntryFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditEntry(null);
        }}
        entry={editEntry}
        onSaved={() => qc.invalidateQueries({ queryKey: ["timesheets"] })}
        existingProjects={Array.from(
          new Set(
            allEntries
              .map((e) => e.projectName)
              .filter((p): p is string => !!p)
          )
        ).sort()}
      />

      {/* View dialog */}
      <EntryViewDialog entry={viewEntry} onClose={() => setViewEntry(null)} />

      {/* Reject dialog */}
      <RejectDialog
        entry={rejectEntry}
        onClose={() => setRejectEntry(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["timesheets"] })}
      />
    </div>
  );
}

// =========================================================
// Clock widget
// =========================================================

function ClockWidget({ onSaved }: { onSaved: () => void }) {
  const { data: employeesData } = useEmployees(true);
  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData?.items ?? []).map((e: any) => ({
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        photo: e.photo,
        department: e.department,
        designation: e.designation,
      })) ?? [],
    [employeesData]
  );

  const [clock, setClock] = useState<ClockState | null>(null);
  const [tick, setTick] = useState(0);
  const [employeeId, setEmployeeId] = useState("");
  const [task, setTask] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load clock state from localStorage on mount.
  useEffect(() => {
    setClock(readClock());
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-sync when storage changes (multi-tab).
  useEffect(() => {
    const handler = () => setClock(readClock());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Force re-render each second to update elapsed time.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
  }, [tick]);

  const elapsedMs = clock ? Date.now() - new Date(clock.startedAt).getTime() : 0;
  const elapsedLabel = formatDuration(elapsedMs);
  const nowStr = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const selectedEmp = employees.find((e) => e.id === (clock?.employeeId ?? employeeId));

  function clockIn() {
    if (!employeeId) {
      toast.error("Please select an employee to clock in.");
      setPickerOpen(true);
      return;
    }
    const state: ClockState = {
      employeeId,
      startedAt: new Date().toISOString(),
    };
    writeClock(state);
    setClock(state);
    toast.success(`Clocked in for ${selectedEmp?.fullName ?? "employee"}.`);
  }

  async function clockOut() {
    if (!clock) return;
    setSaving(true);
    try {
      const startedAt = new Date(clock.startedAt);
      const endedAt = new Date();
      const hours =
        Math.round(((endedAt.getTime() - startedAt.getTime()) / 3_600_000) * 100) / 100;
      if (hours < 0.01) {
        toast.error("Clock session too short to record.");
        writeClock(null);
        setClock(null);
        return;
      }
      const body: any = {
        employeeId: clock.employeeId,
        date: startedAt.toISOString(),
        hours,
        task: task.trim() || "Clocked work session",
      };
      if (projectName.trim()) body.projectName = projectName.trim();
      const r = await fetch(`/api/timesheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to create entry");
      }
      toast.success(
        `Clocked out. Recorded ${hours}h${
          selectedEmp ? ` for ${selectedEmp.fullName}` : ""
        }.`
      );
      writeClock(null);
      setClock(null);
      setTask("");
      setProjectName("");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clock out.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5 border-border/60 overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "size-12 rounded-2xl flex items-center justify-center flex-shrink-0",
              clock
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Timer className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {clock ? "Currently Clocked In" : "Time Clock"}
              </h3>
              {clock && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {clock ? (
                <span>
                  Started at{" "}
                  {new Date(clock.startedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · Elapsed{" "}
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {elapsedLabel}
                  </span>
                </span>
              ) : (
                <span>Current time: {nowStr}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: either employee picker + clock in, or task/project + clock out */}
        {clock ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Input
              placeholder="What are you working on?"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="sm:w-56 h-9"
            />
            <Input
              placeholder="Project (optional)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="sm:w-40 h-9"
            />
            <Button
              onClick={clockOut}
              disabled={saving}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white h-9"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <StopCircle className="size-4" />
              )}
              Clock Out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 justify-start font-normal md:w-64"
                >
                  {selectedEmp ? (
                    <span className="flex items-center gap-2 min-w-0">
                      <AvatarBadge
                        name={selectedEmp.fullName}
                        photo={selectedEmp.photo}
                        size="sm"
                      />
                      <span className="truncate">{selectedEmp.fullName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select employee…</span>
                  )}
                  <ChevronsUpDown className="size-4 opacity-50 shrink-0 ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="end">
                <Command>
                  <CommandInput placeholder="Search employee name or ID…" />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.fullName} ${e.employeeId} ${e.department?.name ?? ""}`}
                          onSelect={() => {
                            setEmployeeId(e.id);
                            setPickerOpen(false);
                          }}
                        >
                          <AvatarBadge
                            name={e.fullName}
                            photo={e.photo}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {e.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {e.employeeId} · {e.department?.name ?? "—"}
                            </div>
                          </div>
                          {employeeId === e.id && (
                            <CheckIcon className="size-4 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              onClick={clockIn}
              disabled={saving}
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlayCircle className="size-4" />
              Clock In
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDuration(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// =========================================================
// Skeleton
// =========================================================

function TimesheetsSkeleton() {
  return (
    <Card className="p-0 overflow-hidden border-border/60">
      <div className="p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border/40 last:border-0">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// =========================================================
// Table
// =========================================================

function TimesheetsTable({
  entries,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onView,
}: {
  entries: Timesheet[];
  onEdit: (e: Timesheet) => void;
  onDelete: (e: Timesheet) => void;
  onSubmit: (e: Timesheet) => void;
  onApprove: (e: Timesheet) => void;
  onReject: (e: Timesheet) => void;
  onView: (e: Timesheet) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden border-border/60">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="min-w-[200px]">Task</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarBadge
                      name={e.employeeName}
                      photo={e.employeePhoto}
                      size="sm"
                    />
                    <span className="font-medium text-sm truncate">
                      {e.employeeName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {e.projectName ? (
                    <Badge variant="outline" className="text-[11px] gap-1 bg-muted/30">
                      <Briefcase className="size-3" />
                      {e.projectName}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="text-sm truncate" title={e.task}>
                      {e.task}
                    </p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {e.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(e.date)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {e.hours.toFixed(1)}h
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-medium capitalize",
                      STATUS_COLOR[e.status]
                    )}
                  >
                    {e.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <EntryActions
                    entry={e}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSubmit={onSubmit}
                    onApprove={onApprove}
                    onReject={onReject}
                    onView={onView}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function EntryActions({
  entry,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onView,
}: {
  entry: Timesheet;
  onEdit: (e: Timesheet) => void;
  onDelete: (e: Timesheet) => void;
  onSubmit: (e: Timesheet) => void;
  onApprove: (e: Timesheet) => void;
  onReject: (e: Timesheet) => void;
  onView: (e: Timesheet) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex items-center justify-end gap-1">
      {entry.status === "DRAFT" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(entry)}
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={busy === "submit"}
            onClick={() => run("submit", () => onSubmit(entry))}
          >
            {busy === "submit" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span className="hidden md:inline">Submit</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
            onClick={() => onDelete(entry)}
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </>
      )}
      {entry.status === "SUBMITTED" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
            disabled={busy === "approve"}
            onClick={() => run("approve", () => onApprove(entry))}
          >
            {busy === "approve" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span className="hidden md:inline">Approve</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-rose-700 border-rose-500/30 hover:bg-rose-500/10"
            onClick={() => onReject(entry)}
          >
            <X className="size-3.5" />
            <span className="hidden md:inline">Reject</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onView(entry)}
            aria-label="View"
          >
            <Eye className="size-3.5" />
          </Button>
        </>
      )}
      {(entry.status === "APPROVED" || entry.status === "REJECTED") && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onView(entry)}
          aria-label="View"
        >
          <Eye className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

// =========================================================
// Pending tab
// =========================================================

function PendingTab({
  entries,
  onApprove,
  onReject,
  onView,
  isLoading,
}: {
  entries: Timesheet[];
  onApprove: (e: Timesheet) => void;
  onReject: (e: Timesheet) => void;
  onView: (e: Timesheet) => void;
  isLoading: boolean;
}) {
  if (isLoading) return <TimesheetsSkeleton />;
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Nothing pending"
        description="All submitted timesheets have been reviewed."
      />
    );
  }
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
          {entries.length} pending
        </Badge>
        <span className="text-muted-foreground">
          · {totalHours.toFixed(1)}h total awaiting approval
        </span>
      </div>
      <Card className="p-0 overflow-hidden border-border/60">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarBadge
                        name={e.employeeName}
                        photo={e.employeePhoto}
                        size="sm"
                      />
                      <span className="font-medium text-sm truncate">
                        {e.employeeName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {e.projectName ? (
                      <Badge variant="outline" className="text-[11px] gap-1 bg-muted/30">
                        <Briefcase className="size-3" />
                        {e.projectName}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm truncate max-w-xs" title={e.task}>
                      {e.task}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(e.date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {e.hours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.submittedAt ? formatDate(e.submittedAt, "datetime") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => onApprove(e)}
                      >
                        <Check className="size-3.5" />
                        <span className="hidden md:inline">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-rose-700 border-rose-500/30 hover:bg-rose-500/10"
                        onClick={() => onReject(e)}
                      >
                        <X className="size-3.5" />
                        <span className="hidden md:inline">Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => onView(e)}
                        aria-label="View"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// =========================================================
// Summary tab
// =========================================================

function SummaryTab() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");

  const { data: employeesData } = useEmployees(true);
  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData?.items ?? []).map((e: any) => ({
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        photo: e.photo,
        department: e.department,
        designation: e.designation,
      })) ?? [],
    [employeesData]
  );

  const { data, isLoading, isError } = useSummary(from, to, employeeId);
  const summary = data;

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <Card className="p-4 border-border/60">
        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="sum-from">From</Label>
            <Input
              id="sum-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="sum-to">To</Label>
            <Input
              id="sum-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:w-64 flex-1">
            <Label>Employee (optional)</Label>
            <Select
              value={employeeId || "ALL"}
              onValueChange={(v) => setEmployeeId(v === "ALL" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load summary"
          description="Please try again."
        />
      ) : !summary || summary.entryCount === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data for selected range"
          description="Choose a different date range or add timesheet entries."
        />
      ) : (
        <>
          {/* Summary stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total Hours
              </div>
              <div className="text-xl font-bold tabular-nums mt-1">
                {summary.totalHours.toFixed(1)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Entries
              </div>
              <div className="text-xl font-bold tabular-nums mt-1">
                {summary.entryCount}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Distinct Days
              </div>
              <div className="text-xl font-bold tabular-nums mt-1">
                {summary.distinctDays}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Avg Hours/Day
              </div>
              <div className="text-xl font-bold tabular-nums mt-1">
                {summary.avgHoursPerDay.toFixed(1)}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hours by project */}
            <Card className="p-4 border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="size-4 text-primary" />
                <h3 className="font-semibold text-sm">Hours by Project</h3>
              </div>
              {summary.byProject.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No project data.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary.byProject}
                      margin={{ top: 5, right: 10, left: -10, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        dataKey="projectName"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(16,185,129,0.08)" }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}h`, "Hours"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {summary.byProject.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PROJECT_BAR_COLORS[i % PROJECT_BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Hours by employee (top 10) */}
            <Card className="p-4 border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <User className="size-4 text-primary" />
                <h3 className="font-semibold text-sm">Hours by Employee (Top 10)</h3>
              </div>
              {summary.byEmployee.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No employee data.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary.byEmployee.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="employeeName"
                        tick={{ fontSize: 10 }}
                        width={100}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(16,185,129,0.08)" }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}h`, "Hours"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Daily totals table */}
          <Card className="p-0 overflow-hidden border-border/60">
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h3 className="font-semibold text-sm">Daily Totals</h3>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.dailyTotals.map((d) => (
                    <TableRow key={d.date} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">
                        {formatDate(d.date)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(d.date).toLocaleDateString("en-US", {
                          weekday: "long",
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {d.hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.entries}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// =========================================================
// Form dialog (create / edit)
// =========================================================

function EntryFormDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
  existingProjects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry: Timesheet | null;
  onSaved: () => void;
  existingProjects: string[];
}) {
  const { data: employeesData } = useEmployees(open);
  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData?.items ?? []).map((e: any) => ({
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        photo: e.photo,
        department: e.department,
        designation: e.designation,
      })) ?? [],
    [employeesData]
  );

  const [employeeId, setEmployeeId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [task, setTask] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  // Reset form when opened/edited.
  const resetKey = `${open}-${entry?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    if (entry) {
      setEmployeeId(entry.employeeId);
      setProjectName(entry.projectName ?? "");
      setTask(entry.task);
      setDate(entry.date.slice(0, 10));
      setHours(String(entry.hours));
      setDescription(entry.description ?? "");
    } else {
      setEmployeeId("");
      setProjectName("");
      setTask("");
      setDate(new Date().toISOString().slice(0, 10));
      setHours("");
      setDescription("");
    }
  }

  async function submit() {
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!task.trim()) {
      toast.error("Please enter a task description.");
      return;
    }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) {
      toast.error("Hours must be a positive number up to 24.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        employeeId,
        task: task.trim(),
        date,
        hours: h,
        projectName: projectName.trim() || null,
        description: description.trim() || null,
      };
      const r = entry
        ? await fetch(`/api/timesheets/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/timesheets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to save entry");
      }
      toast.success(entry ? "Entry updated." : "Entry created.");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            {entry ? "Edit Entry" : "Add Timesheet Entry"}
          </DialogTitle>
          <DialogDescription>
            {entry
              ? "Update the timesheet entry. Status remains DRAFT."
              : "Record a new timesheet entry. Status will be DRAFT until submitted."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            {employeesData ? (
              <EmployeeSearchSelect
                value={employeeId}
                onChange={setEmployeeId}
                employees={employees}
              />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Project (optional)</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {projectName ? (
                    <span className="flex items-center gap-2 min-w-0">
                      <Briefcase className="size-4 text-muted-foreground" />
                      <span className="truncate">{projectName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select or type a project…
                    </span>
                  )}
                  <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search or type project name…"
                    value={projectName}
                    onValueChange={setProjectName}
                  />
                  <CommandList className="max-h-56">
                    <CommandEmpty>
                      {projectName ? (
                        <span className="text-xs">
                          Press Enter to use &quot;{projectName}&quot;
                        </span>
                      ) : (
                        "No projects yet."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {existingProjects
                        .filter((p) =>
                          projectName
                            ? p.toLowerCase().includes(projectName.toLowerCase())
                            : true
                        )
                        .map((p) => (
                          <CommandItem
                            key={p}
                            value={p}
                            onSelect={() => {
                              setProjectName(p);
                              setProjectOpen(false);
                            }}
                          >
                            <Briefcase className="size-4 text-muted-foreground" />
                            <span className="truncate">{p}</span>
                            {projectName === p && (
                              <CheckIcon className="size-4 text-primary shrink-0 ml-auto" />
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ts-task">Task *</Label>
            <Input
              id="ts-task"
              placeholder="e.g. Implementing user authentication"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ts-date">Date *</Label>
              <Input
                id="ts-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-hours">Hours *</Label>
              <Input
                id="ts-hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                placeholder="0.00"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ts-desc">Description (optional)</Label>
            <Textarea
              id="ts-desc"
              placeholder="Notes about the work performed…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {entry ? "Save Changes" : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeSearchSelect({
  value,
  onChange,
  employees,
}: {
  value: string;
  onChange: (id: string) => void;
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <AvatarBadge
                name={selected.fullName}
                photo={selected.photo}
                size="sm"
              />
              <span className="truncate">{selected.fullName}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {selected.employeeId}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select employee…</span>
          )}
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search employee name or ID…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`${e.fullName} ${e.employeeId} ${e.department?.name ?? ""}`}
                  onSelect={() => {
                    onChange(e.id);
                    setOpen(false);
                  }}
                >
                  <AvatarBadge
                    name={e.fullName}
                    photo={e.photo}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {e.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {e.employeeId} · {e.department?.name ?? "—"}
                    </div>
                  </div>
                  {value === e.id && (
                    <CheckIcon className="size-4 text-primary shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// =========================================================
// View dialog
// =========================================================

function EntryViewDialog({
  entry,
  onClose,
}: {
  entry: Timesheet | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            Timesheet Entry Details
          </DialogTitle>
          <DialogDescription>
            Submitted by {entry.employeeName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-medium capitalize",
                STATUS_COLOR[entry.status]
              )}
            >
              {entry.status.toLowerCase()}
            </Badge>
            {entry.projectName && (
              <Badge variant="outline" className="text-[11px] gap-1 bg-muted/30">
                <Briefcase className="size-3" />
                {entry.projectName}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <ViewField label="Employee">
              <div className="flex items-center gap-2">
                <AvatarBadge
                  name={entry.employeeName}
                  photo={entry.employeePhoto}
                  size="sm"
                />
                <span className="font-medium">{entry.employeeName}</span>
              </div>
            </ViewField>
            <ViewField label="Date">
              <span>{formatDate(entry.date)}</span>
            </ViewField>
            <ViewField label="Hours">
              <span className="font-semibold text-lg tabular-nums">
                {entry.hours.toFixed(1)}h
              </span>
            </ViewField>
            <ViewField label="Project">
              <span>{entry.projectName ?? "—"}</span>
            </ViewField>
            <ViewField label="Submitted At" full>
              <span>
                {entry.submittedAt
                  ? formatDate(entry.submittedAt, "datetime")
                  : "—"}
              </span>
            </ViewField>
            <ViewField label="Approved By">
              <span>{entry.approvedBy ?? "—"}</span>
            </ViewField>
            <ViewField label="Approved At">
              <span>
                {entry.approvedAt
                  ? formatDate(entry.approvedAt, "datetime")
                  : "—"}
              </span>
            </ViewField>
          </div>

          <ViewField label="Task" full>
            <p className="text-sm">{entry.task}</p>
          </ViewField>

          {entry.description && (
            <ViewField label="Description" full>
              <p className="text-sm text-muted-foreground">
                {entry.description}
              </p>
            </ViewField>
          )}

          {entry.rejectReason && (
            <ViewField label="Reject Reason" full>
              <p className="text-sm text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                {entry.rejectReason}
              </p>
            </ViewField>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-0.5", full && "col-span-2")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

// =========================================================
// Reject dialog
// =========================================================

function RejectDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: Timesheet | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) setReason("");
  }, [entry]);

  async function submit() {
    if (!entry) return;
    if (!reason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/timesheets/${entry.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to reject entry");
      }
      toast.success("Entry rejected.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!entry}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="size-5 text-rose-600" />
            Reject Timesheet Entry
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this entry from {entry?.employeeName} (
            {entry?.hours.toFixed(1)}h on {entry?.task}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ts-reject-reason">Reason *</Label>
            <Textarea
              id="ts-reject-reason"
              placeholder="e.g. Hours exceed approved schedule, please revise…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onClose()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Reject Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
