"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Network,
  MoreVertical,
  Eye,
  Pencil,
  FileText,
  Mail,
  Briefcase,
  Building2,
  UserCheck,
  FileDown,
  Loader2,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeProfile } from "./employee-profile";
import { OrgChart } from "./org-chart";
import { ExportButton } from "../shared/export-button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function EmployeesModule() {
  const employeeView = useApp((s) => s.employeeView);
  const selectedEmployeeId = useApp((s) => s.selectedEmployeeId);

  if (employeeView === "profile" && selectedEmployeeId) {
    return <EmployeeProfile id={selectedEmployeeId} />;
  }

  return <EmployeeList />;
}

function EmployeeList() {
  const setEmployeeView = useApp((s) => s.setEmployeeView);
  const openEmployee = useApp((s) => s.openEmployee);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const qc = useQueryClient();

  const [view, setView] = useState<"list" | "grid" | "org">("list");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editEmp, setEditEmp] = useState<{ id: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadDirectoryPdf() {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      const url = `/api/employees/directory-pdf?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate directory PDF");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `employee-directory-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Employee directory PDF downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate directory PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () =>
      fetch("/api/departments").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, departmentId, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "24");
      const r = await fetch(`/api/employees?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function editEmployee(id: string) {
    setEditEmp({ id });
    setFormOpen(true);
  }

  function addNew() {
    setEditEmp(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your organization's employee directory"
        icon={<Users className="size-5" />}
        actions={
          <>
            <ExportButton
              module="employees"
              filters={{ search, departmentId, status }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDirectoryPdf}
              disabled={pdfLoading}
              className="gap-1.5"
            >
              {pdfLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              <span className="hidden sm:inline">
                {pdfLoading ? "Generating…" : "Directory PDF"}
              </span>
              <span className="sm:hidden">
                {pdfLoading ? "…" : "PDF"}
              </span>
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("list")}
                aria-label="List view"
                title="List view"
              >
                <ListIcon className="size-4" />
              </button>
              <button
                className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("grid")}
                aria-label="Grid view"
                title="Grid view"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                className={`p-2 ${view === "org" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setView("org")}
                aria-label="Org chart view"
                title="Org chart view"
              >
                <Network className="size-4" />
              </button>
            </div>
            <Button size="sm" onClick={addNew}>
              <Plus className="size-4 mr-1.5" /> <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {/* Filters */}
      {view !== "org" && (
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, email, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
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
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              <SelectItem value="PROBATION">Probation</SelectItem>
              <SelectItem value="RESIGNED">Resigned</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Result count */}
      {view !== "org" && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{employees.length}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> employees
          </div>
        </div>
      )}

      {/* Empty */}
      {view !== "org" && !isLoading && employees.length === 0 && (
        <EmptyState
          icon={Users}
          title="No employees found"
          description={
            search || departmentId || status
              ? "Try adjusting your filters."
              : "Add your first employee to start managing HR records."
          }
          actionLabel="Add Employee"
          onAction={addNew}
        />
      )}

      {/* Loading */}
      {view !== "org" && isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Org Chart view */}
      {view === "org" && <OrgChart />}

      {/* List view */}
      {!isLoading && view === "list" && employees.length > 0 && (
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[200px]">Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Employee ID</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Designation</TableHead>
                  <TableHead className="hidden md:table-cell">Joining Date</TableHead>
                  <TableHead className="hidden md:table-cell">Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => openEmployee(emp.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarBadge
                          name={emp.fullName}
                          photo={emp.photo}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {emp.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {emp.officialEmail}
                          </div>
                          <div className="md:hidden text-[11px] text-muted-foreground font-mono mt-0.5">
                            {emp.employeeId} · {emp.department?.name ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs hidden md:table-cell">
                      {emp.employeeId}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: emp.department?.color ?? "#94a3b8" }}
                        />
                        {emp.department?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{emp.designation?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs hidden md:table-cell">
                      {formatDate(emp.joiningDate)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums hidden md:table-cell">
                      {formatCurrency(emp.basicSalary)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={emp.employmentStatus} />
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
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEmployee(emp.id)}>
                            <Eye className="size-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editEmployee(emp.id)}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              openEmployee(emp.id);
                              setTimeout(
                                () => setQuickAction("generate-document"),
                                200
                              );
                            }}
                          >
                            <FileText className="size-4 mr-2" /> Generate Document
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              openEmployee(emp.id);
                              setTimeout(() => setQuickAction("create-payslip"), 200);
                            }}
                          >
                            <Mail className="size-4 mr-2" /> Send Document
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

      {/* Grid view */}
      {!isLoading && view === "grid" && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp: any) => (
            <Card
              key={emp.id}
              className="border-border/60 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
              onClick={() => openEmployee(emp.id)}
            >
              <div
                className="h-1.5"
                style={{ background: emp.department?.color ?? "#10b981" }}
              />
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AvatarBadge
                    name={emp.fullName}
                    photo={emp.photo}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{emp.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {emp.employeeId}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={emp.employmentStatus} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5" /> Department
                    </span>
                    <span className="font-medium truncate ml-2">
                      {emp.department?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="size-3.5" /> Designation
                    </span>
                    <span className="font-medium truncate ml-2">
                      {emp.designation?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="size-3.5" /> Joined
                    </span>
                    <span className="font-medium">
                      {formatDate(emp.joiningDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {view !== "org" && !isLoading && totalPages > 1 && (
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

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editEmp}
        onSaved={() => qc.invalidateQueries({ queryKey: ["employees"] })}
      />
    </div>
  );
}
