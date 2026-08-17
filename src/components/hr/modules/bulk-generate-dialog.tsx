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
  Mail,
  Download,
  FileStack,
  Search,
  XCircle,
  Users,
  FileText,
  Layers,
} from "lucide-react";

const STEPS = [
  "Select Employees",
  "Select Template",
  "Review",
  "Generate",
  "Results",
] as const;

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
}

interface Template {
  id: string;
  name: string;
  code: string;
  type: string;
  category?: string | null;
  description?: string | null;
  status?: string | null;
}

interface GeneratedDoc {
  id: string;
  documentNumber: string;
  title: string;
  type: string;
  employeeId: string;
  employee?: Employee | null;
  template?: Template | null;
  status?: string | null;
}

interface BulkGenerateResult {
  generated: GeneratedDoc[];
  failed: { employeeId: string; name: string; error: string }[];
  count: number;
  totalRequested: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkGenerateDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [templateId, setTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkGenerateResult | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [emailTotal, setEmailTotal] = useState(0);

  const queryClient = useQueryClient();

  // Reset state when dialog opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedIds(new Set());
      setEmpSearch("");
      setDeptFilter("ALL");
      setTemplateId("");
      setGenerating(false);
      setProgress(0);
      setResult(null);
      setEmailSending(false);
      setEmailSentCount(0);
      setEmailTotal(0);
    }
  }, [open]);

  // Load all employees (page size 200 to cover the seed's 20 + future growth).
  const employeesQuery = useQuery<{ items: Employee[] }>({
    queryKey: ["bulk-employees", "pageSize", 200],
    queryFn: async () => {
      const r = await fetch("/api/employees?pageSize=200");
      if (!r.ok) throw new Error("Failed to load employees");
      return r.json();
    },
    enabled: open,
  });

  // Load all active templates.
  const templatesQuery = useQuery<{ items: Template[] }>({
    queryKey: ["bulk-templates", "ACTIVE"],
    queryFn: async () => {
      const r = await fetch("/api/document-templates?status=ACTIVE&pageSize=200");
      if (!r.ok) throw new Error("Failed to load templates");
      return r.json();
    },
    enabled: open,
  });

  const employees = employeesQuery.data?.items ?? [];
  const templates = templatesQuery.data?.items ?? [];

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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selectedIds.has(e.id)),
    [employees, selectedIds]
  );

  const canNext =
    (step === 0 && selectedIds.size > 0) ||
    (step === 1 && !!selectedTemplate) ||
    step === 2 ||
    step === 3;

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setProgress(5);

    // Animate progress while we wait for the server.
    let pct = 5;
    const interval = setInterval(() => {
      pct = Math.min(pct + 7, 90);
      setProgress(pct);
    }, 250);

    try {
      const r = await fetch("/api/documents/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: Array.from(selectedIds),
          templateId: selectedTemplate.id,
          type: selectedTemplate.type,
        }),
      });
      const data = await r.json();
      clearInterval(interval);
      setProgress(100);

      if (!r.ok) {
        toast.error(data?.error ?? "Bulk generation failed.");
        setGenerating(false);
        return;
      }
      setResult(data);
      toast.success(
        `Generated ${data.count} of ${data.totalRequested} document(s) successfully.`
      );
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err?.message ?? "Network error during bulk generation.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result || result.generated.length === 0) return;
    try {
      const r = await fetch("/api/documents/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: result.generated.map((g) => g.id),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to build ZIP.");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documents.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ZIP download started.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to download ZIP.");
    }
  };

  // SECURITY: Send emails one-by-one, each to its corresponding employee's
  // official email. Employee A must NEVER receive Employee B's document.
  const handleSendAllEmails = async () => {
    if (!result || result.generated.length === 0) return;
    setEmailSending(true);
    setEmailSentCount(0);
    setEmailTotal(result.generated.length);

    let ok = 0;
    let fail = 0;

    for (let i = 0; i < result.generated.length; i++) {
      const doc = result.generated[i];
      const dataJson: any = (() => {
        try {
          return JSON.parse((doc as any)?.dataJson ?? "{}");
        } catch {
          return {};
        }
      })();
      // Resolve recipient from the employee record loaded by the bulk
      // generate API. The official email is the only allowed recipient —
      // we do NOT batch emails or share recipients across documents.
      const emp = employees.find((e) => e.id === doc.employeeId);
      const recipient = emp?.officialEmail ?? dataJson?.employee?.officialEmail ?? "";

      if (!recipient) {
        fail += 1;
        setEmailSentCount(i + 1);
        continue;
      }

      const subject = dataJson?.emailSubject ?? `${selectedTemplate?.name ?? "Document"} - ${doc.documentNumber}`;
      const body = dataJson?.emailBody ?? `Dear ${emp?.fullName ?? "Employee"},\n\nPlease find attached your document ${doc.documentNumber}.\n\nRegards,\nHR Team`;

      try {
        const r = await fetch(`/api/documents/${doc.id}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject,
            body,
          }),
        });
        if (r.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
      setEmailSentCount(i + 1);
    }

    setEmailSending(false);
    toast.success(`Sent ${ok} email(s)${fail ? `, ${fail} failed` : ""}.`);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["email-logs"] });
  };

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Bulk Document Generation
          </DialogTitle>
          <DialogDescription>
            Generate HR documents for multiple employees at once. Each employee
            receives their own personalised document — no cross-recipient
            sharing of documents or emails.
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
                      id="select-all"
                      checked={allVisibleSelected}
                      onCheckedChange={toggleAllVisible}
                    />
                    <Label
                      htmlFor="select-all"
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

            {/* STEP 1: Select Template */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-sm font-medium">
                    Choose a template
                  </Label>
                  <Badge variant="secondary">
                    {templates.length} active templates
                  </Badge>
                </div>
                {templatesQuery.isLoading && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" />
                    Loading templates…
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {templates.map((t) => {
                    const active = t.id === templateId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className={`text-left p-3 rounded-lg border transition ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <FileText
                            className={`size-4 mt-0.5 ${
                              active ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {t.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] py-0">
                                {t.code}
                              </Badge>
                              <span>{t.type.replace(/_/g, " ")}</span>
                              {t.category && (
                                <span className="text-muted-foreground/70">
                                  · {t.category}
                                </span>
                              )}
                            </div>
                            {t.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {t.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Review */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Template:</span>{" "}
                    <strong>
                      {selectedTemplate?.name} ({selectedTemplate?.code})
                    </strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge variant="outline" className="ml-1">
                      {selectedTemplate?.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Recipients:</span>{" "}
                    <strong>{selectedIds.size}</strong> employee(s)
                  </div>
                  <div className="text-sm text-primary font-medium">
                    Will generate {selectedIds.size}{" "}
                    {selectedTemplate?.name.toLowerCase()} document(s) for{" "}
                    {selectedIds.size} employees.
                  </div>
                </div>

                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Selected employees ({selectedEmployees.length})
                </div>
                <div className="border rounded-lg max-h-[40vh] overflow-y-auto">
                  {selectedEmployees.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                    >
                      <AvatarBadge name={e.fullName} photo={e.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {e.fullName}{" "}
                          <span className="text-xs text-muted-foreground">
                            {e.employeeId}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {e.officialEmail ?? "—"}
                        </div>
                      </div>
                      <StatusBadge status={e.employmentStatus ?? "ACTIVE"} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Generate (progress) */}
            {step === 3 && (
              <div className="space-y-4 py-6">
                <div className="text-center">
                  <FileStack className="size-10 mx-auto text-primary mb-2" />
                  <div className="text-sm font-medium">
                    Generating {selectedIds.size} document(s)…
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Each employee gets their own personalised document.
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-center text-xs text-muted-foreground">
                  {progress < 100 ? "Working… please wait" : "Done"}
                </div>
              </div>
            )}

            {/* STEP 4: Results */}
            {step === 4 && result && (
              <div className="space-y-3">
                <div
                  className={`rounded-lg p-4 border ${
                    result.failed.length > 0
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "text-emerald-500/5 border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-primary" />
                    <div className="text-sm font-semibold">
                      Generated {result.count} of {result.totalRequested}{" "}
                      document(s) successfully.
                    </div>
                  </div>
                  {result.failed.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.failed.length} employee(s) failed — see the list
                      below.
                    </div>
                  )}
                </div>

                {result.generated.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadZip}
                    >
                      <Download className="size-4 mr-1.5" /> Download All (ZIP)
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendAllEmails}
                      disabled={emailSending}
                    >
                      {emailSending ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <Mail className="size-4 mr-1.5" />
                      )}
                      Send All Emails
                    </Button>
                  </div>
                )}

                {emailSending && (
                  <div className="space-y-1">
                    <Progress
                      value={
                        emailTotal ? (emailSentCount / emailTotal) * 100 : 0
                      }
                      className="h-1.5"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      Sending {emailSentCount} / {emailTotal} emails… (one at a
                      time, each to its own employee)
                    </div>
                  </div>
                )}

                {result.generated.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Generated documents ({result.generated.length})
                    </div>
                    <div className="border rounded-lg max-h-[28vh] overflow-y-auto">
                      {result.generated.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                        >
                          <FileText className="size-4 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {d.documentNumber}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {d.title}
                            </div>
                          </div>
                          <StatusBadge status={d.status ?? "GENERATED"} />
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
                    <div className="border border-rose-500/20 rounded-lg max-h-[20vh] overflow-y-auto">
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
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            {step === 0 && `${selectedIds.size} employee(s) selected`}
            {step === 1 && selectedTemplate && `Template: ${selectedTemplate.name}`}
            {step === 2 &&
              `Ready to generate ${selectedIds.size} document(s)`}
            {step === 3 && "Generating…"}
            {step === 4 && result && `Done — ${result.count} generated`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
            {step > 0 && step < 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={generating}
              >
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
            )}
            {step < 2 && (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
              >
                Next <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}
            {step === 2 && (
              <Button
                size="sm"
                onClick={() => {
                  setStep(3);
                  // Fire-and-forget; the progress UI animates while we wait.
                  handleGenerate();
                }}
                disabled={generating}
              >
                <FileStack className="size-4 mr-1.5" /> Generate{" "}
                {selectedIds.size} Document(s)
              </Button>
            )}
            {step === 3 && (
              <Button size="sm" disabled>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Generating…
              </Button>
            )}
            {step === 4 && (
              <Button size="sm" onClick={close}>
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
