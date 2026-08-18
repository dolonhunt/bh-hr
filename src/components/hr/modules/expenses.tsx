"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Receipt,
  Plane,
  UtensilsCrossed,
  Building2,
  Package,
  Bus,
  GraduationCap,
  Box,
  Plus,
  Search,
  Pencil,
  Trash2,
  Send,
  Check,
  X,
  Eye,
  Wallet,
  Clock,
  CalendarDays,
  Banknote,
  Loader2,
  ChevronsUpDown,
  Check as CheckIcon,
  Download,
  AlertTriangle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, formatDate, formatCurrency, downloadBlob } from "@/lib/utils";

// =========================================================
// Constants & types
// =========================================================

type ExpenseType =
  | "TRAVEL"
  | "MEALS"
  | "ACCOMMODATION"
  | "SUPPLIES"
  | "TRANSPORT"
  | "TRAINING"
  | "OTHER";

type ExpenseStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REIMBURSED";

const EXPENSE_TYPE_META: Record<
  ExpenseType,
  { label: string; icon: typeof Plane; color: string }
> = {
  TRAVEL: { label: "Travel", icon: Plane, color: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  MEALS: { label: "Meals", icon: UtensilsCrossed, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  ACCOMMODATION: { label: "Accommodation", icon: Building2, color: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  SUPPLIES: { label: "Supplies", icon: Package, color: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
  TRANSPORT: { label: "Transport", icon: Bus, color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  TRAINING: { label: "Training", icon: GraduationCap, color: "text-primary bg-primary/10 border-primary/20" },
  OTHER: { label: "Other", icon: Box, color: "text-muted-foreground bg-muted/50 border-border" },
};

const ALL_TYPES: ExpenseType[] = [
  "TRAVEL",
  "MEALS",
  "ACCOMMODATION",
  "SUPPLIES",
  "TRANSPORT",
  "TRAINING",
  "OTHER",
];

const EXPENSE_STATUS_COLOR: Record<ExpenseStatus, string> = {
  DRAFT: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  APPROVED: "bg-primary/15 text-primary dark:text-primary/80 border-primary/20",
  REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  REIMBURSED: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
};

interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  type: ExpenseType;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt: string | null;
  status: ExpenseStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  rejectReason: string | null;
  reimbursementDate: string | null;
  paymentRef: string | null;
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

function typeMeta(t: string) {
  return (
    EXPENSE_TYPE_META[t as ExpenseType] ?? EXPENSE_TYPE_META.OTHER
  );
}

// =========================================================
// Hooks
// =========================================================

function useExpenses(filters: {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  search?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.search) params.set("search", filters.search);
      if (filters.employeeId)
        params.set("employeeId", filters.employeeId);
      const r = await fetch(`/api/expenses?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load expenses");
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

// =========================================================
// Main module
// =========================================================

export function ExpensesModule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "reimbursed">("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [rejectExpense, setRejectExpense] = useState<Expense | null>(null);
  const [reimburseExpense, setReimburseExpense] = useState<Expense | null>(null);

  // Tab → status filter mapping.
  const tabStatus: Record<typeof tab, string> = {
    all: "",
    pending: "PENDING",
    approved: "APPROVED",
    reimbursed: "REIMBURSED",
  };

  const { data, isLoading, isError } = useExpenses({
    status: tabStatus[tab],
    type,
    from,
    to,
    search,
  });

  const expenses: Expense[] = data?.items ?? [];

  // KPIs - need ALL expenses (not just tab-filtered) for accurate totals.
  const allQ = useExpenses({});
  const allExpenses: Expense[] = allQ.data?.items ?? [];
  const totalPending = allExpenses.filter((e) => e.status === "PENDING").length;
  const totalApprovedAmount = allExpenses
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + e.amount, 0);
  const totalReimbursedAmount = allExpenses
    .filter((e) => e.status === "REIMBURSED")
    .reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const totalThisMonth = allExpenses
    .filter((e) => new Date(e.date).getTime() >= monthStart)
    .reduce((s, e) => s + e.amount, 0);

  function openCreate() {
    setEditExpense(null);
    setFormOpen(true);
  }
  function openEdit(e: Expense) {
    setEditExpense(e);
    setFormOpen(true);
  }
  async function deleteExpense(e: Expense) {
    if (!confirm(`Permanently delete this ${e.type.toLowerCase()} expense?`)) return;
    try {
      const r = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete expense");
      }
      toast.success("Expense deleted.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete expense.");
    }
  }
  async function submitExpense(e: Expense) {
    try {
      const r = await fetch(`/api/expenses/${e.id}/submit`, { method: "POST" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to submit expense");
      }
      toast.success("Expense submitted for approval.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit expense.");
    }
  }
  async function approveExpense(e: Expense) {
    try {
      const r = await fetch(`/api/expenses/${e.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to approve expense");
      }
      toast.success("Expense approved.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve expense.");
    }
  }

  function exportCSV() {
    if (expenses.length === 0) {
      toast.error("No expenses to export.");
      return;
    }
    const headers = [
      "Employee",
      "Type",
      "Description",
      "Amount",
      "Currency",
      "Date",
      "Status",
      "Submitted At",
      "Approved By",
      "Approved At",
      "Reimbursed At",
      "Payment Ref",
      "Notes",
      "Reject Reason",
    ];
    const rows = expenses.map((e) => [
      e.employeeName,
      e.type,
      e.description,
      e.amount,
      e.currency,
      formatDate(e.date),
      e.status,
      e.submittedAt ? formatDate(e.submittedAt, "datetime") : "",
      e.approvedBy ?? "",
      e.approvedAt ? formatDate(e.approvedAt, "datetime") : "",
      e.reimbursementDate ? formatDate(e.reimbursementDate) : "",
      e.paymentRef ?? "",
      e.notes ?? "",
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
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success(`Exported ${expenses.length} expense(s).`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        description="Track and approve employee expenses"
        icon={<Receipt className="size-5" />}
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
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Pending"
          value={totalPending}
          icon={Clock}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={<span className="text-muted-foreground">Awaiting approval</span>}
        />
        <KpiCard
          label="Approved Amount"
          value={formatCurrency(totalApprovedAmount)}
          icon={Check}
          iconClass="bg-primary/15 text-primary"
          footer={<span className="text-muted-foreground">Awaiting reimbursement</span>}
        />
        <KpiCard
          label="Reimbursed"
          value={formatCurrency(totalReimbursedAmount)}
          icon={Wallet}
          iconClass="bg-teal-500/15 text-teal-600"
          footer={<span className="text-muted-foreground">Paid out</span>}
        />
        <KpiCard
          label="This Month"
          value={formatCurrency(totalThisMonth)}
          icon={CalendarDays}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">All expenses</span>}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="reimbursed">Reimbursed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, employee, or type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={type || "ALL"}
              onValueChange={(v) => setType(v === "ALL" ? "" : v)}
            >
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EXPENSE_TYPE_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="md:w-40"
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="md:w-40"
              aria-label="To date"
            />
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
                    {expenses.length}
                  </span>{" "}
                  expense{expenses.length === 1 ? "" : "s"}
                  {(type || from || to || search) && " (filtered)"}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <ExpensesSkeleton />
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load expenses"
              description="Please try again. If the problem persists, check the dev server."
              actionLabel="Retry"
              onAction={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={
                search || type || from || to
                  ? "No matching expenses"
                  : "No expenses yet"
              }
              description={
                search || type || from || to
                  ? "Try adjusting your filters."
                  : "Add an expense to start tracking."
              }
              actionLabel="Add Expense"
              onAction={openCreate}
            />
          ) : (
            <ExpensesTable
              expenses={expenses}
              onEdit={openEdit}
              onDelete={deleteExpense}
              onSubmit={submitExpense}
              onApprove={approveExpense}
              onReject={(e) => setRejectExpense(e)}
              onReimburse={(e) => setReimburseExpense(e)}
              onView={(e) => setViewExpense(e)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditExpense(null);
        }}
        expense={editExpense}
        onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
      />

      {/* View dialog */}
      <ExpenseViewDialog
        expense={viewExpense}
        onClose={() => setViewExpense(null)}
      />

      {/* Reject dialog */}
      <RejectDialog
        expense={rejectExpense}
        onClose={() => setRejectExpense(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
      />

      {/* Reimburse dialog */}
      <ReimburseDialog
        expense={reimburseExpense}
        onClose={() => setReimburseExpense(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
      />
    </div>
  );
}

// =========================================================
// Skeleton
// =========================================================

function ExpensesSkeleton() {
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

function ExpensesTable({
  expenses,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onReimburse,
  onView,
}: {
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onSubmit: (e: Expense) => void;
  onApprove: (e: Expense) => void;
  onReject: (e: Expense) => void;
  onReimburse: (e: Expense) => void;
  onView: (e: Expense) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden border-border/60">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => {
              const meta = typeMeta(e.type);
              const Icon = meta.icon;
              return (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarBadge
                        name={e.employeeName}
                        photo={e.employeePhoto}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {e.employeeName}
                        </div>
                        {e.receipt && (
                          <a
                            href={e.receipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            <Box className="size-2.5" />
                            Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 font-medium text-[11px] capitalize",
                        meta.color
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm truncate" title={e.description}>
                        {e.description}
                      </p>
                      {e.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {e.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrency(e.amount, e.currency)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(e.date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-medium capitalize",
                        EXPENSE_STATUS_COLOR[e.status]
                      )}
                    >
                      {e.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ExpenseActions
                      expense={e}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onSubmit={onSubmit}
                      onApprove={onApprove}
                      onReject={onReject}
                      onReimburse={onReimburse}
                      onView={onView}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function ExpenseActions({
  expense,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onReimburse,
  onView,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onSubmit: (e: Expense) => void;
  onApprove: (e: Expense) => void;
  onReject: (e: Expense) => void;
  onReimburse: (e: Expense) => void;
  onView: (e: Expense) => void;
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
      {expense.status === "DRAFT" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(expense)}
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={busy === "submit"}
            onClick={() => run("submit", () => onSubmit(expense))}
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
            onClick={() => onDelete(expense)}
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </>
      )}
      {expense.status === "PENDING" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            disabled={busy === "approve"}
            onClick={() => run("approve", () => onApprove(expense))}
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
            onClick={() => onReject(expense)}
          >
            <X className="size-3.5" />
            <span className="hidden md:inline">Reject</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onView(expense)}
            aria-label="View"
          >
            <Eye className="size-3.5" />
          </Button>
        </>
      )}
      {expense.status === "APPROVED" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-teal-700 border-teal-500/30 hover:bg-teal-500/10"
            onClick={() => onReimburse(expense)}
          >
            <Banknote className="size-3.5" />
            <span className="hidden md:inline">Reimburse</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onView(expense)}
            aria-label="View"
          >
            <Eye className="size-3.5" />
          </Button>
        </>
      )}
      {expense.status === "REIMBURSED" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onView(expense)}
          aria-label="View"
        >
          <Eye className="size-3.5" />
        </Button>
      )}
      {expense.status === "REJECTED" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onView(expense)}
          aria-label="View"
        >
          <Eye className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

// =========================================================
// Employee search select
// =========================================================

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
// Form dialog (create / edit)
// =========================================================

function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expense: Expense | null;
  onSaved: () => void;
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
  const [type, setType] = useState<ExpenseType>("TRAVEL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when opened/edited
  const resetKey = `${open}-${expense?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    if (expense) {
      setEmployeeId(expense.employeeId);
      setType(expense.type);
      setDescription(expense.description);
      setAmount(String(expense.amount));
      setCurrency(expense.currency);
      setDate(expense.date.slice(0, 10));
      setReceipt(expense.receipt ?? "");
      setNotes(expense.notes ?? "");
    } else {
      setEmployeeId("");
      setType("TRAVEL");
      setDescription("");
      setAmount("");
      setCurrency("BDT");
      setDate(new Date().toISOString().slice(0, 10));
      setReceipt("");
      setNotes("");
    }
  }

  async function submit() {
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        employeeId,
        type,
        description: description.trim(),
        amount: amt,
        currency,
        date,
        receipt: receipt.trim() || null,
        notes: notes.trim() || null,
      };
      const r = expense
        ? await fetch(`/api/expenses/${expense.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to save expense");
      }
      toast.success(expense ? "Expense updated." : "Expense created.");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            {expense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription>
            {expense
              ? "Update the expense details. Status remains DRAFT."
              : "Create a new expense entry. Status will be DRAFT until submitted."}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as ExpenseType)}>
                <SelectTrigger id="exp-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EXPENSE_TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date *</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description *</Label>
            <Textarea
              id="exp-desc"
              placeholder="e.g. Client dinner meeting at Hotel Westin"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="exp-amount">Amount *</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="exp-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BDT">BDT ৳</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="GBP">GBP £</SelectItem>
                  <SelectItem value="INR">INR ₹</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-receipt">Receipt URL (optional)</Label>
            <Input
              id="exp-receipt"
              type="url"
              placeholder="https://…"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">Notes (optional)</Label>
            <Textarea
              id="exp-notes"
              placeholder="Additional context for the approver…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
            {expense ? "Save Changes" : "Create Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// View dialog
// =========================================================

function ExpenseViewDialog({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  if (!expense) return null;
  const meta = typeMeta(expense.type);
  const Icon = meta.icon;

  return (
    <Dialog
      open={!!expense}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            Expense Details
          </DialogTitle>
          <DialogDescription>
            Submitted by {expense.employeeName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("gap-1 font-medium capitalize", meta.color)}
            >
              <Icon className="size-3" />
              {meta.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-medium capitalize",
                EXPENSE_STATUS_COLOR[expense.status]
              )}
            >
              {expense.status.toLowerCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Employee">
              <div className="flex items-center gap-2">
                <AvatarBadge
                  name={expense.employeeName}
                  photo={expense.employeePhoto}
                  size="sm"
                />
                <span className="font-medium">{expense.employeeName}</span>
              </div>
            </Field>
            <Field label="Date">
              <span>{formatDate(expense.date)}</span>
            </Field>
            <Field label="Amount">
              <span className="font-semibold text-lg tabular-nums">
                {formatCurrency(expense.amount, expense.currency)}
              </span>
            </Field>
            <Field label="Currency">
              <span>{expense.currency}</span>
            </Field>
            <Field label="Submitted At" full>
              <span>
                {expense.submittedAt
                  ? formatDate(expense.submittedAt, "datetime")
                  : "—"}
              </span>
            </Field>
            <Field label="Approved By">
              <span>{expense.approvedBy ?? "—"}</span>
            </Field>
            <Field label="Approved At">
              <span>
                {expense.approvedAt
                  ? formatDate(expense.approvedAt, "datetime")
                  : "—"}
              </span>
            </Field>
            {expense.reimbursementDate && (
              <Field label="Reimbursed At">
                <span>{formatDate(expense.reimbursementDate, "datetime")}</span>
              </Field>
            )}
            {expense.paymentRef && (
              <Field label="Payment Ref">
                <span className="font-mono text-xs">{expense.paymentRef}</span>
              </Field>
            )}
          </div>

          <Field label="Description" full>
            <p className="text-sm">{expense.description}</p>
          </Field>

          {expense.notes && (
            <Field label="Notes" full>
              <p className="text-sm text-muted-foreground">{expense.notes}</p>
            </Field>
          )}

          {expense.rejectReason && (
            <Field label="Reject Reason" full>
              <p className="text-sm text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                {expense.rejectReason}
              </p>
            </Field>
          )}

          {expense.receipt && (
            <a
              href={expense.receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Box className="size-4" />
              View receipt
            </a>
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

function Field({
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
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) setReason("");
  }, [expense]);

  async function submit() {
    if (!expense) return;
    if (!reason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/expenses/${expense.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to reject expense");
      }
      toast.success("Expense rejected.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!expense}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="size-5 text-rose-600" />
            Reject Expense
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this {expense?.type.toLowerCase()} expense from{" "}
            {expense?.employeeName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason *</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Receipt missing, amount exceeds policy limit…"
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
            Reject Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Reimburse dialog
// =========================================================

function ReimburseDialog({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentRef, setPaymentRef] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentRef("");
    }
  }, [expense]);

  async function submit() {
    if (!expense) return;
    setSaving(true);
    try {
      const body: any = { reimbursementDate: date };
      if (paymentRef.trim()) body.paymentRef = paymentRef.trim();
      const r = await fetch(`/api/expenses/${expense.id}/reimburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to reimburse expense");
      }
      toast.success("Expense marked as reimbursed.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reimburse expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!expense}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-teal-600" />
            Mark Reimbursed
          </DialogTitle>
          <DialogDescription>
            Record reimbursement details for {expense?.employeeName}'s{" "}
            {expense?.type.toLowerCase()} expense (
            {expense ? formatCurrency(expense.amount, expense.currency) : ""}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reimb-date">Reimbursement Date</Label>
            <Input
              id="reimb-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reimb-ref">Payment Reference (optional)</Label>
            <Input
              id="reimb-ref"
              placeholder="e.g. NEFT-2024-001234"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
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
            onClick={submit}
            disabled={saving}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Banknote className="size-4" />
            Mark Reimbursed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
