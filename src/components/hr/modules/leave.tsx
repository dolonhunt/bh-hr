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
} from "lucide-react";
import { formatDate, relativeTime } from "@/lib/utils";
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

export function LeaveModule() {
  const qc = useQueryClient();
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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // KPIs computed from current page items (good enough for MVP)
  const allForKpi = items;
  const pendingCount = allForKpi.filter((l: any) => l.status === "PENDING").length;
  const approvedCount = allForKpi.filter((l: any) => l.status === "APPROVED").length;
  const rejectedCount = allForKpi.filter((l: any) => l.status === "REJECTED").length;

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
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setDeciding(false);
    }
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
              <Plus className="size-4 mr-1.5" /> <span className="hidden sm:inline">Add Leave</span>
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
          iconClass="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          label="Rejected"
          value={rejectedCount}
          icon={X}
          iconClass="bg-rose-500/10 text-rose-600"
        />
      </div>

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
        Showing <span className="font-medium text-foreground">{items.length}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> requests
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
                  <TableHead className="hidden md:table-cell">Leave Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="hidden sm:table-cell">End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead className="min-w-[180px] hidden lg:table-cell">Reason</TableHead>
                  <TableHead className="hidden md:table-cell">Applied</TableHead>
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
                              style={{ background: l.leaveType?.color ?? "#94a3b8" }}
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
                          style={{ background: l.leaveType?.color ?? "#94a3b8" }}
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
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
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
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewRecord(l)}>
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

      <LeaveEntryDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) setEditRecord(null);
        }}
        record={editRecord}
        onSaved={() => qc.invalidateQueries({ queryKey: ["leave"] })}
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
              Confirm {decision?.action === "APPROVED" ? "Approval" : "Rejection"}
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
