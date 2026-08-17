"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  CheckCheck,
  Clock,
  FileCheck2,
  MailX,
  Eye,
  X,
  RefreshCw,
  Search,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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

import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { formatDate, relativeTime } from "@/lib/utils";

interface PendingDoc {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    photo?: string | null;
    designation?: { name?: string } | null;
    department?: { name?: string } | null;
  } | null;
  template: { name: string; code: string } | null;
  generatedBy: { id: string; name: string; email: string } | null;
}

interface PendingResponse {
  items: PendingDoc[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis: {
    pending: number;
    approvedToday: number;
    issuedToday: number;
    rejectedToday: number;
  };
}

const DOC_TYPES = [
  "OFFER",
  "APPOINTMENT",
  "PAYSLIP",
  "EXPERIENCE",
  "LEAVE_APPROVAL",
  "CONFIRMATION",
  "INCREMENT",
  "PROMOTION",
  "WARNING",
  "RELIEVING",
  "CUSTOM",
];

/**
 * Approval Queue — renders inside the Documents module's 5th tab.
 * Lists documents in PENDING_APPROVAL, lets HR approve / reject (with reason),
 * view the document preview, or "Approve All" in bulk.
 */
export function ApprovalQueue({
  onPreview,
}: {
  onPreview: (doc: any) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [rejectDoc, setRejectDoc] = useState<PendingDoc | null>(null);
  const [approveDoc, setApproveDoc] = useState<PendingDoc | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  const { data, isLoading, isFetching } = useQuery<PendingResponse>({
    queryKey: ["documents", "pending-approval", search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      params.set("pageSize", "100");
      const r = await fetch(
        `/api/documents/pending-approval?${params.toString()}`
      );
      if (!r.ok) throw new Error("Failed to load approval queue");
      return r.json();
    },
  });

  const docs = data?.items ?? [];
  const kpis = data?.kpis ?? {
    pending: 0,
    approvedToday: 0,
    issuedToday: 0,
    rejectedToday: 0,
  };

  async function quickApprove(doc: PendingDoc) {
    try {
      const res = await fetch(`/api/documents/${doc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Approve failed");
      }
      toast.success(`Approved ${doc.documentNumber}`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  }

  async function approveAll() {
    if (docs.length === 0) return;
    if (
      !confirm(
        `Approve all ${docs.length} pending document${docs.length === 1 ? "" : "s"}?`
      )
    )
      return;
    setApprovingAll(true);
    let ok = 0;
    let failed = 0;
    // Sequential to keep audit logs ordered; the queue is rarely huge.
    for (const doc of docs) {
      try {
        const res = await fetch(`/api/documents/${doc.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: "Bulk approved" }),
        });
        if (res.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setApprovingAll(false);
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (ok > 0 && failed === 0) {
      toast.success(`Approved ${ok} document${ok === 1 ? "" : "s"}.`);
    } else if (ok > 0 && failed > 0) {
      toast.warning(`Approved ${ok}, ${failed} failed.`);
    } else {
      toast.error("Bulk approve failed.");
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Pending Approval"
          value={kpis.pending}
          icon={Clock}
          iconClass="bg-amber-500/10 text-amber-600"
        />
        <KpiCard
          label="Approved Today"
          value={kpis.approvedToday}
          icon={FileCheck2}
          iconClass="text-emerald-500/10 text-primary"
        />
        <KpiCard
          label="Issued Today"
          value={kpis.issuedToday}
          icon={CheckCircle2}
          iconClass="bg-teal-500/10 text-teal-600"
        />
        <KpiCard
          label="Rejected Today"
          value={kpis.rejectedToday}
          icon={MailX}
          iconClass="bg-rose-500/10 text-rose-600"
        />
      </div>

      {/* Filter bar + Approve All */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by document number or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={type || "ALL"}
          onValueChange={(v) => setType(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={approveAll}
          disabled={approvingAll || docs.length === 0}
          className="md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {approvingAll ? (
            <RefreshCw className="size-4 mr-1.5 animate-spin" />
          ) : (
            <CheckCheck className="size-4 mr-1.5" />
          )}
          Approve All ({docs.length})
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Inbox}
              title="No documents awaiting approval"
              description="Documents submitted for approval will appear here for HR review."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[180px]">Document</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell>
                      <button
                        className="font-mono text-xs text-primary hover:underline"
                        onClick={() => onPreview(d)}
                      >
                        {d.documentNumber}
                      </button>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                        {d.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AvatarBadge
                          name={d.employee?.fullName}
                          photo={d.employee?.photo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate max-w-[140px]">
                            {d.employee?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {d.employee?.employeeId ?? ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {d.type?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{formatDate(d.updatedAt)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {relativeTime(d.updatedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AvatarBadge
                          name={d.generatedBy?.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate max-w-[140px]">
                            {d.generatedBy?.name ?? "HR System"}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                            {d.generatedBy?.email ?? ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          onClick={() => onPreview(d)}
                          title="Preview"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-primary hover:text-emerald-500/10 hover:text-primary"
                          onClick={() => quickApprove(d)}
                          title="Approve"
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                          onClick={() => setRejectDoc(d)}
                          title="Reject"
                        >
                          <X className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 hidden md:inline-flex"
                          onClick={() => setApproveDoc(d)}
                        >
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Live reload hint when refetching in the background */}
      {isFetching && !isLoading && docs.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="size-3 animate-spin" /> Syncing…
        </div>
      )}

      {/* Reject dialog with reason */}
      <RejectDialog
        doc={rejectDoc}
        onClose={() => setRejectDoc(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["documents"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      {/* Approve review dialog with optional note */}
      <ApproveDialog
        doc={approveDoc}
        onClose={() => setApproveDoc(null)}
        onPreview={onPreview}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["documents"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </div>
  );
}

// =============================================================
// Reject dialog — captures an optional rejection reason.
// =============================================================

function RejectDialog({
  doc,
  onClose,
  onDone,
}: {
  doc: PendingDoc | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the note when the dialog closes.
  function handleClose(o: boolean) {
    if (!o) {
      onClose();
      setTimeout(() => setNote(""), 100);
    }
  }

  async function submit() {
    if (!doc) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Reject failed");
      }
      toast.success(`Rejected ${doc.documentNumber} — returned to draft.`);
      onDone();
      onClose();
      setTimeout(() => setNote(""), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="size-5 text-rose-600" />
            Reject Document
          </DialogTitle>
          <DialogDescription>
            Returning {doc?.documentNumber} to draft. The author can re-edit and
            resubmit for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <div className="font-medium">{doc?.title}</div>
            <div className="text-muted-foreground mt-0.5">
              {doc?.employee?.fullName} · {doc?.type?.replace(/_/g, " ")}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Rejection reason (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. Salary figure needs to be updated before resubmission…"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The reason is recorded in the audit log and the employee activity
              feed.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {submitting ? (
              <RefreshCw className="size-4 mr-1.5 animate-spin" />
            ) : (
              <X className="size-4 mr-1.5" />
            )}
            Reject & Return to Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// Approve review dialog — preview + optional note + confirm.
// =============================================================

function ApproveDialog({
  doc,
  onClose,
  onPreview,
  onDone,
}: {
  doc: PendingDoc | null;
  onClose: () => void;
  onPreview: (doc: any) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose(o: boolean) {
    if (!o) {
      onClose();
      setTimeout(() => setNote(""), 100);
    }
  }

  async function submit() {
    if (!doc) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Approve failed");
      }
      toast.success(`Approved ${doc.documentNumber}.`);
      onDone();
      onClose();
      setTimeout(() => setNote(""), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            Review &amp; Approve
          </DialogTitle>
          <DialogDescription>
            Approving locks the content. The document can then be issued (final
            lock) and emailed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <div className="font-medium">{doc?.title}</div>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono">{doc?.documentNumber}</span>
              <span>·</span>
              <span>{doc?.employee?.fullName}</span>
              <span>·</span>
              <StatusBadge status={doc?.status ?? ""} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Approval note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Approved as drafted. Ready to issue."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => doc && onPreview(doc)}>
            <Eye className="size-4 mr-1.5" /> Preview First
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <RefreshCw className="size-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            Approve Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
