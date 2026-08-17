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
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Paperclip,
  Send,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// =============================================================
// EmailPayslipDialog
//
// Lets HR email the enhanced payslip PDF to an employee.
// All fields auto-fill from the employee + company records, but HR
// can override any of them before sending.
//
// On send → POST /api/payroll/email-payslip
//   Body: { employeeId, month, to, cc, bcc, subject, body }
//   The backend generates the PDF, persists an EmailLog (status="SENT"),
//   and writes an AuditLog entry (action="PAYSLIP_EMAILED").
// =============================================================

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  month: string;
  onSent?: () => void;
}

function fmtMonthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function EmailPayslipDialog({
  open,
  onOpenChange,
  employeeId,
  month,
  onSent,
}: Props) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  // Tracks whether HR has manually edited the body — if so, we don't
  // overwrite their edits when the employee record loads.
  const [bodyTouched, setBodyTouched] = useState(false);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [toTouched, setToTouched] = useState(false);

  // ---- Load employee + company for auto-fill ----
  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => fetch(`/api/employees/${employeeId}`).then((r) => r.json()),
    enabled: open && !!employeeId,
  });

  const { data: companyData } = useQuery({
    queryKey: ["company"],
    queryFn: () => fetch(`/api/company`).then((r) => r.json()),
    enabled: open,
  });
  const company = Array.isArray(companyData)
    ? companyData[0]
    : companyData;

  // Reset state when the dialog closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        setBodyTouched(false);
        setSubjectTouched(false);
        setToTouched(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-fill the inputs once the employee + company load.
  useEffect(() => {
    if (!open || !employee) return;
    const monthLabel = fmtMonthLabel(month);
    const companyName = company?.name ?? "BH HR";

    if (!toTouched) {
      const autoTo = employee.officialEmail || employee.personalEmail || "";
      setTo(autoTo);
    }
    if (!subjectTouched) {
      setSubject(`Payslip for ${monthLabel} - ${companyName}`);
    }
    if (!bodyTouched) {
      const greeting = `Dear ${employee.fullName},`;
      const line = `Please find attached your payslip for ${monthLabel}.`;
      const sig = [
        "Regards,",
        companyName,
        company?.email ?? "",
        company?.phone ?? "",
      ]
        .filter(Boolean)
        .join("\n");
      setBody(`${greeting}\n\n${line}\n\n${sig}`);
    }
  }, [open, employee, company, month, toTouched, subjectTouched, bodyTouched]);

  const employeeName = employee?.fullName ?? "employee";
  const attachmentName = `payslip-${slugify(employeeName)}-${month}.pdf`;

  function previewPayslip() {
    if (!employeeId || !month) {
      toast.error("Employee and month are required.");
      return;
    }
    const url = `/api/payroll/payslip-pdf?employeeId=${encodeURIComponent(
      employeeId
    )}&month=${encodeURIComponent(month)}`;
    window.open(url, "_blank");
  }

  async function handleSend() {
    if (!employeeId || !month) {
      toast.error("Employee and month are required.");
      return;
    }
    if (!to.trim()) {
      toast.error("Recipient (To) is required.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!body.trim()) {
      toast.error("Body is required.");
      return;
    }
    setSending(true);
    try {
      const r = await fetch(`/api/payroll/email-payslip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month,
          to: to.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send email");
      }
      const data = await r.json();
      toast.success(`Payslip emailed to ${employeeName}`);
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Email Payslip
          </DialogTitle>
          <DialogDescription>
            Send the enhanced payslip PDF to{" "}
            <span className="font-medium text-foreground">{employeeName}</span>{" "}
            for <span className="font-medium text-foreground">{fmtMonthLabel(month)}</span>.
            All fields are auto-filled but can be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3">
          {!employee && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-3.5 animate-spin" />
              Loading employee record…
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              To *
            </Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setToTouched(true);
              }}
              placeholder="employee@company.com"
            />
            {!to && employee && (
              <p className="text-[10px] text-amber-600 mt-1">
                This employee has no official or personal email on file —
                please enter a recipient.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Subject *
            </Label>
            <Input
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSubjectTouched(true);
              }}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Body *
            </Label>
            <Textarea
              rows={7}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setBodyTouched(true);
              }}
            />
          </div>

          {/* Attachment note */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2.5">
            <Paperclip className="size-4 text-emerald-700 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-emerald-800 truncate">
                {attachmentName}
              </div>
              <div className="text-[10px] text-emerald-700/70">
                Enhanced payslip PDF · auto-generated from advanced payroll breakdown
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-shrink-0"
              onClick={previewPayslip}
              title="Open the payslip PDF in a new tab to preview before sending"
            >
              <Eye className="size-3.5 mr-1" />
              Preview
            </Button>
          </div>

          <div className="rounded-md bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <RefreshCw className="size-3 flex-shrink-0 mt-0.5" />
            <span>
              The send is simulated in this sandbox (no SMTP configured) but
              every send is recorded in the Email Log and Audit Log with the
              PDF attachment reference.
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
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
