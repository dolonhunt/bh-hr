"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  Search,
  MoreVertical,
  FileText,
  Check,
  Pencil,
  Trash2,
  Layers,
  Calculator,
  TrendingDown,
  Save,
  Loader2,
  RotateCcw,
  Landmark,
  FileSpreadsheet,
  Send,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { PayslipDialog } from "./payslip-dialog";
import { EmailPayslipDialog } from "./email-payslip-dialog";
import { PayrollBatchDialog } from "./payroll-batch-dialog";
import { ExportButton } from "../shared/export-button";

// =========================================================
// Tax Slab types
// =========================================================

interface TaxSlab {
  id: string;
  min: number;
  max: number | null;
  rate: number;
  label: string;
}

interface PayrollBreakdown {
  tds: number;
  taxSlab: { id: string; label: string; rate: number } | null;
}

// =========================================================
// Main module
// =========================================================

export function PayrollModule() {
  const qc = useQueryClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [payslipOpen, setPayslipOpen] = useState(false);
  const [presetEmployee, setPresetEmployee] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [taxConfigOpen, setTaxConfigOpen] = useState(false);
  const [bankFileLoading, setBankFileLoading] = useState<"" | "csv" | "nacha">("");

  // Email Payslip dialog state — pre-fills with the row's employee+month
  // and only opens for PAID payroll records.
  const [emailPayslipOpen, setEmailPayslipOpen] = useState(false);
  const [emailPayslipEmployeeId, setEmailPayslipEmployeeId] = useState<string>("");
  const [emailPayslipMonth, setEmailPayslipMonth] = useState<string>("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["payroll", month, status, departmentId, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.set("payrollMonth", month);
      if (status) params.set("status", status);
      if (departmentId) params.set("departmentId", departmentId);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/payroll?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Parallel-fetch calculated payroll breakdown for each visible payroll row
  // (so we can show the actual progressive-tax TDS, not just the stored `tax` field).
  const tdsQueries = useQueries({
    queries: items.map((p: any) => ({
      queryKey: ["payroll-calc", p.employeeId, p.payrollMonth],
      queryFn: async () => {
        const r = await fetch("/api/payroll/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: p.employeeId, month: p.payrollMonth }),
        });
        if (!r.ok) return null;
        const json = await r.json();
        return json as PayrollBreakdown;
      },
      staleTime: 60 * 1000, // 1 min
    })),
  });

  // Map employeeId+month -> calculated breakdown
  const tdsByEmp: Record<string, PayrollBreakdown | null> = {};
  items.forEach((p: any, i: number) => {
    const q = tdsQueries[i];
    tdsByEmp[`${p.employeeId}:${p.payrollMonth}`] = q?.isSuccess
      ? (q.data as PayrollBreakdown | null)
      : null;
  });

  // KPIs from current page (use calculated TDS when available)
  const totalNet = items.reduce(
    (sum: number, p: any) => sum + (p.netSalary || 0),
    0
  );
  const totalBasic = items.reduce(
    (sum: number, p: any) => sum + (p.basicSalary || 0),
    0
  );
  const totalAllowances = items.reduce(
    (sum: number, p: any) => sum + (p.allowances || 0),
    0
  );
  const totalDeductions = items.reduce((sum: number, p: any) => {
    const calc = tdsByEmp[`${p.employeeId}:${p.payrollMonth}`];
    const tds = calc?.tds ?? p.tax ?? 0;
    return sum + (p.deductions || 0) + tds;
  }, 0);

  function generatePayslip(employeeId?: string) {
    setPresetEmployee(employeeId ?? null);
    setPayslipOpen(true);
  }

  function emailPayslip(employeeId: string, month: string) {
    setEmailPayslipEmployeeId(employeeId);
    setEmailPayslipMonth(month);
    setEmailPayslipOpen(true);
  }

  async function downloadBankFile(format: "csv" | "nacha") {
    if (!month) {
      toast.error("Select a payroll month first.");
      return;
    }
    setBankFileLoading(format);
    try {
      const r = await fetch(
        `/api/payroll/bank-file?month=${encodeURIComponent(month)}&format=${format}`
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate bank file");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";\n]+)"?/i);
      a.download = match
        ? match[1]
        : `bank-transfer-${month}.${format === "csv" ? "csv" : "nacha"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const count = r.headers.get("X-Employee-Count");
      const n = count ? parseInt(count, 10) : 0;
      toast.success(
        n > 0
          ? `Bank file generated for ${n} employee${n === 1 ? "" : "s"}.`
          : "Bank file generated."
      );
    } catch (err: any) {
      toast.error(err?.message || "Bank file generation failed");
    } finally {
      setBankFileLoading("");
    }
  }

  async function approve(p: any) {
    try {
      const r = await fetch(`/api/payroll/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          paymentDate: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw new Error("Failed to approve");
      toast.success(`Payroll approved for ${p.employee?.fullName}.`);
      qc.invalidateQueries({ queryKey: ["payroll"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  }

  async function deleteFn(id: string) {
    if (!confirm("Delete this payroll record?")) return;
    try {
      const r = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      toast.success("Payroll record deleted.");
      qc.invalidateQueries({ queryKey: ["payroll"] });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Manage monthly salary disbursements and payslips"
        icon={<Wallet className="size-5" />}
        actions={
          <>
            <ExportButton
              module="payroll"
              filters={{
                payrollMonth: month,
                status,
                departmentId,
                search,
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bankFileLoading !== ""}
                  title="Download bank transfer file for direct deposit"
                >
                  {bankFileLoading !== "" ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Landmark className="size-4 mr-1.5" />
                  )}
                  <span className="hidden sm:inline">
                    {bankFileLoading !== ""
                      ? bankFileLoading === "csv"
                        ? "Generating CSV…"
                        : "Generating NACHA…"
                      : "Bank File"}
                  </span>
                  <span className="sm:hidden">
                    {bankFileLoading !== "" ? "…" : "Bank"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => downloadBankFile("csv")}
                  disabled={bankFileLoading !== ""}
                >
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">CSV Format</div>
                    <div className="text-[10px] text-muted-foreground">
                      Standard bank transfer CSV
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => downloadBankFile("nacha")}
                  disabled={bankFileLoading !== ""}
                >
                  <Landmark className="size-4 text-teal-600" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">NACHA Format</div>
                    <div className="text-[10px] text-muted-foreground">
                      US fixed-width (94-char)
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTaxConfigOpen(true)}
              title="View & edit progressive tax slab configuration"
            >
              <Calculator className="size-4 mr-1.5" />
              <span className="hidden sm:inline">Tax Configuration</span>
              <span className="sm:hidden">Tax</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchOpen(true)}
            >
              <Layers className="size-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Batch Create</span>
              <span className="sm:hidden">Batch</span>
            </Button>
            <Button size="sm" onClick={() => generatePayslip()}>
              <Plus className="size-4 mr-1.5" /> <span className="hidden sm:inline">Create Payroll</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Net Payroll"
          value={formatCurrency(totalNet)}
          icon={Wallet}
          iconClass="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Basic Salary"
          value={formatCurrency(totalBasic)}
          icon={Wallet}
          iconClass="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Allowances"
          value={formatCurrency(totalAllowances)}
          icon={Wallet}
          iconClass="bg-teal-500/10 text-teal-600"
        />
        <KpiCard
          label="Deductions + TDS"
          value={formatCurrency(totalDeductions)}
          icon={TrendingDown}
          iconClass="bg-rose-500/10 text-rose-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
          className="md:w-44"
        />
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
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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
        Showing <span className="font-medium text-foreground">{items.length}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> records
      </div>

      {/* Loading */}
      {isLoading && (
        <Card className="border-border/60 shadow-soft p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No payroll records"
          description={
            month || status || departmentId || search
              ? "No records match the current filters."
              : "Generate the first payslip to get started."
          }
          actionLabel="Create Payroll"
          onAction={() => generatePayslip()}
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
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>TDS (calculated)</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p: any, idx: number) => {
                  const calc = tdsByEmp[`${p.employeeId}:${p.payrollMonth}`];
                  const tdsQuery = tdsQueries[idx];
                  const tdsLoading = tdsQuery?.isLoading;
                  const tdsValue = calc?.tds ?? null;
                  const tdsSlab = calc?.taxSlab;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarBadge
                            name={p.employee?.fullName}
                            photo={p.employee?.photo}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {p.employee?.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {p.employee?.employeeId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const [y, m] = (p.payrollMonth || "").split("-");
                          if (!y || !m) return p.payrollMonth;
                          const d = new Date(Number(y), Number(m) - 1, 1);
                          return d.toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          });
                        })()}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {formatCurrency(p.basicSalary)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {formatCurrency(p.allowances)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {formatCurrency(p.deductions)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {tdsLoading ? (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 className="size-3 animate-spin" />
                              <span>calculating…</span>
                            </div>
                          ) : tdsValue !== null ? (
                            <>
                              <span className="text-xs tabular-nums font-medium text-rose-600">
                                {formatCurrency(tdsValue)}
                              </span>
                              {tdsSlab && (
                                <span
                                  className="text-[10px] text-muted-foreground font-mono"
                                  title={`Tax slab: ${tdsSlab.label}`}
                                >
                                  @ {Math.round(tdsSlab.rate * 100)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(p.tax)}
                              <span className="text-[10px] ml-1 text-muted-foreground/70">
                                (stored)
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums font-semibold">
                        {formatCurrency(p.netSalary)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(p.paymentDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => generatePayslip(p.employeeId)}
                            >
                              <FileText className="size-4 mr-2" /> Generate Payslip
                            </DropdownMenuItem>
                            {p.status === "PAID" && (
                              <DropdownMenuItem
                                onClick={() => emailPayslip(p.employeeId, p.payrollMonth)}
                                className="text-emerald-700 focus:text-emerald-700"
                              >
                                <Send className="size-4 mr-2" /> Email Payslip
                              </DropdownMenuItem>
                            )}
                            {p.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => approve(p)}>
                                <Check className="size-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600"
                              onClick={() => deleteFn(p.id)}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <PayslipDialog
        open={payslipOpen}
        onOpenChange={setPayslipOpen}
        presetEmployeeId={presetEmployee}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["payroll"] });
          qc.invalidateQueries({ queryKey: ["documents"] });
        }}
      />

      <EmailPayslipDialog
        open={emailPayslipOpen}
        onOpenChange={setEmailPayslipOpen}
        employeeId={emailPayslipEmployeeId}
        month={emailPayslipMonth}
        onSent={() => {
          qc.invalidateQueries({ queryKey: ["payroll"] });
          qc.invalidateQueries({ queryKey: ["email-logs"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      <PayrollBatchDialog
        open={batchOpen}
        onOpenChange={(o) => {
          setBatchOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["payroll"] });
        }}
      />

      <TaxConfigDialog
        open={taxConfigOpen}
        onOpenChange={setTaxConfigOpen}
        onSaved={() => {
          // Invalidate payroll-calc queries so the TDS column refreshes
          qc.invalidateQueries({ queryKey: ["payroll-calc"] });
          qc.invalidateQueries({ queryKey: ["tax-slabs"] });
        }}
      />
    </div>
  );
}

// =========================================================
// Tax Configuration Dialog
// =========================================================

function TaxConfigDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<TaxSlab[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tax-slabs"],
    queryFn: () => fetch("/api/payroll/tax-slabs").then((r) => r.json()),
    enabled: open,
  });

  // Sync draft with fetched data — only when fresh data arrives and the
  // draft is empty (i.e. dialog just opened or first load).
  useEffect(() => {
    if (open && data?.slabs && draft.length === 0 && !dirty) {
      setDraft(data.slabs);
    }
  }, [open, data, draft.length, dirty]);

  function close() {
    onOpenChange(false);
    setDraft([]);
    setDirty(false);
  }

  function updateSlab(idx: number, patch: Partial<TaxSlab>) {
    setDraft((prev) => {
      const next = prev.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return next;
    });
    setDirty(true);
  }

  function addSlab() {
    const lastMax = draft.reduce((m, s) => Math.max(m, s.max ?? 0), 0);
    setDraft((prev) => [
      ...prev,
      {
        id: `slab-${Date.now()}`,
        min: lastMax,
        max: lastMax + 300000,
        rate: 0.1,
        label: `${lastMax.toLocaleString()} - ${(lastMax + 300000).toLocaleString()}`,
      },
    ]);
    setDirty(true);
  }

  function removeSlab(idx: number) {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function resetDefaults() {
    if (!data?.defaults) return;
    setDraft(data.defaults);
    setDirty(true);
    toast.info("Reset to default tax slabs. Save to persist.");
  }

  async function save() {
    setSaving(true);
    try {
      // Validate locally: each slab must have min, max (or null), rate
      const slabs = draft.map((s, idx) => {
        const min = Number(s.min);
        const max =
          s.max === null || s.max === undefined
            ? null
            : Number(s.max);
        const rate = Number(s.rate);
        if (!Number.isFinite(min) || min < 0) {
          throw new Error(`Slab #${idx + 1}: min must be a non-negative number`);
        }
        if (max !== null && (!Number.isFinite(max) || max <= min)) {
          throw new Error(`Slab #${idx + 1}: max must be null or > min`);
        }
        if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
          throw new Error(`Slab #${idx + 1}: rate must be between 0 and 1`);
        }
        return {
          id: String(s.id || `slab-${idx + 1}`),
          min,
          max,
          rate,
          label: String(s.label || "").trim() ||
            (max === null ? `Above ${min.toLocaleString()}` : `${min.toLocaleString()} - ${max.toLocaleString()}`),
        };
      });

      const r = await fetch("/api/payroll/tax-slabs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slabs }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save tax slabs");
      }
      toast.success("Tax slabs updated.");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["tax-slabs"] });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            Tax Slab Configuration
          </DialogTitle>
          <DialogDescription>
            Progressive tax slabs used to compute TDS (Tax Deducted at Source)
            for payroll. Annual income is taxed slab-by-slab, then divided by 12
            for the monthly TDS deduction.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading tax slabs…</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800 flex items-start gap-2">
                <Calculator className="size-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">How TDS is calculated</div>
                  <div className="mt-0.5 text-emerald-700/80">
                    Monthly gross × 12 = annual income. Each slab applies its rate
                    to the portion of income within that slab's range. Total annual
                    tax ÷ 12 = monthly TDS deduction.
                  </div>
                </div>
              </div>

              {/* Slab table */}
              <div className="rounded-md border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-4">Label</div>
                  <div className="col-span-3">Min (annual)</div>
                  <div className="col-span-3">Max (annual, blank = ∞)</div>
                  <div className="col-span-1">Rate</div>
                  <div className="col-span-1 text-right">—</div>
                </div>
                <div className="divide-y divide-border">
                  {draft.map((s, idx) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-muted/20"
                    >
                      <div className="col-span-4">
                        <Input
                          value={s.label}
                          onChange={(e) => updateSlab(idx, { label: e.target.value })}
                          className="h-8 text-xs"
                          placeholder="Slab label"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          value={s.min}
                          onChange={(e) => updateSlab(idx, { min: Number(e.target.value) })}
                          className="h-8 text-xs tabular-nums"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          value={s.max ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateSlab(idx, {
                              max: v === "" ? null : Number(v),
                            });
                          }}
                          className="h-8 text-xs tabular-nums"
                          placeholder="∞ (no upper bound)"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={s.rate}
                          onChange={(e) => updateSlab(idx, { rate: Number(e.target.value) })}
                          className="h-8 text-xs tabular-nums"
                          title="Tax rate as a decimal (0 = 0%, 0.05 = 5%, 0.25 = 25%)"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => removeSlab(idx)}
                          title="Remove slab"
                          disabled={draft.length <= 1}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {draft.length} slab{draft.length === 1 ? "" : "s"} configured
                  {dirty && <span className="text-amber-600 ml-1">· unsaved changes</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetDefaults}
                    title="Reset to default slabs"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" />
                    Reset Defaults
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addSlab}
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    Add Slab
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !dirty || isLoading}>
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Save Tax Slabs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
