"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TrendingUp,
  Award,
  Target,
  ClipboardList,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { ExportButton } from "../shared/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { cn } from "@/lib/utils";

const STATUSES = ["DRAFT", "SUBMITTED", "REVIEWED", "FINALIZED"] as const;
type PerfStatus = (typeof STATUSES)[number];

interface EmployeeOption {
  id: string;
  employeeId: string;
  fullName: string;
  photo?: string | null;
  department?: { name: string; color?: string | null } | null;
  designation?: { name: string } | null;
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewPeriod: string;
  reviewer?: string | null;
  goals: number;
  quality: number;
  attendance: number;
  teamwork: number;
  communication: number;
  overallScore: number;
  comments?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeOption;
}

// Score color helpers (red < 40, amber 40-60, yellow 60-75, purple 75+)
function scoreBarColor(score: number): string {
  if (score < 40) return "bg-rose-500";
  if (score < 60) return "bg-amber-500";
  if (score < 75) return "bg-yellow-500";
  return "bg-primary";
}
function scoreTextColor(score: number): string {
  if (score < 40) return "text-rose-600 dark:text-rose-400";
  if (score < 60) return "text-amber-600 dark:text-amber-400";
  if (score < 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-primary dark:text-primary/80";
}

const DIMENSIONS = [
  { key: "goals", label: "Goals" },
  { key: "quality", label: "Quality" },
  { key: "attendance", label: "Attendance" },
  { key: "teamwork", label: "Teamwork" },
  { key: "communication", label: "Communication" },
] as const;

export function PerformanceModule() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [detailReview, setDetailReview] = useState<PerformanceReview | null>(null);

  const filters = { search, reviewPeriod, status };

  const { data, isLoading } = useQuery({
    queryKey: ["performance", search, reviewPeriod, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (reviewPeriod) params.set("reviewPeriod", reviewPeriod);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/performance?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  // Stats query — fetches a wide window to drive KPI cards
  const { data: statsData } = useQuery({
    queryKey: ["performance-stats"],
    queryFn: async () => {
      const r = await fetch(`/api/performance?pageSize=500`);
      return r.json();
    },
  });

  const items: PerformanceReview[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const allReviews: PerformanceReview[] = statsData?.items ?? [];
  const avgScore =
    allReviews.length > 0
      ? Math.round(
          allReviews.reduce((s, r) => s + (r.overallScore ?? 0), 0) /
            allReviews.length
        )
      : 0;
  const topPerformers = allReviews.filter(
    (r) => (r.overallScore ?? 0) >= 85
  ).length;
  const pendingReviews = allReviews.filter(
    (r) => r.status === "SUBMITTED"
  ).length;

  function openCreate() {
    setEditReview(null);
    setFormOpen(true);
  }

  function openEdit(review: PerformanceReview) {
    setEditReview(review);
    setDetailReview(null);
    setFormOpen(true);
  }

  async function deleteReview(id: string, label: string) {
    if (!confirm(`Delete performance review "${label}"? This cannot be undone.`))
      return;
    try {
      const r = await fetch(`/api/performance/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete review");
      toast.success("Performance review deleted.");
      qc.invalidateQueries({ queryKey: ["performance"] });
      qc.invalidateQueries({ queryKey: ["performance-stats"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete review.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Management"
        description="Track employee goals, reviews, and ratings"
        icon={<TrendingUp className="size-5" />}
        actions={
          <>
            <ExportButton module="performance" filters={filters} />
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create Review</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Reviews"
          value={allReviews.length}
          icon={ClipboardList}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">All time</span>}
        />
        <KpiCard
          label="Avg Score"
          value={
            <span className={scoreTextColor(avgScore)}>{avgScore}</span>
          }
          icon={TrendingUp}
          iconClass="bg-primary/15 text-primary"
          footer={
            <span className="text-muted-foreground">Out of 100</span>
          }
        />
        <KpiCard
          label="Top Performers"
          value={topPerformers}
          icon={Award}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={
            <span className="text-muted-foreground">Score ≥ 85</span>
          }
        />
        <KpiCard
          label="Pending Reviews"
          value={pendingReviews}
          icon={Target}
          iconClass="bg-rose-500/15 text-rose-600"
          footer={
            <span className="text-muted-foreground">Awaiting review</span>
          }
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search reviewer, period, comments, employee…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Review period (e.g. Q2 2025)"
          value={reviewPeriod}
          onChange={(e) => {
            setReviewPeriod(e.target.value);
            setPage(1);
          }}
          className="md:w-56"
        />
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{items.length}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> reviews
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card className="border-border/60 shadow-soft p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No performance reviews found"
          description={
            search || reviewPeriod || status
              ? "Try adjusting your filters."
              : "Create your first performance review to start tracking goals and ratings."
          }
          actionLabel="Create Review"
          onAction={openCreate}
        />
      )}

      {/* Table */}
      {!isLoading && items.length > 0 && (
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px]">Employee</TableHead>
                  <TableHead className="min-w-[120px]">Review Period</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[140px]">
                    Reviewer
                  </TableHead>
                  <TableHead className="min-w-[180px]">Overall Score</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setDetailReview(r)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarBadge
                          name={r.employee.fullName}
                          photo={r.employee.photo}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {r.employee.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {r.employee.employeeId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.reviewPeriod}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.reviewer || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              scoreBarColor(r.overallScore)
                            )}
                            style={{ width: `${Math.min(100, r.overallScore)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums w-8 text-right",
                            scoreTextColor(r.overallScore)
                          )}
                        >
                          {Math.round(r.overallScore)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={() => setDetailReview(r)}
                          >
                            <Eye className="size-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700"
                            onClick={() =>
                              deleteReview(
                                r.id,
                                `${r.employee.fullName} — ${r.reviewPeriod}`
                              )
                            }
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

      {/* Create/Edit dialog */}
      <ReviewFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditReview(null);
        }}
        review={editReview}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["performance"] });
          qc.invalidateQueries({ queryKey: ["performance-stats"] });
        }}
      />

      {/* Detail dialog */}
      <ReviewDetailDialog
        review={detailReview}
        onClose={() => setDetailReview(null)}
        onEdit={(r) => openEdit(r)}
      />
    </div>
  );
}

// =========================================================
// Employee searchable select (Popover + Command)
// =========================================================

function EmployeeSearchSelect({
  value,
  onChange,
  employees,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  employees: EmployeeOption[];
  disabled?: boolean;
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
          disabled={disabled}
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
                    <Check className="size-4 text-primary shrink-0" />
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
// Review form dialog (Create + Edit)
// =========================================================

function ReviewFormDialog({
  open,
  onOpenChange,
  review,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  review: PerformanceReview | null;
  onSaved: () => void;
}) {
  const { data: employeesData } = useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const r = await fetch(`/api/employees?pageSize=500`);
      return r.json();
    },
    enabled: open,
  });
  const employees: EmployeeOption[] =
    (employeesData?.items ?? []).map((e: any) => ({
      id: e.id,
      employeeId: e.employeeId,
      fullName: e.fullName,
      photo: e.photo,
      department: e.department,
      designation: e.designation,
    })) ?? [];

  const [saving, setSaving] = useState(false);

  // Sync form fields when dialog opens or `review` changes.
  // We use a derived key to remount the inner form whenever a new review is
  // opened. This avoids `useEffect` set-state lint warnings.
  const formKey = `${open ? "open" : "closed"}-${review?.id ?? "new"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {review ? "Edit Performance Review" : "Create Performance Review"}
          </DialogTitle>
          <DialogDescription>
            Rate the employee on five dimensions. The overall score is the
            average of all five.
          </DialogDescription>
        </DialogHeader>
        <ReviewFormBody
          key={formKey}
          review={review}
          employees={employees}
          employeesLoading={!employeesData}
          onSaved={(saved) => {
            onSaved();
            onOpenChange(false);
            toast.success(
              review
                ? "Performance review updated."
                : "Performance review created."
            );
            void saved;
          }}
          onCancel={() => onOpenChange(false)}
          savingState={[saving, setSaving]}
        />
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Form body (kept separate so we can remount on review change)
// =========================================================

function ReviewFormBody({
  review,
  employees,
  employeesLoading,
  onSaved,
  onCancel,
  savingState,
}: {
  review: PerformanceReview | null;
  employees: EmployeeOption[];
  employeesLoading: boolean;
  onSaved: (review: PerformanceReview) => void;
  onCancel: () => void;
  savingState: [boolean, (b: boolean) => void];
}) {
  // Initialise state from review once (remount ensures freshness)
  const [employeeId, setEmployeeId] = useState(review?.employeeId ?? "");
  const [reviewPeriod, setReviewPeriod] = useState(review?.reviewPeriod ?? "");
  const [reviewer, setReviewer] = useState(review?.reviewer ?? "");
  const [scores, setScores] = useState<Record<string, number>>({
    goals: review?.goals ?? 70,
    quality: review?.quality ?? 70,
    attendance: review?.attendance ?? 70,
    teamwork: review?.teamwork ?? 70,
    communication: review?.communication ?? 70,
  });
  const [comments, setComments] = useState(review?.comments ?? "");
  const [statusVal, setStatusVal] = useState<PerfStatus>(
    (review?.status as PerfStatus) ?? "DRAFT"
  );
  const [saving, setSaving] = savingState;

  const overall = Math.round(
    DIMENSIONS.reduce((s, d) => s + (scores[d.key] ?? 0), 0) /
      DIMENSIONS.length
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!reviewPeriod.trim()) {
      toast.error("Please enter a review period (e.g. Q2 2025).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId,
        reviewPeriod: reviewPeriod.trim(),
        reviewer: reviewer.trim() || null,
        goals: scores.goals,
        quality: scores.quality,
        attendance: scores.attendance,
        teamwork: scores.teamwork,
        communication: scores.communication,
        comments: comments.trim() || null,
        status: statusVal,
      };
      const url = review
        ? `/api/performance/${review.id}`
        : `/api/performance`;
      const method = review ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save review");
      }
      const saved = await r.json();
      onSaved(saved);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Employee */}
      <div className="space-y-1.5">
        <Label>Employee</Label>
        {employeesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <EmployeeSearchSelect
            value={employeeId}
            onChange={setEmployeeId}
            employees={employees}
            disabled={!!review}
          />
        )}
        {review && (
          <p className="text-xs text-muted-foreground">
            Employee cannot be changed after creation.
          </p>
        )}
      </div>

      {/* Review period + reviewer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reviewPeriod">Review Period</Label>
          <Input
            id="reviewPeriod"
            placeholder="e.g. Q2 2025"
            value={reviewPeriod}
            onChange={(e) => setReviewPeriod(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reviewer">Reviewer</Label>
          <Input
            id="reviewer"
            placeholder="e.g. Tahmina Akter"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
        </div>
      </div>

      {/* Score sliders */}
      <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Score Dimensions</div>
            <div className="text-xs text-muted-foreground">
              Drag each slider between 0 and 100.
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Overall
            </div>
            <div
              className={cn(
                "text-2xl font-bold tabular-nums leading-none",
                scoreTextColor(overall)
              )}
            >
              {overall}
            </div>
          </div>
        </div>
        <div className="space-y-3.5">
          {DIMENSIONS.map((d) => {
            const v = scores[d.key] ?? 0;
            return (
              <div key={d.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.label}</span>
                  <span
                    className={cn(
                      "tabular-nums font-semibold",
                      scoreTextColor(v)
                    )}
                  >
                    {v}
                  </span>
                </div>
                <Slider
                  value={[v]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(val) =>
                    setScores((prev) => ({ ...prev, [d.key]: val[0] }))
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-1.5">
        <Label htmlFor="comments">Comments</Label>
        <Textarea
          id="comments"
          rows={3}
          placeholder="Overall feedback, strengths, areas to improve…"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={statusVal}
          onValueChange={(v) => setStatusVal(v as PerfStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving && <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {review ? "Save Changes" : "Create Review"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// =========================================================
// Detail dialog (with RadarChart)
// =========================================================

function ReviewDetailDialog({
  review,
  onClose,
  onEdit,
}: {
  review: PerformanceReview | null;
  onClose: () => void;
  onEdit: (r: PerformanceReview) => void;
}) {
  if (!review) return null;
  const chartData = DIMENSIONS.map((d) => ({
    dimension: d.label,
    score: review[d.key] ?? 0,
  }));

  return (
    <Dialog
      open={!!review}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Review Detail</DialogTitle>
          <DialogDescription>
            {review.reviewPeriod} · Reviewed by {review.reviewer || "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Employee header */}
        <div className="flex items-center gap-3 rounded-lg border border-border/60 p-4 bg-muted/20">
          <AvatarBadge
            name={review.employee.fullName}
            photo={review.employee.photo}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-base truncate">
              {review.employee.fullName}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {review.employee.employeeId}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {review.employee.department?.name ?? "—"}
              {review.employee.designation
                ? ` · ${review.employee.designation.name}`
                : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Overall
            </div>
            <div
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                scoreTextColor(review.overallScore)
              )}
            >
              {Math.round(review.overallScore)}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" className="font-medium">
            {review.reviewPeriod}
          </Badge>
          <StatusBadge status={review.status} />
          <span className="text-muted-foreground text-xs">
            Updated {new Date(review.updatedAt).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RadarChart */}
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-sm font-medium mb-2">Score Breakdown</div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} outerRadius="75%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    stroke="#cbd5e1"
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#FF6658"
                    fill="#FF6658"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-dimension bars */}
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="text-sm font-medium">Dimension Scores</div>
            {DIMENSIONS.map((d) => {
              const v = review[d.key] ?? 0;
              return (
                <div key={d.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        scoreTextColor(v)
                      )}
                    >
                      {Math.round(v)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", scoreBarColor(v))}
                      style={{ width: `${Math.min(100, v)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        {review.comments && (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
            <div className="text-sm font-medium mb-1">Comments</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {review.comments}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => onEdit(review)}
          >
            <Pencil className="size-4" /> Edit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
