"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Wallet,
  Plus,
  Search,
  MoreVertical,
  FileText,
  Check,
  Pencil,
  Trash2,
  Layers,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { PayslipDialog } from "./payslip-dialog";
import { PayrollBatchDialog } from "./payroll-batch-dialog";
import { ExportButton } from "../shared/export-button";

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

  // KPIs from current page
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
  const totalDeductions = items.reduce(
    (sum: number, p: any) => sum + (p.deductions || 0) + (p.tax || 0),
    0
  );

  function generatePayslip(employeeId?: string) {
    setPresetEmployee(employeeId ?? null);
    setPayslipOpen(true);
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
          label="Deductions + Tax"
          value={formatCurrency(totalDeductions)}
          icon={Wallet}
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
                  <TableHead>Tax</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p: any) => (
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
                    <TableCell className="text-xs tabular-nums">
                      {formatCurrency(p.tax)}
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

      <PayslipDialog
        open={payslipOpen}
        onOpenChange={setPayslipOpen}
        presetEmployeeId={presetEmployee}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["payroll"] });
          qc.invalidateQueries({ queryKey: ["documents"] });
        }}
      />

      <PayrollBatchDialog
        open={batchOpen}
        onOpenChange={(o) => {
          setBatchOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["payroll"] });
        }}
      />
    </div>
  );
}
