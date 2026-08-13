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
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  FileText,
  Download,
  Mail,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetEmployeeId?: string | null;
  onSaved?: () => void;
}

export function PayslipDialog({
  open,
  onOpenChange,
  presetEmployeeId,
  onSaved,
}: Props) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [employeeId, setEmployeeId] = useState<string>(presetEmployeeId || "");
  const [month, setMonth] = useState(currentMonth);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any | null>(null);

  // Email sub-dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Preview sub-dialog state
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-payslip"],
    queryFn: () => fetch(`/api/employees?pageSize=200`).then((r) => r.json()),
    enabled: open,
  });
  const employees = employeesData?.items ?? [];

  const selectedEmp = employees.find((e: any) => e.id === employeeId);

  useEffect(() => {
    if (open) {
      setEmployeeId(presetEmployeeId || "");
      setMonth(currentMonth);
      setGeneratedDoc(null);
    }
  }, [open, presetEmployeeId]);

  // Pre-fill email when generated doc changes
  useEffect(() => {
    if (generatedDoc) {
      const emp = employees.find((e: any) => e.id === generatedDoc.employeeId);
      setEmailTo(emp?.officialEmail || emp?.personalEmail || "");
      const dataJson = (() => {
        try {
          return JSON.parse(generatedDoc.dataJson);
        } catch {
          return {};
        }
      })();
      setEmailSubject(dataJson.emailSubject || `Payslip - ${generatedDoc.month}`);
      setEmailBody(dataJson.emailBody || "");
    }
  }, [generatedDoc, employees]);

  async function handleGenerate() {
    if (!employeeId || !month) {
      toast.error("Employee and month are required.");
      return;
    }
    setGenerating(true);
    try {
      const r = await fetch("/api/payroll/generate-payslip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate payslip");
      }
      const doc = await r.json();
      setGeneratedDoc(doc);
      toast.success("Payslip generated successfully.");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function downloadUrl(format: "docx" | "pdf") {
    if (!generatedDoc) return;
    // Note: /api/documents/[id]/download is built by Task 1-A.
    // We just open the URL; it will resolve once that endpoint exists.
    window.open(
      `/api/documents/${generatedDoc.id}/download?format=${format}`,
      "_blank"
    );
  }

  async function handleSendEmail() {
    if (!generatedDoc) return;
    if (!emailTo) {
      toast.error("Recipient email is required.");
      return;
    }
    setSendingEmail(true);
    try {
      const r = await fetch(`/api/documents/${generatedDoc.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientTo: emailTo,
          recipientCc: emailCc || null,
          recipientBcc: emailBcc || null,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send email");
      }
      toast.success("Email queued for delivery.");
      setEmailOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    } finally {
      setSendingEmail(false);
    }
  }

  function reset() {
    setGeneratedDoc(null);
    setEmailOpen(false);
    setPreviewOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              Generate Payslip
            </DialogTitle>
            <DialogDescription>
              Auto-creates a payroll record (if missing) and generates a payslip
              document.
            </DialogDescription>
          </DialogHeader>

          {!generatedDoc ? (
            <>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Employee *
                  </Label>
                  {presetEmployeeId && selectedEmp ? (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">
                        {selectedEmp.fullName}
                      </span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {selectedEmp.employeeId}
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={employeeId}
                      onValueChange={(v) => setEmployeeId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.fullName} · {emp.employeeId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Pay Period (Month) *
                  </Label>
                  <Input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>

                {selectedEmp && (
                  <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-medium tabular-nums">
                        ৳{selectedEmp.basicSalary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowances</span>
                      <span className="font-medium tabular-nums">
                        ৳{selectedEmp.allowances.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="font-medium tabular-nums">
                        ৳{selectedEmp.deductions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium tabular-nums">
                        ৳{selectedEmp.tax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span className="font-medium">Net Salary</span>
                      <span className="font-bold tabular-nums">
                        ৳
                        {(
                          selectedEmp.basicSalary +
                          selectedEmp.allowances -
                          selectedEmp.deductions -
                          selectedEmp.tax
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border">
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Generate Payslip
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="px-6 py-4 space-y-4">
                {/* Success state */}
                <div className="flex flex-col items-center text-center py-2">
                  <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div className="font-semibold">Payslip Generated</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Document number:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {generatedDoc.documentNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="size-4 mr-2" /> Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadUrl("docx")}
                  >
                    <Download className="size-4 mr-2" /> Download DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadUrl("pdf")}
                  >
                    <Download className="size-4 mr-2" /> Download PDF
                  </Button>
                  <Button size="sm" onClick={() => setEmailOpen(true)}>
                    <Mail className="size-4 mr-2" /> Send Email
                  </Button>
                </div>

                <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    The DOCX/PDF download and email send endpoints are served by
                    the Documents module.
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border">
                <Button variant="outline" onClick={reset}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setGeneratedDoc(null)}
                >
                  Generate Another
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview sub-dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Payslip Preview</DialogTitle>
            <DialogDescription>{generatedDoc?.title}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] bg-white">
            <div
              className="p-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: generatedDoc?.content ?? "",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email sub-dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              Send Payslip by Email
            </DialogTitle>
            <DialogDescription>
              Attach the generated payslip and send to the employee.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                To *
              </Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="employee@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  CC
                </Label>
                <Input
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="cc@example.com"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  BCC
                </Label>
                <Input
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                  placeholder="bcc@example.com"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Subject
              </Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Body
              </Label>
              <Textarea
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
