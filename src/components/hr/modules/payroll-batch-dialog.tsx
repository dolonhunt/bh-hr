"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Search,
  XCircle,
  Users,
  Wallet,
  Layers,
  AlertCircle,
} from "lucide-react";

const STEPS = ["Select Employees", "Select Month", "Create"] as const;

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  officialEmail?: string | null;
  phone?: string | null;
  department?: { id?: string; name?: string | null } | null;
  designation?: { id?: string; name?: string | null } | null;
  role?: { id?: string; name?: string | null } | null;
  photo?: string | null;
  employmentStatus?: string | null;
  basicSalary?: number | null;
  allowances?: number | null;
  deductions?: number | null;
  tax?: number | null;
}

interface BatchPayrollResult {
  created: any[];
  skipped: { employeeId: string; name: string; reason: string }[];
  failed: { employeeId: string; name: string; error: string }[];
  count: number;
  totalRequested: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollBatchDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const [month, setMonth] = useState<string>(currentMonth);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchPayrollResult | null>(null);

  const queryClient = useQueryClient();

  // Reset state when dialog opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedIds(new Set());
      setEmpSearch("");
      setDeptFilter("ALL");
      setMonth(currentMonth);
      setCreating(false);
      setProgress(0);
      setResult(null);
    }
  }, [open, currentMonth]);

  // Load all employees (page size 200 to cover the seed's 20 + future growth).
  const employeesQuery = useQuery<{ items: Employee[] }>({
    queryKey: ["batch-payroll-employees", "pageSize", 200],
    queryFn: async () => {
      const r = await fetch("/api/employees?pageSize=200");
      if (!r.ok) throw new Error("Failed to load employees");
      return r.json();
    },
    enabled: open,
  });

  // Find which of the selected employees already have a payroll row for `month`.
  // The /api/payroll GET endpoint accepts payrollMonth + employeeId filters and
  // returns matching rows — we collect their employeeIds into a Set.
  const skippedPreviewQuery = useQuery<{ items: { employeeId: string }[] }>({
    queryKey: ["batch-payroll-preview", month, Array.from(selectedIds).join(",")],
    queryFn: async () => {
      if (!month || selectedIds.size === 0) return { items: [] };
      const r = await fetch(
        `/api/payroll?payrollMonth=${encodeURIComponent(
          month
        )}&pageSize=500`
      );
      if (!r.ok) throw new Error("Failed to load existing payroll");
      return r.json();
    },
    enabled: open && step === 1 && !!month && selectedIds.size > 0,
  });

  const employees = employeesQuery.data?.items ?? [];

  const departments = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of employees) {
      if (e.department?.id && e.department?.name) {
        if (!map.has(e.department.id)) {
          map.set(e.department.id, {
            id: e.department.id,
            name: e.department.name,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter !== "ALL") {
        if (e.department?.id !== deptFilter) return false;
      }
      if (!q) return true;
      return (
        e.fullName?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.officialEmail?.toLowerCase().includes(q) ||
        e.department?.name?.toLowerCase().includes(q) ||
        e.designation?.name?.toLowerCase().includes(q)
      );
    });
  }, [employees, empSearch, deptFilter]);

  const allVisibleSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedIds.has(e.id));

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const e of filteredEmployees) next.delete(e.id);
      } else {
        for (const e of filteredEmployees) next.add(e.id);
      }
      return next;
    });
  };

  const selectAllByDept = (deptId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const e of employees) {
        if (e.department?.id === deptId) next.add(e.id);
      }
      return next;
    });
  };

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selectedIds.has(e.id)),
    [employees, selectedIds]
  );

  // Employees already in the DB for `month` — these will be skipped on create.
  const existingForMonth = useMemo(() => {
    const list = skippedPreviewQuery.data?.items ?? [];
    return new Set(list.map((r) => r.employeeId));
  }, [skippedPreviewQuery.data]);

  const selectedToCreate = useMemo(
    () => selectedEmployees.filter((e) => !existingForMonth.has(e.id)),
    [selectedEmployees, existingForMonth]
  );
  const selectedAlreadyExist = useMemo(
    () => selectedEmployees.filter((e) => existingForMonth.has(e.id)),
    [selectedEmployees, existingForMonth]
  );

  const monthLabel = useMemo(() => {
    if (!month) return "";
    const [y, m] = month.split("-");
    if (!y || !m) return month;
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [month]);

  const canNext =
    (step === 0 && selectedIds.size > 0) || step === 1;

  const handleCreate = async () => {
    if (selectedToCreate.length === 0) {
      toast.error(
        "All selected employees already have payroll for this month."
      );
      return;
    }
    setCreating(true);
    setProgress(5);

    // Animate progress while we wait for the server.
    let pct = 5;
    const interval = setInterval(() => {
      pct = Math.min(pct + 7, 90);
      setProgress(pct);
    }, 250);

    try {
      const r = await fetch("/api/payroll/batch-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: selectedToCreate.map((e) => e.id),
          month,
        }),
      });
      const data: BatchPayrollResult = await r.json();
      clearInterval(interval);
      setProgress(100);

      if (!r.ok) {
        toast.error(
          (data as any)?.error ?? "Batch payroll creation failed."
        );
        setCreating(false);
        return;
      }
      setResult(data);
      toast.success(
        `Created ${data.created.length} payroll record${
          data.created.length === 1 ? "" : "s"
        }, skipped ${data.skipped.length} existing${
          data.failed.length ? `, ${data.failed.length} failed` : ""
        }.`
      );
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err?.message ?? "Network error during batch creation.");
    } finally {
      setCreating(false);
    }
  };

  const close = () => onOpenChange(false);

  const handleCloseAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payroll"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Batch Payroll Creation
          </DialogTitle>
          <DialogDescription>
            Create DRAFT payroll records for multiple employees at once —
            skips any employee who already has payroll for the chosen month.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div key={label} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="size-4 rounded-full bg-background/30 flex items-center justify-center text-[10px]">
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  {label}
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground mx-1" />
                )}
              </div>
            );
          })}
        </div>

        <ScrollArea className="flex-1 pr-3">
          <div className="min-h-[260px]">
            {/* STEP 0: Select Employees */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, email…"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select
                    value={deptFilter}
                    onValueChange={(v) => setDeptFilter(v)}
                  >
                    <SelectTrigger className="md:w-52">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="batch-select-all"
                      checked={allVisibleSelected}
                      onCheckedChange={toggleAllVisible}
                    />
                    <Label
                      htmlFor="batch-select-all"
                      className="text-sm cursor-pointer"
                    >
                      Select all visible ({filteredEmployees.length})
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1">
                      Quick add:
                    </span>
                    {departments.slice(0, 6).map((d) => (
                      <Button
                        key={d.id}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => selectAllByDept(d.id)}
                      >
                        + {d.name}
                      </Button>
                    ))}
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="size-3 mr-1" />
                    {selectedIds.size} selected
                  </Badge>
                </div>

                <div className="border rounded-lg max-h-[40vh] overflow-y-auto">
                  {employeesQuery.isLoading && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin inline mr-2" />
                      Loading employees…
                    </div>
                  )}
                  {!employeesQuery.isLoading &&
                    filteredEmployees.length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No employees match your filters.
                      </div>
                    )}
                  {filteredEmployees.map((e) => {
                    const checked = selectedIds.has(e.id);
                    return (
                      <label
                        key={e.id}
                        className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-muted/40 ${
                          checked ? "bg-primary/5" : ""
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(e.id)}
                        />
                        <AvatarBadge name={e.fullName} photo={e.photo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {e.fullName}{" "}
                            <span className="text-xs text-muted-foreground">
                              {e.employeeId}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.designation?.name ?? "—"} ·{" "}
                            {e.department?.name ?? "—"}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground hidden md:block truncate max-w-[200px]">
                          {e.officialEmail ?? "—"}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 1: Select Month + Preview */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Payroll Month</Label>
                    <Input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Selected</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                      {selectedIds.size} employee
                      {selectedIds.size === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-primary/5 border-primary/20 p-4 space-y-1">
                  <div className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Wallet className="size-4 text-primary" />
                    Will create payroll records for{" "}
                    <strong className="text-primary">
                      {selectedToCreate.length}
                    </strong>{" "}
                    employee{selectedToCreate.length === 1 ? "" : "s"} for{" "}
                    <strong className="text-primary">{monthLabel}</strong>.
                  </div>
                  {selectedAlreadyExist.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <AlertCircle className="size-3.5 text-amber-500" />
                      {selectedAlreadyExist.length} already have payroll for{" "}
                      {monthLabel} and will be skipped.
                    </div>
                  )}
                </div>

                {/* Skipped list */}
                {selectedAlreadyExist.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                      Already have payroll for {monthLabel} (will skip) —{" "}
                      {selectedAlreadyExist.length}
                    </div>
                    <div className="border border-amber-500/20 rounded-lg max-h-[20vh] overflow-y-auto">
                      {selectedAlreadyExist.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                        >
                          <AvatarBadge
                            name={e.fullName}
                            photo={e.photo}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {e.fullName}{" "}
                              <span className="text-xs text-muted-foreground">
                                {e.employeeId}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-500/30 text-amber-700 bg-amber-500/10"
                          >
                            Exists
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Will-create list */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-primary uppercase tracking-wider">
                    Will create DRAFT payroll — {selectedToCreate.length}
                  </div>
                  <div className="border border-primary/20 rounded-lg max-h-[24vh] overflow-y-auto">
                    {selectedToCreate.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nothing to create — every selected employee already has
                        payroll for {monthLabel}.
                      </div>
                    )}
                    {selectedToCreate.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                      >
                        <AvatarBadge
                          name={e.fullName}
                          photo={e.photo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {e.fullName}{" "}
                            <span className="text-xs text-muted-foreground">
                              {e.employeeId}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.designation?.name ?? "—"} ·{" "}
                            {e.department?.name ?? "—"}
                          </div>
                        </div>
                        <StatusBadge status={e.employmentStatus ?? "ACTIVE"} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Create (progress + results) */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Progress while creating */}
                {creating && (
                  <div className="space-y-4 py-6">
                    <div className="text-center">
                      <Wallet className="size-10 mx-auto text-primary mb-2" />
                      <div className="text-sm font-medium">
                        Creating {selectedToCreate.length} payroll record(s)…
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Each employee gets a DRAFT payroll row for {monthLabel}.
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-center text-xs text-muted-foreground">
                      {progress < 100 ? "Working… please wait" : "Done"}
                    </div>
                  </div>
                )}

                {/* Results */}
                {!creating && result && (
                  <div className="space-y-3">
                    <div
                      className={`rounded-lg p-4 border ${
                        result.failed.length > 0
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-primary/5 border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-primary" />
                        <div className="text-sm font-semibold">
                          Created {result.created.length} of{" "}
                          {result.totalRequested} payroll record(s) for{" "}
                          {monthLabel}.
                        </div>
                      </div>
                      {(result.skipped.length > 0 ||
                        result.failed.length > 0) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.skipped.length} skipped (already existed)
                          {result.failed.length > 0 &&
                            `, ${result.failed.length} failed`}{" "}
                          — see the lists below.
                        </div>
                      )}
                    </div>

                    {/* Summary chips */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {result.created.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Created
                        </div>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {result.skipped.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Skipped
                        </div>
                      </div>
                      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                        <div className="text-2xl font-bold text-rose-600">
                          {result.failed.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Failed
                        </div>
                      </div>
                    </div>

                    {result.created.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Created payroll records ({result.created.length})
                        </div>
                        <div className="border rounded-lg max-h-[24vh] overflow-y-auto">
                          {result.created.map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                            >
                              <AvatarBadge
                                name={p.employee?.fullName}
                                photo={p.employee?.photo}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                  {p.employee?.fullName}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    {p.employee?.employeeId}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {p.employee?.department?.name ?? "—"} · Net{" "}
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "BDT",
                                    maximumFractionDigits: 0,
                                  }).format(p.netSalary ?? 0)}
                                </div>
                              </div>
                              <StatusBadge status={p.status ?? "DRAFT"} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.skipped.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                          Skipped — already had payroll ({result.skipped.length})
                        </div>
                        <div className="border border-amber-500/20 rounded-lg max-h-[18vh] overflow-y-auto">
                          {result.skipped.map((s, i) => (
                            <div
                              key={`${s.employeeId}-${i}`}
                              className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0"
                            >
                              <AlertCircle className="size-4 text-amber-500 flex-shrink-0" />
                              <div className="text-sm flex-1 truncate">
                                {s.name}{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({s.employeeId})
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                                {s.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.failed.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">
                          Failed ({result.failed.length})
                        </div>
                        <div className="border border-rose-500/20 rounded-lg max-h-[18vh] overflow-y-auto">
                          {result.failed.map((f, i) => (
                            <div
                              key={`${f.employeeId}-${i}`}
                              className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0"
                            >
                              <XCircle className="size-4 text-rose-600 flex-shrink-0" />
                              <div className="text-sm flex-1 truncate">
                                {f.name}{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({f.employeeId})
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                                {f.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            {step === 0 && `${selectedIds.size} employee(s) selected`}
            {step === 1 &&
              `Will create ${selectedToCreate.length} · Skip ${selectedAlreadyExist.length}`}
            {step === 2 &&
              creating &&
              "Creating…"}
            {step === 2 &&
              !creating &&
              result &&
              `Done — ${result.created.length} created`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
            {step > 0 && step < 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={creating}
              >
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
            )}
            {step === 0 && (
              <Button
                size="sm"
                onClick={() => setStep(1)}
                disabled={!canNext}
              >
                Next <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}
            {step === 1 && (
              <Button
                size="sm"
                onClick={() => {
                  setStep(2);
                  handleCreate();
                }}
                disabled={
                  creating ||
                  selectedToCreate.length === 0 ||
                  skippedPreviewQuery.isLoading
                }
              >
                <Wallet className="size-4 mr-1.5" /> Create{" "}
                {selectedToCreate.length} Payroll Record
                {selectedToCreate.length === 1 ? "" : "s"}
              </Button>
            )}
            {step === 2 && creating && (
              <Button size="sm" disabled>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Creating…
              </Button>
            )}
            {step === 2 && !creating && result && (
              <Button size="sm" onClick={handleCloseAndRefresh}>
                <Check className="size-4 mr-1.5" /> Go to Payroll
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
