"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Save,
  RotateCcw,
  Send,
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  Code,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailTemplate {
  id: string;
  name: string;
  code: string;
  type: string;
  category?: string | null;
  description?: string | null;
  status?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  updatedAt?: string | null;
}

interface SampleEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  officialEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  joiningDate?: string | null;
  confirmationDate?: string | null;
  basicSalary?: number | null;
  allowances?: number | null;
  deductions?: number | null;
  tax?: number | null;
  designation?: { name?: string | null } | null;
  role?: { name?: string | null } | null;
  department?: { name?: string | null } | null;
}

interface Company {
  id: string;
  name?: string | null;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

// Variable chips grouped by section. Each chip inserts {{token}} at the cursor
// position of the currently-focused editor (subject input OR body textarea).
const VARIABLE_GROUPS: {
  label: string;
  vars: { token: string; label: string }[];
}[] = [
  {
    label: "Employee",
    vars: [
      { token: "employee.name", label: "Name" },
      { token: "employee.id", label: "Employee ID" },
      { token: "employee.role", label: "Role" },
      { token: "employee.designation", label: "Designation" },
      { token: "employee.department", label: "Department" },
      { token: "employee.email", label: "Email" },
      { token: "employee.phone", label: "Phone" },
      { token: "employee.joining_date", label: "Joining Date" },
      { token: "employee.salary", label: "Basic Salary" },
      { token: "employee.address", label: "Address" },
    ],
  },
  {
    label: "Company",
    vars: [
      { token: "company.name", label: "Name" },
      { token: "company.legal_name", label: "Legal Name" },
      { token: "company.address", label: "Address" },
      { token: "company.email", label: "Email" },
      { token: "company.phone", label: "Phone" },
      { token: "company.website", label: "Website" },
    ],
  },
  {
    label: "Document",
    vars: [
      { token: "document.number", label: "Number" },
      { token: "document.date", label: "Date" },
      { token: "document.issue_date", label: "Issue Date" },
    ],
  },
  {
    label: "Payroll",
    vars: [
      { token: "payroll.month", label: "Month" },
      { token: "payroll.basic_salary", label: "Basic Salary" },
      { token: "payroll.allowances", label: "Allowances" },
      { token: "payroll.deductions", label: "Deductions" },
      { token: "payroll.tax", label: "Tax" },
      { token: "payroll.net_salary", label: "Net Salary" },
    ],
  },
];

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)}`;
}

// Resolve {{token}} tokens using a sample employee + company context. Mirrors
// the server-side resolver in /lib/document-vars.ts but lightweight — we only
// need it for the live preview.
function resolvePreview(
  content: string,
  ctx: { employee: SampleEmployee | null; company: Company | null }
): string {
  if (!content) return "";
  const { employee, company } = ctx;
  const map: Record<string, string> = {};

  if (employee) {
    const designationName = employee.designation?.name ?? "";
    const roleName = employee.role?.name ?? "";
    const departmentName = employee.department?.name ?? "";
    map["employee.name"] = employee.fullName ?? "";
    map["employee.id"] = employee.employeeId ?? employee.id ?? "";
    map["employee.role"] = roleName;
    map["employee.designation"] = designationName;
    map["employee.department"] = departmentName;
    map["employee.joining_date"] = fmtDate(employee.joiningDate);
    map["employee.confirmation_date"] = fmtDate(employee.confirmationDate);
    map["employee.salary"] = fmtMoney(employee.basicSalary);
    map["employee.basic_salary"] = fmtMoney(employee.basicSalary);
    map["employee.allowances"] = fmtMoney(employee.allowances);
    map["employee.deductions"] = fmtMoney(employee.deductions);
    map["employee.tax"] = fmtMoney(employee.tax);
    map["employee.email"] = employee.officialEmail ?? employee.personalEmail ?? "";
    map["employee.official_email"] = employee.officialEmail ?? "";
    map["employee.personal_email"] = employee.personalEmail ?? "";
    map["employee.phone"] = employee.phone ?? "";
    map["employee.address"] = [
      employee.address,
      employee.city,
      employee.state,
      employee.country,
      employee.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (company) {
    const fullAddress = [
      company.address,
      company.city,
      company.state,
      company.country,
      company.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
    map["company.name"] = company.name ?? "";
    map["company.legal_name"] = company.legalName ?? company.name ?? "";
    map["company.address"] = fullAddress;
    map["company.city"] = company.city ?? "";
    map["company.state"] = company.state ?? "";
    map["company.country"] = company.country ?? "";
    map["company.zip_code"] = company.zipCode ?? "";
    map["company.email"] = company.email ?? "";
    map["company.phone"] = company.phone ?? "";
    map["company.website"] = company.website ?? "";
  }

  // Document + payroll tokens — for the preview we use sensible sample values
  // so the user can see how a real email would look.
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  map["document.number"] = "DOC/SAMPLE/0001";
  map["document.date"] = dateStr;
  map["document.issue_date"] = dateStr;
  const monthStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  map["payroll.month"] = monthStr;
  map["payroll.basic_salary"] = employee
    ? fmtMoney(employee.basicSalary)
    : "৳50,000";
  map["payroll.allowances"] = employee
    ? fmtMoney(employee.allowances)
    : "৳10,000";
  map["payroll.deductions"] = employee
    ? fmtMoney(employee.deductions)
    : "৳2,000";
  map["payroll.tax"] = employee ? fmtMoney(employee.tax) : "৳5,000";
  map["payroll.net_salary"] = employee
    ? fmtMoney(
        (employee.basicSalary ?? 0) +
          (employee.allowances ?? 0) -
          (employee.deductions ?? 0) -
          (employee.tax ?? 0)
      )
    : "৳53,000";

  return content.replace(
    /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,
    (full, token: string) => (token in map ? map[token] : "")
  );
}

export function EmailTemplateEditor() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testTo, setTestTo] = useState("");

  // Refs so variable chips can insert at the cursor position.
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  // Load all email templates (filter: include empty so the user can see
  // templates that haven't had email configured yet — they can still edit them).
  const templatesQuery = useQuery<{ items: EmailTemplate[] }>({
    queryKey: ["email-templates", "includeEmpty"],
    queryFn: async () => {
      const r = await fetch("/api/email-templates?includeEmpty=1");
      if (!r.ok) throw new Error("Failed to load email templates");
      return r.json();
    },
  });

  // Load a sample employee + the company for live preview rendering.
  const sampleQuery = useQuery<{ items: SampleEmployee[] }>({
    queryKey: ["email-templates-sample-employee"],
    queryFn: async () => {
      const r = await fetch("/api/employees?pageSize=1");
      if (!r.ok) throw new Error("Failed to load sample employee");
      return r.json();
    },
  });

  const companyQuery = useQuery<Company>({
    queryKey: ["company"],
    queryFn: () => fetch("/api/company").then((r) => r.json()),
  });

  const templates = templatesQuery.data?.items ?? [];
  const sampleEmployee = sampleQuery.data?.items?.[0] ?? null;
  const company = companyQuery.data ?? null;

  // Search filter for the left list.
  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  // Auto-select the first template when the list loads (and nothing is selected).
  useEffect(() => {
    if (!selectedId && filteredTemplates.length > 0) {
      setSelectedId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedId]);

  // Load subject/body from the selected template (and reset dirty flag).
  useEffect(() => {
    if (!selectedId) return;
    const t = templates.find((x) => x.id === selectedId);
    if (t) {
      setSubject(t.emailSubject ?? "");
      setBody(t.emailBody ?? "");
      setDirty(false);
    }
  }, [selectedId, templates]);

  // Default the "To" field of the test email dialog to the sample employee's
  // official email whenever the sample employee changes.
  useEffect(() => {
    if (sampleEmployee) {
      setTestTo(sampleEmployee.officialEmail ?? sampleEmployee.personalEmail ?? "");
    }
  }, [sampleEmployee]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  // Real-time preview — re-renders on every keystroke.
  const renderedSubject = useMemo(
    () =>
      resolvePreview(subject, {
        employee: sampleEmployee,
        company,
      }),
    [subject, sampleEmployee, company]
  );
  const renderedBody = useMemo(
    () =>
      resolvePreview(body, {
        employee: sampleEmployee,
        company,
      }),
    [body, sampleEmployee, company]
  );

  function markDirty() {
    setDirty(true);
  }

  // Insert {{token}} at the cursor position of whichever editor was focused
  // most recently. Falls back to appending at the end if no cursor.
  function insertVariable(token: string) {
    const insertText = `{{${token}}}`;
    const focus = lastFocused.current;
    if (focus === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + insertText + subject.slice(end);
      setSubject(next);
      markDirty();
      // Restore cursor just past the inserted text.
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + insertText.length;
        el.setSelectionRange(pos, pos);
      });
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + insertText + body.slice(end);
      setBody(next);
      markDirty();
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + insertText.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      // No ref available — append to body as a fallback.
      setBody((prev) => prev + insertText);
      markDirty();
    }
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/email-templates/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSubject: subject, emailBody: body }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to save");
      }
      toast.success(`Email template saved for ${selectedTemplate?.name ?? "template"}.`);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!selectedTemplate) return;
    setSubject(selectedTemplate.emailSubject ?? "");
    setBody(selectedTemplate.emailBody ?? "");
    setDirty(false);
    toast.info("Reverted to the last saved version.");
  }

  async function sendTestEmail() {
    if (!testTo) {
      toast.error("Please enter a recipient email address.");
      return;
    }
    setSendingTest(true);
    try {
      const r = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          subject: renderedSubject || "(no subject)",
          body: renderedBody,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to send test email");
      }
      toast.success(`Test email sent to ${testTo}.`);
      setTestEmailOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  // ===== Loading state =====
  if (templatesQuery.isLoading) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6">
          <div className="h-96 rounded-lg bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // ===== Empty state =====
  if (!templatesQuery.isLoading && templates.length === 0) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Mail className="size-7 text-muted-foreground" />
          </div>
          <div className="font-semibold text-foreground mb-1">
            No document templates yet
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Email templates are tied to document templates. Create a document
            template first, then come back here to author its email subject and
            body.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Template list */}
        <Card className="border-border/60 shadow-soft lg:max-h-[70vh] flex flex-col">
          <CardContent className="p-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Templates
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {filteredTemplates.length}
              </Badge>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-1">
                {filteredTemplates.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No templates match your search.
                  </div>
                )}
                {filteredTemplates.map((t) => {
                  const active = t.id === selectedId;
                  const hasEmail = !!(
                    t.emailSubject?.trim() || t.emailBody?.trim()
                  );
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg border transition group",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-transparent hover:bg-muted/40 hover:border-border/60"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <FileText
                          className={cn(
                            "size-4 mt-0.5 flex-shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {t.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 font-mono"
                            >
                              {t.code}
                            </Badge>
                            <span>{t.type.replace(/_/g, " ").toLowerCase()}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {hasEmail ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-700 bg-emerald-500/10"
                              >
                                Email ready
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-700 bg-amber-500/10"
                              >
                                No email
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* RIGHT: Editor (subject + body + variables sidebar) */}
        <Card className="border-border/60 shadow-soft lg:col-span-2">
          <CardContent className="p-4 space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-2">
                      <Mail className="size-4 text-primary flex-shrink-0" />
                      {selectedTemplate.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedTemplate.code} ·{" "}
                      {selectedTemplate.type.replace(/_/g, " ").toLowerCase()} ·{" "}
                      {selectedTemplate.category?.toLowerCase() ?? "—"}
                    </div>
                  </div>
                  {dirty && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/30 text-amber-700 bg-amber-500/10"
                    >
                      Unsaved changes
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Subject + Body editor */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        Email Subject
                      </Label>
                      <Input
                        ref={subjectRef}
                        placeholder="e.g. Your {{document.number}} from {{company.name}}"
                        value={subject}
                        onChange={(e) => {
                          setSubject(e.target.value);
                          markDirty();
                        }}
                        onFocus={() => (lastFocused.current = "subject")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Code className="size-3.5" />
                        Email Body
                      </Label>
                      <Textarea
                        ref={bodyRef}
                        placeholder={
                          "Dear {{employee.name}},\n\nPlease find attached your {{payroll.month}} payslip from {{company.name}}.\n\nRegards,\nHR Team"
                        }
                        value={body}
                        onChange={(e) => {
                          setBody(e.target.value);
                          markDirty();
                        }}
                        onFocus={() => (lastFocused.current = "body")}
                        rows={14}
                        className="font-mono text-xs leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {body.length} character{body.length === 1 ? "" : "s"}
                        </span>
                        <span>
                          {dirty
                            ? "Click Save to commit your changes."
                            : "All changes saved."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Variables sidebar */}
                  <div className="md:col-span-1">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 sticky top-4">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                        <Code className="size-3.5 text-primary" />
                        Variables
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-2">
                        Click a chip to insert at the cursor in the focused
                        field.
                      </div>
                      <ScrollArea className="h-[280px] pr-2">
                        <div className="space-y-3">
                          {VARIABLE_GROUPS.map((group) => (
                            <div key={group.label} className="space-y-1.5">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                {group.label}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {group.vars.map((v) => (
                                  <button
                                    key={v.token}
                                    onClick={() => insertVariable(v.token)}
                                    title={`Insert {{${v.token}}}`}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition font-mono"
                                  >
                                    {v.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border/60">
                  <div className="text-[11px] text-muted-foreground">
                    Last updated{" "}
                    {selectedTemplate.updatedAt
                      ? new Date(selectedTemplate.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reset}
                      disabled={!dirty || saving}
                    >
                      <RotateCcw className="size-4 mr-1.5" /> Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestEmailOpen(true)}
                    >
                      <Send className="size-4 mr-1.5" /> Send Test Email
                    </Button>
                    <Button
                      size="sm"
                      onClick={save}
                      disabled={saving || !dirty}
                    >
                      {saving ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="size-4 mr-1.5" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Select a template from the left to start editing its email.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LIVE PREVIEW */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/60">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              Live Preview
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rendered using sample employee{" "}
              <strong className="text-foreground">
                {sampleEmployee?.fullName ?? "—"}
              </strong>{" "}
              ({sampleEmployee?.officialEmail ?? "—"})
            </div>
          </div>

          {sampleQuery.isLoading && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              <Loader2 className="size-4 animate-spin inline mr-2" />
              Loading sample employee…
            </div>
          )}

          {!sampleQuery.isLoading && (
            <div className="rounded-lg border border-border/60 bg-background overflow-hidden">
              {/* Email header (To/Subject) */}
              <div className="px-4 py-3 bg-muted/30 border-b border-border/60 space-y-1.5">
                <div className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-muted-foreground w-14 flex-shrink-0 mt-0.5">
                    To:
                  </span>
                  <span className="text-foreground break-all">
                    {sampleEmployee?.officialEmail ??
                      sampleEmployee?.personalEmail ??
                      "—"}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-muted-foreground w-14 flex-shrink-0 mt-0.5">
                    Subject:
                  </span>
                  <span className="text-foreground font-medium break-words">
                    {renderedSubject || (
                      <span className="text-muted-foreground italic">
                        (no subject)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {/* Email body */}
              <div className="px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed min-h-[120px]">
                {renderedBody || (
                  <span className="text-muted-foreground italic">
                    (email body is empty — start typing in the editor above)
                  </span>
                )}
              </div>
              {/* Email footer signature */}
              <div className="px-4 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
                Preview rendered at {new Date().toLocaleString()} · Variable
                tokens are resolved against the sample employee + company
                records.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TEST EMAIL DIALOG */}
      {testEmailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-5 space-y-4">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Send Test Email
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sends the rendered subject + body (with sample variables
                resolved) to the address you enter below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Recipient (To)
              </Label>
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Subject:</span>{" "}
                <span className="font-medium">
                  {renderedSubject || "(no subject)"}
                </span>
              </div>
              <div className="text-muted-foreground">
                Body: {renderedBody.length} character
                {renderedBody.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTestEmailOpen(false)}
                disabled={sendingTest}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={sendTestEmail}
                disabled={sendingTest || !testTo}
              >
                {sendingTest ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                Send Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast success check (visual hint when not dirty after save) */}
      {!dirty && selectedTemplate && (
        <div className="sr-only" aria-live="polite">
          <CheckCircle2 className="size-4" /> All changes saved.
        </div>
      )}
    </div>
  );
}
