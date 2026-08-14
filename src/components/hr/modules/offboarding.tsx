"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  SkipForward,
  Trash2,
  Loader2,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CalendarDays,
  UserCog,
  StickyNote,
  CheckCircle,
  RotateCcw,
  PencilLine,
  DoorOpen,
  AlertTriangle,
  CalendarX,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";

type OffboardingStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

type ExitReason =
  | "RESIGNATION"
  | "TERMINATION"
  | "CONTRACT_END"
  | "RETIREMENT";

interface OffboardingTask {
  id: string;
  employeeId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status: OffboardingStatus;
  notes?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  isDefault: boolean;
  exitDate?: string | null;
  exitReason?: ExitReason | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CYCLE: Record<OffboardingStatus, OffboardingStatus> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "PENDING",
  SKIPPED: "PENDING",
};

const STATUS_ICON: Record<OffboardingStatus, typeof CheckCircle2> = {
  PENDING: CircleDashed,
  IN_PROGRESS: CircleDot,
  COMPLETED: CheckCircle2,
  SKIPPED: SkipForward,
};

const STATUS_COLOR: Record<OffboardingStatus, string> = {
  PENDING: "text-muted-foreground",
  IN_PROGRESS: "text-amber-600",
  COMPLETED: "text-emerald-600",
  SKIPPED: "text-rose-600",
};

const EXIT_REASON_LABEL: Record<ExitReason, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  CONTRACT_END: "Contract End",
  RETIREMENT: "Retirement",
};

const EXIT_REASON_TONE: Record<ExitReason, string> = {
  RESIGNATION: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  TERMINATION: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  CONTRACT_END: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  RETIREMENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function isOverdue(dueDate?: string | null, status?: OffboardingStatus) {
  if (!dueDate) return false;
  if (status === "COMPLETED" || status === "SKIPPED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-rose-500 transition-all duration-500"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">
          {Math.round(percent)}%
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Complete
        </span>
      </div>
    </div>
  );
}

function daysUntilExit(exitDate?: string | null): number | null {
  if (!exitDate) return null;
  const exit = new Date(exitDate);
  if (isNaN(exit.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exit.setHours(0, 0, 0, 0);
  return Math.round((exit.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function Offboarding({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [exitEditOpen, setExitEditOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const queryKey = ["offboarding", employeeId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await fetch(`/api/offboarding?employeeId=${employeeId}`);
      if (!r.ok) throw new Error("Failed to load offboarding tasks");
      return r.json();
    },
  });

  const tasks: OffboardingTask[] = data?.items ?? [];

  const exitDate = tasks[0]?.exitDate ?? null;
  const exitReason = tasks[0]?.exitReason ?? null;

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const skipped = tasks.filter((t) => t.status === "SKIPPED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const activeTotal = total - skipped;
    const percent = activeTotal > 0 ? (completed / activeTotal) * 100 : 0;
    return { total, completed, inProgress, skipped, pending, overdue, percent };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "pending") {
      return tasks.filter(
        (t) => t.status === "PENDING" || t.status === "IN_PROGRESS"
      );
    }
    if (filter === "completed") {
      return tasks.filter(
        (t) => t.status === "COMPLETED" || t.status === "SKIPPED"
      );
    }
    return tasks;
  }, [tasks, filter]);

  async function patchTask(id: string, patch: Record<string, unknown>) {
    setUpdatingId(id);
    try {
      const r = await fetch(`/api/offboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Update failed");
      }
      await qc.invalidateQueries({ queryKey });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  }

  async function cycleStatus(task: OffboardingTask) {
    const next = STATUS_CYCLE[task.status];
    await patchTask(task.id, { status: next });
    toast.success(`Marked as ${next.replace(/_/g, " ").toLowerCase()}`);
  }

  async function skipTask(task: OffboardingTask) {
    await patchTask(task.id, { status: "SKIPPED" });
    toast.success(`Task skipped`);
  }

  async function deleteTask(task: OffboardingTask) {
    setUpdatingId(task.id);
    try {
      const r = await fetch(`/api/offboarding/${task.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Delete failed");
      await qc.invalidateQueries({ queryKey });
      toast.success("Task removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete task");
    } finally {
      setUpdatingId(null);
    }
  }

  function startEditNotes(task: OffboardingTask) {
    setEditingNotesId(task.id);
    setNotesDraft(task.notes ?? "");
  }

  async function saveNotes(task: OffboardingTask) {
    await patchTask(task.id, { notes: notesDraft });
    setEditingNotesId(null);
    toast.success("Notes saved");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={CircleDashed}
        title="Couldn't load offboarding tasks"
        description="Please try again in a moment."
      />
    );
  }

  const dLeft = daysUntilExit(exitDate);

  return (
    <div className="space-y-4">
      {/* Exit summary card */}
      <Card className="border-rose-500/30 shadow-soft bg-gradient-to-br from-rose-50/60 via-amber-50/30 to-card dark:from-rose-950/20 dark:via-amber-950/10">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing percent={stats.percent} />
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="size-4 text-rose-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      Employee Offboarding
                    </span>
                  </div>
                  <div className="text-lg font-semibold mt-1">
                    {stats.completed} of {stats.total} tasks completed
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {exitDate
                      ? `Exit scheduled for ${formatDate(exitDate)}`
                      : "No exit date set yet"}
                    {exitReason && (
                      <span className="ml-2">· {EXIT_REASON_LABEL[exitReason]}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExitEditOpen(true)}
                  >
                    <CalendarDays className="size-4 mr-1.5" />
                    Edit Exit Info
                  </Button>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="size-4 mr-1.5" /> Add Task
                  </Button>
                </div>
              </div>
              <Progress
                value={stats.percent}
                className="h-2.5 [&>div]:bg-rose-500"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <StatPill label="Pending" value={stats.pending} tone="amber" />
                <StatPill
                  label="In Progress"
                  value={stats.inProgress}
                  tone="sky"
                />
                <StatPill
                  label="Completed"
                  value={stats.completed}
                  tone="emerald"
                />
                <StatPill label="Skipped" value={stats.skipped} tone="rose" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {exitReason && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-medium",
                      EXIT_REASON_TONE[exitReason]
                    )}
                  >
                    <AlertTriangle className="size-3" />
                    {EXIT_REASON_LABEL[exitReason]}
                  </span>
                )}
                {dLeft !== null && dLeft > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                    <CalendarX className="size-3" />
                    {dLeft} day{dLeft === 1 ? "" : "s"} until exit
                  </span>
                )}
                {dLeft !== null && dLeft === 0 && (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                    <CalendarX className="size-3" />
                    Exit is today
                  </span>
                )}
                {dLeft !== null && dLeft < 0 && (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                    <CalendarX className="size-3" />
                    Exit date passed {Math.abs(dLeft)}d ago
                  </span>
                )}
                {stats.overdue > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                    <CalendarDays className="size-3" />
                    {stats.overdue} task{stats.overdue > 1 ? "s" : ""} overdue
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {f === "all"
                ? `All (${stats.total})`
                : f === "pending"
                  ? `Pending (${stats.pending + stats.inProgress})`
                  : `Completed (${stats.completed + stats.skipped})`}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No offboarding tasks here"
          description={
            filter === "all"
              ? "Add a custom task to start tracking offboarding progress."
              : "No tasks match this filter."
          }
          actionLabel="Add Task"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const StatusIcon = STATUS_ICON[task.status];
            const overdue = isOverdue(task.dueDate, task.status);
            const isUpdating = updatingId === task.id;
            const isEditingNotes = editingNotesId === task.id;
            return (
              <Card
                key={task.id}
                className={cn(
                  "border-border/60 shadow-soft transition-all",
                  task.status === "COMPLETED" && "opacity-75",
                  task.status === "SKIPPED" && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => cycleStatus(task)}
                      disabled={isUpdating}
                      className="flex-shrink-0 mt-0.5 disabled:opacity-50"
                      aria-label={`Cycle status (currently ${task.status})`}
                      title={`Status: ${task.status.replace(/_/g, " ")} — click to advance`}
                    >
                      <Checkbox
                        checked={task.status === "COMPLETED"}
                        className={cn(
                          "size-5 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
                          task.status === "IN_PROGRESS" &&
                            "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        )}
                      />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-start gap-2 min-w-0">
                          <StatusIcon
                            className={cn(
                              "size-4 mt-0.5 flex-shrink-0",
                              STATUS_COLOR[task.status]
                            )}
                          />
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "text-sm font-medium leading-tight",
                                task.status === "COMPLETED" &&
                                  "line-through text-muted-foreground",
                                task.status === "SKIPPED" &&
                                  "line-through text-muted-foreground"
                              )}
                            >
                              {task.title}
                              {!task.isDefault && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-[10px] py-0 px-1.5 font-normal"
                                >
                                  Custom
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <StatusBadge
                          status={task.status}
                          label={task.status.replace(/_/g, " ")}
                        />
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {task.assignedTo && (
                          <span className="inline-flex items-center gap-1">
                            <UserCog className="size-3" />
                            {task.assignedTo}
                          </span>
                        )}
                        {task.dueDate && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              overdue && "text-rose-600 font-medium"
                            )}
                          >
                            <CalendarDays className="size-3" />
                            Due {formatDate(task.dueDate)}
                            {overdue && " · overdue"}
                          </span>
                        )}
                        {task.completedAt && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="size-3" />
                            Done {formatDate(task.completedAt)}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {isEditingNotes ? (
                        <div className="space-y-2 mt-2">
                          <Textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Add a note about this task…"
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveNotes(task)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <Loader2 className="size-3.5 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="size-3.5 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNotesId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditNotes(task)}
                          className="group flex items-start gap-1.5 text-xs text-left mt-1 max-w-full"
                        >
                          <StickyNote className="size-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                          {task.notes ? (
                            <span className="text-foreground break-words">
                              {task.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1">
                              Add a note
                              <PencilLine className="size-3 opacity-0 group-hover:opacity-100" />
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {task.status !== "SKIPPED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                          onClick={() => skipTask(task)}
                          disabled={isUpdating}
                          title="Skip this task"
                        >
                          <SkipForward className="size-3.5 mr-1" /> Skip
                        </Button>
                      )}
                      {task.status === "SKIPPED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            patchTask(task.id, { status: "PENDING" })
                          }
                          disabled={isUpdating}
                          title="Reopen"
                        >
                          <RotateCcw className="size-3.5 mr-1" /> Reopen
                        </Button>
                      )}
                      {!task.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                          onClick={() => deleteTask(task)}
                          disabled={isUpdating}
                          title="Delete this task"
                        >
                          {isUpdating ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        employeeId={employeeId}
        exitDate={exitDate}
        exitReason={exitReason}
        onSaved={() => qc.invalidateQueries({ queryKey })}
      />

      <ExitInfoDialog
        open={exitEditOpen}
        onOpenChange={setExitEditOpen}
        tasks={tasks}
        onSaved={() => qc.invalidateQueries({ queryKey })}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "emerald" | "rose";
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2",
        tones[tone]
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function AddTaskDialog({
  open,
  onOpenChange,
  employeeId,
  exitDate,
  exitReason,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  exitDate?: string | null;
  exitReason?: ExitReason | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignedTo("");
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        employeeId,
        title: title.trim(),
      };
      if (description.trim()) body.description = description.trim();
      if (dueDate) body.dueDate = dueDate;
      if (assignedTo.trim()) body.assignedTo = assignedTo.trim();

      const r = await fetch("/api/offboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add task");
      }
      toast.success("Task added");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add task");
    } finally {
      setSaving(false);
    }
  }

  // Default the due date to the exit date if known.
  const defaultDue = exitDate ? exitDate.slice(0, 10) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add offboarding task</DialogTitle>
          <DialogDescription>
            Create a custom checklist item for this employee.
            {exitDate && (
              <span className="block mt-1 text-xs">
                Inheriting exit date {formatDate(exitDate)}
                {exitReason ? ` · ${EXIT_REASON_LABEL[exitReason]}` : ""}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule KT handover"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details or instructions"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Due date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder={defaultDue}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Assigned to
              </label>
              <Select
                value={assignedTo || "NONE"}
                onValueChange={(v) =>
                  setAssignedTo(v === "NONE" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">—</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="size-4 mr-1.5" />
            )}
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExitInfoDialog({
  open,
  onOpenChange,
  tasks,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: OffboardingTask[];
  onSaved: () => void;
}) {
  // Pre-fill from first task (or defaults).
  const initialDate = tasks[0]?.exitDate
    ? tasks[0].exitDate!.slice(0, 10)
    : "";
  const initialReason = tasks[0]?.exitReason ?? "RESIGNATION";
  const [exitDate, setExitDate] = useState(initialDate);
  const [exitReason, setExitReason] = useState<ExitReason>(initialReason);
  const [saving, setSaving] = useState(false);

  // Sync state whenever dialog opens (so external edits don't stick).
  const [openSig, setOpenSig] = useState(open);
  if (openSig !== open) {
    setOpenSig(open);
    if (open) {
      setExitDate(initialDate);
      setExitReason(initialReason);
    }
  }

  async function handleSave() {
    if (tasks.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      // Patching the first task broadcasts exit info to all sibling tasks.
      const body: Record<string, unknown> = {
        exitReason,
        exitDate: exitDate ? new Date(exitDate).toISOString() : null,
      };
      const r = await fetch(`/api/offboarding/${tasks[0].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update exit info");
      }
      toast.success("Exit information updated");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update exit info");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit exit information</DialogTitle>
          <DialogDescription>
            Set the planned exit date and reason. This applies to all
            offboarding tasks for this employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Exit date
            </label>
            <Input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Exit reason
            </label>
            <Select
              value={exitReason}
              onValueChange={(v) => setExitReason(v as ExitReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESIGNATION">Resignation</SelectItem>
                <SelectItem value="TERMINATION">Termination</SelectItem>
                <SelectItem value="CONTRACT_END">Contract End</SelectItem>
                <SelectItem value="RETIREMENT">Retirement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle className="size-4 mr-1.5" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
