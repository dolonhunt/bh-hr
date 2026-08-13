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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarCheck,
  CalendarX,
  Clock,
  CalendarDays,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceEntryDialog } from "./attendance-entry-dialog";
import { ExportButton } from "../shared/export-button";

export function AttendanceModule() {
  const qc = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<{ id: string } | null>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", date, departmentId, status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/attendance?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // KPIs for the selected date
  const presentToday = items.filter((a: any) => a.status === "PRESENT").length;
  const absentToday = items.filter((a: any) => a.status === "ABSENT").length;
  const lateToday = items.filter((a: any) => a.status === "LATE").length;
  const onLeaveToday = items.filter((a: any) => a.status === "LEAVE").length;

  function editRecordFn(id: string) {
    setEditRecord({ id });
    setEntryOpen(true);
  }

  function addNew() {
    setEditRecord(null);
    setEntryOpen(true);
  }

  async function deleteRecord(id: string) {
    if (!confirm("Delete this attendance record?")) return;
    try {
      const r = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      toast.success("Attendance record deleted.");
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-heatmap"] });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track daily check-in / check-out, late arrivals, and overtime"
        icon={<CalendarCheck className="size-5" />}
        actions={
          <>
            <ExportButton
              module="attendance"
              filters={{ date, departmentId, status, search }}
            />
            <Button size="sm" onClick={addNew}>
              <Plus className="size-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Add Attendance</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Present"
          value={presentToday}
          icon={CalendarCheck}
          iconClass="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Absent"
          value={absentToday}
          icon={CalendarX}
          iconClass="bg-rose-500/10 text-rose-600"
        />
        <KpiCard
          label="Late"
          value={lateToday}
          icon={Clock}
          iconClass="bg-amber-500/10 text-amber-600"
        />
        <KpiCard
          label="On Leave"
          value={onLeaveToday}
          icon={CalendarDays}
          iconClass="bg-violet-500/10 text-violet-600"
        />
      </div>

      {/* Heatmap section */}
      <AttendanceHeatmap />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="md:w-44"
        />
        <Select
          value={departmentId || "ALL"}
          onValueChange={(v) => {
            setDepartmentId(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {(departments?.items ?? departments ?? []).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="LEAVE">On Leave</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="REMOTE">Remote</SelectItem>
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
        <span className="font-medium text-foreground">{items.length}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> records
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
          icon={CalendarCheck}
          title="No attendance records"
          description={
            date || departmentId || status || search
              ? "No records match the current filters."
              : "Add the first attendance entry to get started."
          }
          actionLabel="Add Attendance"
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
                  <TableHead className="min-w-[200px]">Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead className="hidden sm:table-cell">Check Out</TableHead>
                  <TableHead className="hidden md:table-cell">Hours</TableHead>
                  <TableHead className="hidden md:table-cell">Late</TableHead>
                  <TableHead className="hidden lg:table-cell">Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a: any) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarBadge
                          name={a.employee?.fullName}
                          photo={a.employee?.photo}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {a.employee?.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {a.employee?.employeeId}
                          </div>
                          <div className="sm:hidden text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(a.date)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell">
                      {formatDate(a.date)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {a.checkIn
                        ? new Date(a.checkIn).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums hidden sm:table-cell">
                      {a.checkOut
                        ? new Date(a.checkOut).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums hidden md:table-cell">
                      {a.workingHours ? `${a.workingHours}h` : "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell">
                      {a.late ? (
                        <span className="text-amber-600 font-medium">
                          {a.lateMinutes}m
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums hidden lg:table-cell">
                      {a.overtime ? `${a.overtime}h` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editRecordFn(a.id)}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600"
                            onClick={() => deleteRecord(a.id)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <AttendanceEntryDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) setEditRecord(null);
        }}
        record={editRecord}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["attendance"] });
          qc.invalidateQueries({ queryKey: ["attendance-heatmap"] });
        }}
      />
    </div>
  );
}

// =========================================================
// AttendanceHeatmap — GitHub-style contribution graph
// =========================================================

const INTENSITY_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500",
  LATE: "bg-amber-500/80",
  REMOTE: "bg-amber-500/80",
  HALF_DAY: "bg-sky-500/60",
  LEAVE: "bg-amber-500/40",
  ABSENT: "bg-rose-500/60",
  HOLIDAY: "bg-muted/30",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  REMOTE: "Remote",
  HALF_DAY: "Half Day",
  LEAVE: "On Leave",
  ABSENT: "Absent",
  HOLIDAY: "Holiday",
};

const LEGEND_ITEMS = [
  { label: "Less", color: "bg-muted/30" },
  { label: "Absent", color: "bg-rose-500/60" },
  { label: "Leave", color: "bg-amber-500/40" },
  { label: "Half Day", color: "bg-sky-500/60" },
  { label: "Late / Remote", color: "bg-amber-500/80" },
  { label: "Present", color: "bg-emerald-500" },
  { label: "More", color: "bg-emerald-600" },
];

const CELL_PX = 12;
const GAP_PX = 3;

type HeatmapItem = {
  date: string;
  status: string;
  workingHours: number | null;
  count?: number;
};

function AttendanceHeatmap() {
  const [employeeId, setEmployeeId] = useState("");
  const [months, setMonths] = useState(3);

  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-heatmap"],
    queryFn: () =>
      fetch("/api/employees?pageSize=1000").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-heatmap", employeeId, months],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeId) params.set("employeeId", employeeId);
      params.set("months", String(months));
      const r = await fetch(`/api/attendance/heatmap?${params.toString()}`);
      return r.json();
    },
  });

  const items: HeatmapItem[] = data?.items ?? [];
  const startDateStr = data?.startDate;
  const endDateStr = data?.endDate;

  const { weeks, monthLabels } = useMemo(() => {
    if (!startDateStr || !endDateStr) {
      return { weeks: [] as Date[][], monthLabels: [] as { col: number; label: string }[] };
    }
    const start = new Date(startDateStr);
    start.setDate(start.getDate() - start.getDay()); // shift to Sunday
    const end = new Date(endDateStr);
    end.setDate(end.getDate() + (6 - end.getDay())); // shift to Saturday

    const w: Date[][] = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      const wk: Date[] = [];
      for (let i = 0; i < 7; i++) {
        wk.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      w.push(wk);
    }

    const labels: { col: number; label: string }[] = [];
    w.forEach((wk, i) => {
      const first = wk[0];
      const isFirst = i === 0 || first.getMonth() !== w[i - 1][0].getMonth();
      if (isFirst) {
        labels.push({
          col: i,
          label: first.toLocaleDateString("en-US", { month: "short" }),
        });
      }
    });
    return { weeks: w, monthLabels: labels };
  }, [startDateStr, endDateStr]);

  // Map items by date for O(1) lookup
  const byDate = useMemo(() => {
    const m = new Map<string, HeatmapItem>();
    items.forEach((i) => m.set(i.date, i));
    return m;
  }, [items]);

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Card className="border-border/60 shadow-soft p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" />
            Attendance Heatmap
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {months} month{months === 1 ? "" : "s"} — color intensity reflects attendance status
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={employeeId || "ALL"}
            onValueChange={(v) => setEmployeeId(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All employees (aggregated)</SelectItem>
              {(employeesData?.items ?? []).map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.fullName} · {e.employeeId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(months)}
            onValueChange={(v) => setMonths(Number(v))}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : weeks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No attendance data for this range.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div
              className="relative mb-1 ml-7"
              style={{ height: "14px" }}
            >
              {monthLabels.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                  style={{ left: `${m.col * (CELL_PX + GAP_PX)}px` }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Heatmap body: day labels + grid */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div
                className="flex flex-col text-[10px] text-muted-foreground pr-1 flex-shrink-0"
                style={{ width: "1.5rem" }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (d, i) => (
                    <div
                      key={d}
                      className="leading-none flex items-end"
                      style={{
                        height: `${CELL_PX}px`,
                        marginBottom: i < 6 ? `${GAP_PX}px` : 0,
                      }}
                    >
                      {d === "Mon" || d === "Wed" || d === "Fri" ? d : ""}
                    </div>
                  )
                )}
              </div>

              {/* Grid */}
              <TooltipProvider delayDuration={150}>
                <div
                  className="grid grid-flow-col"
                  style={{
                    gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                    gap: `${GAP_PX}px`,
                  }}
                >
                  {weeks.flat().map((day, idx) => {
                    const key = localDateKey(day);
                    const info = byDate.get(key);
                    const isFuture = key > todayKey;
                    const status = info?.status;
                    const colorClass = !status
                      ? isFuture
                        ? "bg-transparent"
                        : "bg-muted/30"
                      : INTENSITY_COLORS[status] ?? "bg-muted/30";
                    const tooltipText = buildTooltipText(day, info);

                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "rounded-[3px] ring-0 transition-transform hover:ring-1 hover:ring-primary/50 hover:scale-110",
                              colorClass
                            )}
                            style={{ width: `${CELL_PX}px`, height: `${CELL_PX}px` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="text-xs whitespace-nowrap"
                        >
                          {tooltipText}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground ml-7">
              <span className="font-medium">Less</span>
              {LEGEND_ITEMS.slice(1, -1).map((it, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-3 rounded-[3px] inline-block",
                    it.color
                  )}
                  title={it.label}
                />
              ))}
              <span className="font-medium">More</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTooltipText(day: Date, info: HeatmapItem | undefined): string {
  const dateStr = day.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!info) {
    return `${dateStr} — No data`;
  }
  const statusLabel = STATUS_LABEL[info.status] ?? info.status;
  const countSuffix =
    info.count !== undefined && info.count > 0
      ? ` · ${info.count} record${info.count === 1 ? "" : "s"}`
      : "";
  const hoursSuffix =
    info.workingHours !== null && info.workingHours !== undefined
      ? ` · ${info.workingHours}h avg`
      : "";
  return `${dateStr} — ${statusLabel}${hoursSuffix}${countSuffix}`;
}
