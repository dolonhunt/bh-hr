"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Download,
  Mail,
  Eye,
  Search,
  CheckCircle2,
  Paperclip,
  Send,
  Printer,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { printDocument } from "@/lib/print";

const TEMPLATE_TYPES = [
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

const STEPS = [
  "Select Employee",
  "Document Type",
  "Template",
  "Review Data",
  "Preview",
  "Generate",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optionally pre-select an employee (e.g. from the employee profile). */
  presetEmployeeId?: string | null;
  /** Optionally pre-select a document type. */
  presetType?: string | null;
  onGenerated?: (docId: string) => void;
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  presetEmployeeId,
  presetType,
  onGenerated,
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [dataOverride, setDataOverride] = useState<any>({});
  const [previewData, setPreviewData] = useState<{
    content: string;
    documentNumber: string;
    emailSubject: string;
    emailBody: string;
    title: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any | null>(null);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  // Reset state when dialog opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setPreviewData(null);
      setGeneratedDoc(null);
      setDataOverride({});
      setTemplateId("");
      setMonth("");
      setEmpSearch("");
      if (presetEmployeeId) {
        setEmployeeId(presetEmployeeId);
        setStep(1);
      } else {
        setEmployeeId("");
      }
      if (presetType) {
        setType(presetType);
      } else {
        setType("");
      }
    }
  }, [open, presetEmployeeId, presetType]);

  // Employees list (filtered by search).
  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["employees", empSearch, "doc-gen"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (empSearch) params.set("search", empSearch);
      params.set("pageSize", "50");
      const r = await fetch(`/api/employees?${params.toString()}`);
      return r.json();
    },
    enabled: open,
  });
  const employees = empData?.items ?? [];

  // Selected employee (full record).
  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const r = await fetch(`/api/employees/${employeeId}`);
      return r.json();
    },
    enabled: !!employeeId && open,
  });

  // Templates list filtered by selected type.
  const { data: templateData } = useQuery({
    queryKey: ["document-templates", type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      params.set("status", "ACTIVE");
      const r = await fetch(`/api/document-templates?${params.toString()}`);
      return r.json();
    },
    enabled: open,
  });
  const templates = templateData?.items ?? [];

  const selectedTemplate = templates.find((t: any) => t.id === templateId);

  // Auto-advance type → template when only one matches.
  useEffect(() => {
    if (templates.length === 1 && !templateId) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  // Payroll month default for payslips.
  useEffect(() => {
    if (type === "PAYSLIP" && !month) {
      const now = new Date();
      setMonth(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      );
    }
  }, [type, month]);

  const canNext = useCallback(() => {
    if (step === 0) return !!employeeId;
    if (step === 1) return !!type;
    if (step === 2) return !!templateId;
    if (step === 3) return true;
    if (step === 4) return !!previewData;
    return false;
  }, [step, employeeId, type, templateId, previewData]);

  // Build the request body for both preview and generate.
  const buildBody = useCallback(
    (isPreview: boolean) => {
      const body: any = {
        employeeId,
        templateId,
        preview: isPreview,
      };
      if (type) body.type = type;
      if (type === "PAYSLIP" && month) body.month = month;
      if (Object.keys(dataOverride).length > 0) {
        body.dataOverride = dataOverride;
      }
      return body;
    },
    [employeeId, templateId, type, month, dataOverride]
  );

  // Fetch preview when entering step 4 (Preview).
  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Preview failed");
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
      setStep(3);
    } finally {
      setPreviewLoading(false);
    }
  }, [buildBody]);

  useEffect(() => {
    if (step === 4 && !previewData && !previewLoading && employeeId && templateId) {
      fetchPreview();
    }
  }, [step, previewData, previewLoading, employeeId, templateId, fetchPreview]);

  // Regenerate preview when data overrides change.
  const refreshPreview = () => {
    setPreviewData(null);
  };

  // Actually generate the document.
  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      const doc = await res.json();
      setGeneratedDoc(doc);
      setStep(5);
      toast.success(`Document ${doc.documentNumber} generated.`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onGenerated?.(doc.id);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // Download handlers.
  function downloadDoc(format: "docx" | "pdf") {
    if (!generatedDoc) return;
    const url = `/api/documents/${generatedDoc.id}/download?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedDoc.documentNumber}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${format.toUpperCase()}…`);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[92vh] p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary flex-shrink-0" />
              Generate Document
            </DialogTitle>
            <DialogDescription>
              Walk through the steps to generate, preview and deliver an HR
              document.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {STEPS.map((s, idx) => {
                const isDone = idx < step;
                const isActive = idx === step;
                return (
                  <div
                    key={s}
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isDone
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full flex items-center justify-center text-[10px] ${
                          isActive
                            ? "bg-primary-foreground/20"
                            : isDone
                              ? "bg-primary"
                              : "bg-muted"
                        }`}
                      >
                        {isDone ? (
                          <Check className="size-3" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="whitespace-nowrap">{s}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-3 h-px bg-border" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ScrollArea className="max-h-[58vh]">
            <div className="px-4 sm:px-6 py-5">
              {/* STEP 0: Select employee */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Choose the employee this document is for.
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, email…"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <ScrollArea className="h-72">
                      {empLoading && (
                        <div className="p-4 text-sm text-muted-foreground">
                          Loading…
                        </div>
                      )}
                      {!empLoading && employees.length === 0 && (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No employees found.
                        </div>
                      )}
                      <div className="divide-y divide-border">
                        {employees.map((emp: any) => (
                          <button
                            key={emp.id}
                            onClick={() => setEmployeeId(emp.id)}
                            className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 transition ${
                              employeeId === emp.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <AvatarBadge
                              name={emp.fullName}
                              photo={emp.photo}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {emp.fullName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {emp.employeeId} ·{" "}
                                {emp.designation?.name ?? "—"} ·{" "}
                                {emp.department?.name ?? "—"}
                              </div>
                            </div>
                            {employeeId === emp.id && (
                              <Check className="size-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  {employee && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary" />
                        <span className="font-medium">
                          Selected: {employee.fullName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {employee.employeeId}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Select type */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Pick the kind of document you want to generate.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {TEMPLATE_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setType(t);
                          setTemplateId("");
                        }}
                        className={`rounded-lg border p-3 text-left transition ${
                          type === t
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {t.replace(/_/g, " ")}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {type === t ? "Selected" : "Click to select"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Select template */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Choose a template. Only active templates of type{" "}
                    <Badge variant="outline" className="font-mono">
                      {type}
                    </Badge>{" "}
                    are shown.
                  </div>
                  {templates.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
                      <div className="text-sm font-medium">
                        No templates found for this type
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Create a template first from the Templates tab.
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className={`rounded-lg border p-4 text-left transition ${
                          templateId === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {t.description ?? "No description"}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {t.code}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>v{t.version}</span>
                          <span>·</span>
                          <span>{t.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedTemplate && (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs">
                      <div className="font-medium mb-1">Template preview:</div>
                      <div
                        className="prose prose-sm max-w-none line-clamp-3"
                        dangerouslySetInnerHTML={{
                          __html: selectedTemplate.content,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Review data */}
              {step === 3 && employee && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Confirm the data that will be merged into the template.
                    Override any value below if needed.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ReviewField
                      label="Employee Name"
                      value={
                        dataOverride.employee?.name ?? employee.fullName
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, name: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Employee ID"
                      value={
                        dataOverride.employee?.id ?? employee.employeeId
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, id: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Designation"
                      value={
                        dataOverride.employee?.designation ??
                        employee.designation?.name ??
                        ""
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, designation: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Department"
                      value={
                        dataOverride.employee?.department ??
                        employee.department?.name ??
                        ""
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, department: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Joining Date"
                      value={
                        dataOverride.employee?.joining_date ??
                        (employee.joiningDate
                          ? formatDate(employee.joiningDate)
                          : "")
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, joining_date: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Basic Salary"
                      value={
                        dataOverride.employee?.salary ??
                        (employee.basicSalary
                          ? formatCurrency(employee.basicSalary)
                          : "")
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, salary: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Official Email"
                      value={
                        dataOverride.employee?.email ??
                        employee.officialEmail ??
                        ""
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, email: v },
                        }))
                      }
                    />
                    <ReviewField
                      label="Phone"
                      value={
                        dataOverride.employee?.phone ?? employee.phone ?? ""
                      }
                      onChange={(v) =>
                        setDataOverride((d: any) => ({
                          ...d,
                          employee: { ...d.employee, phone: v },
                        }))
                      }
                    />
                  </div>

                  {type === "PAYSLIP" && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Payroll Period
                      </div>
                      <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-48"
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Payroll values will be pulled from the latest payslip
                        for this month, or fall back to the employee&apos;s
                        salary fields.
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    Document number will be auto-generated (e.g.{" "}
                    <span className="font-mono">BH/HR/{type?.slice(0, 4)}/
                      {`${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${new Date().getFullYear()}`}
                      /{employee.employeeId}
                    </span>
                    ).
                  </div>
                </div>
              )}

              {/* STEP 4: Preview */}
              {step === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm text-muted-foreground flex-1 min-w-0">
                      Preview of the rendered document. Variables have been
                      resolved from the data above.
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          previewData &&
                          printDocument({
                            title: previewData.title || previewData.documentNumber || "Document",
                            html: previewData.content,
                            docNumber: previewData.documentNumber,
                          })
                        }
                        disabled={previewLoading || !previewData}
                      >
                        <Printer className="size-3.5 mr-1.5" /> Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshPreview}
                        disabled={previewLoading}
                      >
                        <Eye className="size-3.5 mr-1.5" /> Refresh
                      </Button>
                    </div>
                  </div>
                  {previewLoading && (
                    <div className="rounded-lg border border-border p-8 flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mb-2" />
                      <div className="text-sm">Rendering preview…</div>
                    </div>
                  )}
                  {!previewLoading && previewData && (
                    <>
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs flex items-center gap-3 flex-wrap">
                        <span className="text-muted-foreground">Doc No:</span>
                        <span className="font-mono font-medium">
                          {previewData.documentNumber}
                        </span>
                        <span className="text-muted-foreground ml-auto">
                          Title:
                        </span>
                        <span className="font-medium">
                          {previewData.title}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-white p-6 max-h-[44vh] overflow-y-auto">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: previewData.content,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 5: Generated */}
              {step === 5 && generatedDoc && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
                    <CheckCircle2 className="size-10 text-primary mx-auto mb-2" />
                    <div className="font-semibold text-base">
                      Document generated successfully
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {generatedDoc.documentNumber} · {generatedDoc.title}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `/api/documents/${generatedDoc.id}/preview`,
                          "_blank"
                        )
                      }
                    >
                      <Eye className="size-4 mr-1.5" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        printDocument({
                          title: generatedDoc.title || generatedDoc.documentNumber || "Document",
                          html: generatedDoc.content ?? "",
                          docNumber: generatedDoc.documentNumber,
                        })
                      }
                    >
                      <Printer className="size-4 mr-1.5" /> Print
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadDoc("docx")}
                    >
                      <Download className="size-4 mr-1.5" /> DOCX
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadDoc("pdf")}
                    >
                      <Download className="size-4 mr-1.5" /> PDF
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setSendEmailOpen(true)}
                  >
                    <Mail className="size-4 mr-1.5" /> Send via Email
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border justify-between gap-2 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              {step === 5 ? "Close" : "Cancel"}
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && step < 5 && (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={generating || previewLoading}
                >
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>
              )}
              {step < 4 && (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                >
                  Next <ArrowRight className="size-4 ml-1.5" />
                </Button>
              )}
              {step === 4 && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !previewData}
                >
                  {generating ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="size-4 mr-1.5" />
                  )}
                  Generate Document
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email sub-dialog */}
      <SendEmailDialog
        open={sendEmailOpen}
        onOpenChange={setSendEmailOpen}
        doc={generatedDoc}
        employee={employee}
        presetSubject={previewData?.emailSubject}
        presetBody={previewData?.emailBody}
        onSent={() => {
          qc.invalidateQueries({ queryKey: ["documents"] });
          qc.invalidateQueries({ queryKey: ["email-logs"] });
        }}
      />
    </>
  );
}

function ReviewField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// =============================================================
// Send Email sub-dialog
// =============================================================

function SendEmailDialog({
  open,
  onOpenChange,
  doc,
  employee,
  presetSubject,
  presetBody,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: any;
  employee: any;
  presetSubject?: string;
  presetBody?: string;
  onSent?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open && doc) {
      setTo(employee?.officialEmail ?? "");
      setCc("");
      setBcc("");
      setSubject(presetSubject || `Your document - ${doc.documentNumber}`);
      setBody(
        presetBody ||
          `Dear ${employee?.fullName ?? ""},\n\nPlease find attached your document ${doc.documentNumber}.\n\nRegards,\nHR Team`
      );
    }
  }, [open, doc]);

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
        throw new Error(err.error || "Failed to send email");
      }
      toast.success(`Email sent to ${to}`);
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Send Document via Email
          </DialogTitle>
          <DialogDescription>
            The generated PDF will be attached automatically. The recipient
            must be the employee&apos;s official email — overrides are logged
            for audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                To *
              </Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="employee@company.com"
              />
              {employee?.officialEmail &&
                to.toLowerCase() !==
                  employee.officialEmail.toLowerCase() && (
                  <div className="text-[11px] text-amber-600 mt-1">
                    Override: recipient differs from{" "}
                    {employee.officialEmail}. This will be logged.
                  </div>
                )}
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                CC
              </Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                BCC
              </Label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Subject *
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Body *
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs flex items-start gap-2">
            <Paperclip className="size-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Attachment</div>
              <div className="text-muted-foreground">
                {doc?.documentNumber ?? "document"}.pdf (auto-generated)
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
