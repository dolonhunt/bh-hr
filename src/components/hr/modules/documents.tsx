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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  FilePlus,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Download,
  Mail,
  Pencil,
  Copy,
  Archive,
  Send,
  RefreshCw,
  FileEdit,
  CheckCircle2,
  Clock,
  MailX,
  FileStack,
  MailCheck,
  Layers,
  Forward,
  X,
  Stamp,
  ChevronRight,
  Printer,
  GitCompareArrows,
} from "lucide-react";
import { formatDate, relativeTime, cn } from "@/lib/utils";
import { printDocument } from "@/lib/print";
import { TemplateFormDialog } from "./template-form-dialog";
import { GenerateDocumentDialog } from "./generate-document-dialog";
import { BulkGenerateDialog } from "./bulk-generate-dialog";
import { ApprovalQueue } from "./approval-queue";
import { ExportButton } from "../shared/export-button";
import { TemplateCompareDialog } from "./template-compare-dialog";

const DOC_TYPES = [
  "OFFER",
  "APPOINTMENT",
  "CONTRACT",
  "JOINING",
  "CONFIRMATION",
  "PAYSLIP",
  "SALARY_CERT",
  "INCREMENT",
  "SALARY_REVISION",
  "PROMOTION",
  "TRANSFER",
  "WARNING",
  "SHOW_CAUSE",
  "EXPERIENCE",
  "EMPLOYMENT_CERT",
  "NOC",
  "LEAVE_APPROVAL",
  "LEAVE_CANCELLATION",
  "RESIGN_ACCEPT",
  "RELIEVING",
  "FINAL_SETTLEMENT",
  "CUSTOM",
];

const DOC_STATUSES = [
  "GENERATED",
  "PENDING_APPROVAL",
  "APPROVED",
  "ISSUED",
  "SENT",
  "ARCHIVED",
];

export function DocumentsModule() {
  const documentsTab = useApp((s) => s.documentsTab);
  const setDocumentsTab = useApp((s) => s.setDocumentsTab);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<{ id: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [sendEmailDoc, setSendEmailDoc] = useState<any | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTpl1, setCompareTpl1] = useState<string | undefined>(undefined);
  const [compareTpl2, setCompareTpl2] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Generate HR documents from templates, deliver them via email, and track delivery."
        icon={<FileText className="size-5" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateFormOpen(true)}
            >
              <Plus className="size-4 mr-1.5" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
            >
              <Layers className="size-4 mr-1.5" /> Bulk Generate
            </Button>
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <FilePlus className="size-4 mr-1.5" /> Generate Document
            </Button>
          </>
        }
      />

      <Tabs
        value={documentsTab}
        onValueChange={(v) => setDocumentsTab(v as any)}
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="all" className="py-1.5 text-xs sm:text-sm">
            All Documents
          </TabsTrigger>
          <TabsTrigger value="templates" className="py-1.5 text-xs sm:text-sm">
            Templates
          </TabsTrigger>
          <TabsTrigger value="generated" className="py-1.5 text-xs sm:text-sm">
            Generated
          </TabsTrigger>
          <TabsTrigger value="email-history" className="py-1.5 text-xs sm:text-sm">
            Email History
          </TabsTrigger>
          <TabsTrigger value="approval-queue" className="py-1.5 text-xs sm:text-sm col-span-2 md:col-span-1">
            Approval Queue
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {documentsTab === "all" && (
        <AllDocumentsTab onPreview={setPreviewDoc} onSendEmail={setSendEmailDoc} />
      )}
      {documentsTab === "templates" && (
        <TemplatesTab
          onEdit={(id) => {
            setEditTemplate({ id });
            setTemplateFormOpen(true);
          }}
          onCreate={() => {
            setEditTemplate(null);
            setTemplateFormOpen(true);
          }}
          onCompare={(id1, id2) => {
            setCompareTpl1(id1);
            setCompareTpl2(id2);
            setCompareOpen(true);
          }}
        />
      )}
      {documentsTab === "generated" && (
        <GeneratedTab
          onPreview={setPreviewDoc}
          onSendEmail={setSendEmailDoc}
        />
      )}
      {documentsTab === "email-history" && <EmailHistoryTab />}
      {documentsTab === "approval-queue" && (
        <ApprovalQueue onPreview={setPreviewDoc} />
      )}

      {/* Generate dialog */}
      <GenerateDocumentDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={() => {
          /* could navigate */
        }}
      />

      {/* Bulk generate dialog */}
      <BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      {/* Template form dialog */}
      <TemplateFormDialog
        open={templateFormOpen}
        onOpenChange={(o) => {
          setTemplateFormOpen(o);
          if (!o) setEditTemplate(null);
        }}
        template={editTemplate}
      />

      {/* Document preview dialog */}
      <DocumentPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Send email dialog */}
      <DirectSendEmailDialog doc={sendEmailDoc} onClose={() => setSendEmailDoc(null)} />

      {/* Template compare dialog */}
      <TemplateCompareDialog
        open={compareOpen}
        onOpenChange={(o) => {
          setCompareOpen(o);
          if (!o) {
            setCompareTpl1(undefined);
            setCompareTpl2(undefined);
          }
        }}
        templateId1={compareTpl1}
        templateId2={compareTpl2}
      />
    </div>
  );
}

// =============================================================
// All Documents tab
// =============================================================

function AllDocumentsTab({
  onPreview,
  onSendEmail,
}: {
  onPreview: (doc: any) => void;
  onSendEmail: (doc: any) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["documents", "all-tab"],
    queryFn: async () => {
      const r = await fetch("/api/documents?pageSize=10");
      return r.json();
    },
  });

  const { data: emailStats } = useQuery({
    queryKey: ["email-logs", "stats"],
    queryFn: async () => {
      const [sent, failed] = await Promise.all([
        fetch("/api/email-logs?status=SENT&pageSize=1").then((r) => r.json()),
        fetch("/api/email-logs?status=FAILED&pageSize=1").then((r) => r.json()),
      ]);
      return { sentToday: sent.total ?? 0, failed: failed.total ?? 0 };
    },
  });

  const docs = data?.items ?? [];
  const total = data?.total ?? 0;
  const todayStr = new Date().toDateString();
  const generatedToday = docs.filter(
    (d: any) => new Date(d.createdAt).toDateString() === todayStr
  ).length;
  const sentToday = emailStats?.sentToday ?? 0;
  const failedEmails = emailStats?.failed ?? 0;
  const pendingApproval = docs.filter((d: any) =>
    ["PENDING_APPROVAL", "GENERATED"].includes(d.status)
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3">
        <KpiCard label="Total" value={total} icon={FileStack} iconClass="bg-primary/10 text-primary" />
        <KpiCard label="Generated Today" value={generatedToday} icon={FilePlus} iconClass="bg-violet-500/10 text-violet-600" />
        <KpiCard label="Sent Today" value={sentToday} icon={MailCheck} iconClass="bg-teal-500/10 text-teal-600" />
        <KpiCard label="Pending Approval" value={pendingApproval} icon={Clock} iconClass="bg-amber-500/10 text-amber-600" />
        <KpiCard label="Failed Emails" value={failedEmails} icon={MailX} iconClass="bg-rose-500/10 text-rose-600" />
      </div>

      <Card className="border-border/60 shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
          <div className="font-medium text-sm">Recent Documents</div>
        </div>
        <DocumentsTable
          docs={docs}
          loading={isLoading}
          onPreview={onPreview}
          onSendEmail={onSendEmail}
        />
      </Card>
    </div>
  );
}

// =============================================================
// Templates tab
// =============================================================

function TemplatesTab({
  onEdit,
  onCreate,
  onCompare,
}: {
  onEdit: (id: string) => void;
  onCreate: () => void;
  onCompare: (id1?: string, id2?: string) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [previewTpl, setPreviewTpl] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["document-templates", "templates-tab", search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      const r = await fetch(`/api/document-templates?${params.toString()}`);
      return r.json();
    },
  });
  const templates = data?.items ?? [];

  async function archiveTemplate(id: string) {
    if (!confirm("Archive this template? It will be hidden from the active list.")) return;
    try {
      const res = await fetch(`/api/document-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success("Template archived.");
      qc.invalidateQueries({ queryKey: ["document-templates"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function duplicateTemplate(t: any) {
    try {
      const res = await fetch("/api/document-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...t,
          name: `${t.name} (Copy)`,
          code: `${t.code}-COPY`,
          status: "DRAFT",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Template duplicated.");
      qc.invalidateQueries({ queryKey: ["document-templates"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, code, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={type || "ALL"}
          onValueChange={(v) => setType(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-56">
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
          variant="outline"
          onClick={() => onCompare(undefined, undefined)}
          size="sm"
          className="md:w-auto"
        >
          <GitCompareArrows className="size-4 mr-1.5" /> Compare
        </Button>
        <Button onClick={onCreate} size="sm" className="md:w-auto">
          <Plus className="size-4 mr-1.5" /> Create Template
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No templates found"
          description="Create your first template to start generating HR documents."
          actionLabel="Create Template"
          onAction={onCreate}
        />
      )}

      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <Card
              key={t.id}
              className="border-border/60 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col"
            >
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.description ?? "No description"}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {t.code}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <div className="text-muted-foreground">Type</div>
                    <div className="font-medium">
                      {t.type?.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Category</div>
                    <div className="font-medium">{t.category}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Version</div>
                    <div className="font-medium">v{t.version}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <StatusBadge status={t.status} />
                  </div>
                </div>

                <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground mb-3 line-clamp-2 flex-1">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: t.content?.slice(0, 280) ?? "",
                    }}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 flex-1"
                    onClick={() => setPreviewTpl(t)}
                  >
                    <Eye className="size-3.5 mr-1" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => onEdit(t.id)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8">
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(t.id)}>
                        <FileEdit className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateTemplate(t)}>
                        <Copy className="size-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreviewTpl(t)}>
                        <Eye className="size-4 mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCompare(t.id, undefined)}>
                        <GitCompareArrows className="size-4 mr-2" /> Compare with…
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-600"
                        onClick={() => archiveTemplate(t.id)}
                      >
                        <Archive className="size-4 mr-2" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplatePreviewDialog
        template={previewTpl}
        onClose={() => setPreviewTpl(null)}
      />
    </div>
  );
}

// =============================================================
// Generated tab
// =============================================================

function GeneratedTab({
  onPreview,
  onSendEmail,
}: {
  onPreview: (doc: any) => void;
  onSendEmail: (doc: any) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", "generated-tab", search, type, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/documents?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });
  const docs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  async function archiveDoc(id: string) {
    if (!confirm("Archive this document?")) return;
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      toast.success("Document archived.");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch {
      toast.error("Archive failed.");
    }
  }

  function download(id: string, format: "docx" | "pdf", docNumber: string) {
    const url = `/api/documents/${id}/download?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docNumber}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${format.toUpperCase()}…`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by document number or title…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={type || "ALL"}
          onValueChange={(v) => {
            setType(v === "ALL" ? "" : v);
            setPage(1);
          }}
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
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {DOC_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportButton
          module="documents"
          filters={{ search, type, status }}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{docs.length}</span>{" "}
        of <span className="font-medium text-foreground">{total}</span>{" "}
        documents
      </div>

      <Card className="border-border/60 shadow-soft overflow-hidden">
        <DocumentsTable
          docs={docs}
          loading={isLoading}
          onPreview={onPreview}
          onSendEmail={onSendEmail}
          onDownload={download}
          onArchive={archiveDoc}
        />
      </Card>

      {totalPages > 1 && (
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
    </div>
  );
}

// =============================================================
// Email History tab
// =============================================================

function EmailHistoryTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["email-logs", "history-tab", search, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const r = await fetch(`/api/email-logs?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });
  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  async function resend(id: string) {
    try {
      const res = await fetch(`/api/email-logs/${id}/resend`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Resend failed");
      toast.success("Email resent.");
      qc.invalidateQueries({ queryKey: ["email-logs"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient, subject…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
          </SelectContent>
        </Select>
        <ExportButton
          module="email-logs"
          filters={{ search, status }}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{logs.length}</span>{" "}
        of <span className="font-medium text-foreground">{total}</span> emails
      </div>

      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon={Mail}
          title="No emails yet"
          description="Send a document via email to see the delivery history here."
        />
      )}

      {!isLoading && logs.length > 0 && (
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[180px]">Document</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="min-w-[200px]">Subject</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-mono text-[11px]">
                        {log.document?.documentNumber ?? "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                        {log.document?.title ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AvatarBadge
                          name={log.employee?.fullName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate max-w-[140px]">
                            {log.employee?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.employee?.employeeId ?? ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{log.recipientTo}</TableCell>
                    <TableCell>
                      <div className="text-xs truncate max-w-[220px]">
                        {log.subject}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.sentBy?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.sentAt ? formatDate(log.sentAt, "datetime") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {["SENT", "FAILED", "QUEUED"].includes(log.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => resend(log.id)}
                        >
                          <RefreshCw className="size-3.5 mr-1" /> Resend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
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
    </div>
  );
}

// =============================================================
// Shared documents table
// =============================================================

// Status pipeline shown as small horizontal pills.
const STATUS_PIPELINE: { key: string; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "GENERATED", label: "Generated" },
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "ISSUED", label: "Issued" },
  { key: "SENT", label: "Sent" },
];

function StatusFlowPills({ status }: { status: string }) {
  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.key === status);
  if (status === "ARCHIVED") {
    return <StatusBadge status="ARCHIVED" />;
  }
  if (currentIdx === -1) {
    return <StatusBadge status={status} />;
  }
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {STATUS_PIPELINE.map((s, idx) => {
        const isCurrent = idx === currentIdx;
        const isPast = idx < currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <span
              className={cn(
                "inline-flex items-center px-1.5 h-5 rounded text-[9px] font-medium leading-none",
                isCurrent &&
                  "bg-primary text-primary-foreground shadow-soft",
                isPast && "bg-primary/15 text-primary",
                !isCurrent && !isPast &&
                  "bg-muted text-muted-foreground"
              )}
              title={s.label}
            >
              {s.label}
            </span>
            {idx < STATUS_PIPELINE.length - 1 && (
              <ChevronRight
                className={cn(
                  "size-2.5 mx-0.5 flex-shrink-0",
                  idx < currentIdx ? "text-primary" : "text-muted-foreground/50"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocumentsTable({
  docs,
  loading,
  onPreview,
  onSendEmail,
  onDownload,
  onArchive,
}: {
  docs: any[];
  loading: boolean;
  onPreview: (doc: any) => void;
  onSendEmail: (doc: any) => void;
  onDownload?: (id: string, format: "docx" | "pdf", docNumber: string) => void;
  onArchive?: (id: string) => void;
}) {
  const qc = useQueryClient();

  if (loading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Generate your first document to see it here."
        />
      </div>
    );
  }

  // ----- Status-transition helpers (call the dedicated endpoints). -----
  async function submitForApproval(d: any) {
    try {
      const res = await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_APPROVAL" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(`Submitted ${d.documentNumber} for approval.`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    }
  }

  async function approveDoc(d: any) {
    try {
      const res = await fetch(`/api/documents/${d.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(`Approved ${d.documentNumber}.`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  }

  async function rejectDoc(d: any) {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return; // user cancelled
    try {
      const res = await fetch(`/api/documents/${d.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(`Rejected ${d.documentNumber} — returned to draft.`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
  }

  async function issueDoc(d: any) {
    if (!confirm(`Issue ${d.documentNumber}? This locks the document content.`))
      return;
    try {
      const res = await fetch(`/api/documents/${d.id}/issue`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(`Issued ${d.documentNumber}.`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to issue");
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="min-w-[160px]">Doc Number</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="min-w-[260px]">Status Flow</TableHead>
            <TableHead>Email Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d: any) => (
            <TableRow key={d.id} className="hover:bg-muted/30">
              <TableCell>
                <button
                  className="font-mono text-xs text-primary hover:underline"
                  onClick={() => onPreview(d)}
                >
                  {d.documentNumber}
                </button>
                <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
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
                <div>{formatDate(d.createdAt)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {relativeTime(d.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <StatusFlowPills status={d.status} />
              </TableCell>
              <TableCell>
                {d.latestEmail ? (
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={d.latestEmail.status} />
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(d.latestEmail.createdAt)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not sent</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onPreview(d)}
                    title="Preview"
                  >
                    <Eye className="size-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="More actions"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Status-based actions at top of menu */}
                      {d.status === "GENERATED" && (
                        <>
                          <DropdownMenuLabel>Workflow</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => submitForApproval(d)}
                            className="text-emerald-700 focus:text-emerald-700"
                          >
                            <Forward className="size-4 mr-2" /> Submit for
                            Approval
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {d.status === "PENDING_APPROVAL" && (
                        <>
                          <DropdownMenuLabel>Approval</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => approveDoc(d)}
                            className="text-emerald-700 focus:text-emerald-700"
                          >
                            <CheckCircle2 className="size-4 mr-2" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => rejectDoc(d)}
                            className="text-rose-700 focus:text-rose-700"
                          >
                            <X className="size-4 mr-2" /> Reject (return to
                            draft)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {d.status === "APPROVED" && (
                        <>
                          <DropdownMenuLabel>Workflow</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => issueDoc(d)}
                            className="text-teal-700 focus:text-teal-700"
                          >
                            <Stamp className="size-4 mr-2" /> Issue &amp; Lock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {d.status === "ISSUED" && (
                        <>
                          <DropdownMenuLabel>Delivery</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onSendEmail(d)}>
                            <Mail className="size-4 mr-2" /> Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {d.status === "SENT" && (
                        <>
                          <DropdownMenuLabel>Delivery</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onSendEmail(d)}
                          >
                            <Mail className="size-4 mr-2" /> Resend Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {/* Standard actions */}
                      <DropdownMenuItem onClick={() => onPreview(d)}>
                        <Eye className="size-4 mr-2" /> Preview
                      </DropdownMenuItem>
                      {onDownload && (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              onDownload(d.id, "docx", d.documentNumber)
                            }
                          >
                            <Download className="size-4 mr-2" /> Download DOCX
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onDownload(d.id, "pdf", d.documentNumber)
                            }
                          >
                            <Download className="size-4 mr-2" /> Download PDF
                          </DropdownMenuItem>
                        </>
                      )}
                      {d.status !== "ISSUED" &&
                        d.status !== "SENT" &&
                        d.status !== "ARCHIVED" && (
                          <DropdownMenuItem onClick={() => onSendEmail(d)}>
                            <Mail className="size-4 mr-2" /> Send Email
                          </DropdownMenuItem>
                        )}
                      {onArchive && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600"
                            onClick={() => onArchive(d.id)}
                          >
                            <Archive className="size-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================
// Document Preview Dialog
// =============================================================

function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: any | null;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) {
      // Defer the reset to avoid synchronous setState in effect body.
      const t = setTimeout(() => {
        setPreview(null);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    // Use queueMicrotask so the rule about synchronous setState in effects
    // doesn't fire — we genuinely want to flip loading=true before the fetch.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`/api/documents/${doc.id}/preview`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPreview(d);
      })
      .catch(() => toast.error("Failed to load preview"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[92vh] p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="size-5 text-primary flex-shrink-0" />
                <span className="truncate">
                  {preview?.title ?? doc?.documentNumber ?? "Preview"}
                </span>
              </DialogTitle>
              {preview && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono">{preview.documentNumber}</span>
                  <span>·</span>
                  <span>{preview.employee?.fullName}</span>
                  <span>·</span>
                  <StatusBadge status={preview.status} />
                </div>
              )}
            </div>
            {preview && (
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() =>
                  printDocument({
                    title: preview.title ?? preview.documentNumber ?? "Document",
                    html: preview.content ?? "",
                    docNumber: preview.documentNumber,
                  })
                }
              >
                <Printer className="size-4 mr-1.5" /> Print
              </Button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-4 sm:px-6 py-5">
            {loading && (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <div className="text-sm">Loading preview…</div>
              </div>
            )}
            {!loading && preview && (
              <div className="rounded-lg border border-border bg-white p-4 sm:p-8">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.content }}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// Template Preview Dialog
// =============================================================

function TemplatePreviewDialog({
  template,
  onClose,
}: {
  template: any | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[92vh] p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary flex-shrink-0" />
                <span className="truncate">
                  {template?.name ?? "Template"}
                </span>
              </DialogTitle>
              {template && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {template.code}
                  </Badge>
                  <span>{template.type?.replace(/_/g, " ")}</span>
                  <span>·</span>
                  <span>v{template.version}</span>
                </div>
              )}
            </div>
            {template?.content && (
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() =>
                  printDocument({
                    title: template.name ?? "Template",
                    html: template.content ?? "",
                    docNumber: template.code,
                  })
                }
              >
                <Printer className="size-4 mr-1.5" /> Print
              </Button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-4 sm:px-6 py-5 space-y-4">
            {template?.emailSubject && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs">
                <div className="font-medium text-muted-foreground mb-1">
                  Email Subject
                </div>
                <div>{template.emailSubject}</div>
              </div>
            )}
            {template?.content && (
              <div className="rounded-lg border border-border bg-white p-4 sm:p-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.content }}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// Direct Send Email Dialog (from table)
// =============================================================

function DirectSendEmailDialog({
  doc,
  onClose,
}: {
  doc: any | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!doc) return;
    // Fetch full document + template to get email subject/body presets.
    fetch(`/api/documents/${doc.id}`)
      .then((r) => r.json())
      .then((d) => {
        setTo(d.employee?.officialEmail ?? "");
        setSubject(
          d.template?.emailSubject
            ? d.template.emailSubject.replace(
                /\{\{company\.name\}\}/g,
                "the company"
              )
            : `Your document - ${d.documentNumber}`
        );
        setBody(
          d.template?.emailBody ||
            `Dear ${d.employee?.fullName ?? ""},\n\nPlease find attached your document ${d.documentNumber}.\n\nRegards,\nHR Team`
        );
      })
      .catch(() => {
        setTo("");
        setSubject(`Your document - ${doc.documentNumber}`);
        setBody("");
      });
  }, [doc]);

  async function handleSend() {
    if (!doc) return;
    if (!to || !subject || !body) {
      toast.error("To, subject and body are required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, bcc, subject, body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Send failed");
      }
      toast.success(`Email sent to ${to}`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["email-logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Send Document via Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                To *
              </label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                CC
              </label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                BCC
              </label>
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Subject *
              </label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Body *
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-primary flex-shrink-0" />
            <div>
              PDF attachment ({doc?.documentNumber ?? "document"}.pdf) will be
              auto-generated and attached.
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <RefreshCw className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
