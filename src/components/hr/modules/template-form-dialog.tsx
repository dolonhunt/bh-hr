"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, FileText, Copy } from "lucide-react";

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

const CATEGORIES = ["EMPLOYMENT", "SALARY", "HR", "LEAVE", "SEPARATION"];

const VARIABLE_GROUPS: { label: string; vars: string[] }[] = [
  {
    label: "Employee",
    vars: [
      "{{employee.name}}",
      "{{employee.id}}",
      "{{employee.role}}",
      "{{employee.designation}}",
      "{{employee.department}}",
      "{{employee.joining_date}}",
      "{{employee.confirmation_date}}",
      "{{employee.salary}}",
      "{{employee.email}}",
      "{{employee.phone}}",
      "{{employee.address}}",
    ],
  },
  {
    label: "Company",
    vars: [
      "{{company.name}}",
      "{{company.address}}",
      "{{company.email}}",
      "{{company.phone}}",
      "{{company.website}}",
    ],
  },
  {
    label: "Document",
    vars: ["{{document.number}}", "{{document.date}}", "{{document.issue_date}}"],
  },
  {
    label: "Payroll",
    vars: [
      "{{payroll.month}}",
      "{{payroll.basic_salary}}",
      "{{payroll.allowances}}",
      "{{payroll.deductions}}",
      "{{payroll.tax}}",
      "{{payroll.net_salary}}",
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: { id: string } | null;
  onSaved?: () => void;
}

const DEFAULT_FORM = {
  name: "",
  code: "",
  type: "APPOINTMENT",
  category: "EMPLOYMENT",
  description: "",
  subject: "",
  content: `<h2>{{company.name}}</h2>
<p>{{company.address}}</p>
<hr/>
<h3>Document Title</h3>
<p>Ref: {{document.number}}</p>
<p>Date: {{document.date}}</p>
<br/>
<p>Dear {{employee.name}},</p>
<p>Your content here…</p>
<br/>
<p>Regards,<br/>HR Team<br/>{{company.name}}</p>`,
  emailSubject: "",
  emailBody: "",
  version: "1.0",
  status: "ACTIVE",
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: Props) {
  const isEdit = !!template;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(DEFAULT_FORM);

  useEffect(() => {
    if (!open) return;
    if (template) {
      fetch(`/api/document-templates/${template.id}`)
        .then((r) => r.json())
        .then((t) => {
          setForm({
            name: t.name ?? "",
            code: t.code ?? "",
            type: t.type ?? "CUSTOM",
            category: t.category ?? "EMPLOYMENT",
            description: t.description ?? "",
            subject: t.subject ?? "",
            content: t.content ?? "",
            emailSubject: t.emailSubject ?? "",
            emailBody: t.emailBody ?? "",
            version: t.version ?? "1.0",
            status: t.status ?? "ACTIVE",
          });
        })
        .catch(() => toast.error("Failed to load template"));
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, template]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function insertVariable(variable: string) {
    set("content", `${form.content}\n${variable}`);
  }

  async function handleSubmit() {
    if (!form.name || !form.code || !form.content) {
      toast.error("Name, code and content are required.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/document-templates/${template!.id}`
        : "/api/document-templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save template");
      }
      toast.success(isEdit ? "Template updated." : "Template created.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    if (!template) return;
    setLoading(true);
    try {
      const dup = {
        ...form,
        name: `${form.name} (Copy)`,
        code: `${form.code}-COPY`,
        status: "DRAFT",
      };
      const res = await fetch("/api/document-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dup),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate template");
      }
      toast.success("Template duplicated.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Duplicate failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {isEdit ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            Design an HTML template with{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
              {"{{variables}}"}
            </code>{" "}
            that auto-populate from employee, company, and document data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[64vh]">
          <div className="px-6 py-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Template Name *">
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Appointment Letter"
                    />
                  </Field>
                  <Field label="Code *">
                    <Input
                      value={form.code}
                      onChange={(e) =>
                        set("code", e.target.value.toUpperCase())
                      }
                      placeholder="APPT"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Type">
                    <Select
                      value={form.type}
                      onValueChange={(v) => set("type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select
                      value={form.category}
                      onValueChange={(v) => set("category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Subject (internal)">
                    <Input
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      placeholder="Subject for internal reference"
                    />
                  </Field>
                  <Field label="Version">
                    <Input
                      value={form.version}
                      onChange={(e) => set("version", e.target.value)}
                      placeholder="1.0"
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={form.status}
                      onValueChange={(v) => set("status", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Description" className="md:col-span-2">
                    <Textarea
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="What is this template used for?"
                      rows={2}
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                  <Field label="HTML Content *">
                    <Textarea
                      value={form.content}
                      onChange={(e) => set("content", e.target.value)}
                      rows={20}
                      className="font-mono text-xs"
                      placeholder="<h2>{{company.name}}</h2>..."
                    />
                  </Field>
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Available Variables
                    </div>
                    {VARIABLE_GROUPS.map((g) => (
                      <div key={g.label} className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                          {g.label}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {g.vars.map((v) => (
                            <button
                              key={v}
                              onClick={() => insertVariable(v)}
                              title={`Insert ${v}`}
                              className="text-[10px] font-mono bg-muted hover:bg-primary/10 hover:text-primary px-1.5 py-0.5 rounded transition border border-border"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Live Preview
                  </div>
                  <div className="rounded-lg border border-border bg-white p-4 max-h-72 overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html:
                          form.content ||
                          "<p class='text-muted-foreground'>Preview will appear here…</p>",
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <Field label="Email Subject">
                  <Input
                    value={form.emailSubject}
                    onChange={(e) => set("emailSubject", e.target.value)}
                    placeholder="Your document from {{company.name}}"
                  />
                </Field>
                <Field label="Email Body">
                  <Textarea
                    value={form.emailBody}
                    onChange={(e) => set("emailBody", e.target.value)}
                    rows={10}
                    placeholder="Dear {{employee.name}}, please find attached…"
                  />
                </Field>
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                  The attached PDF will be auto-generated when HR sends the
                  document. Variables in the email body are resolved using the
                  same context as the document content.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border justify-between gap-2">
          <div>
            {isEdit && (
              <Button
                variant="outline"
                onClick={handleDuplicate}
                disabled={loading}
              >
                <Copy className="size-4 mr-1.5" /> Duplicate
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
