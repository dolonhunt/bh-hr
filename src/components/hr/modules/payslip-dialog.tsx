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
  Printer,
  Calculator,
  TrendingDown,
  Building2,
  Receipt,
  ShieldCheck,
  FileDown,
  Sparkles,
  Send,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { printDocument } from "@/lib/print";
import { formatCurrency } from "@/lib/utils";
import { EmailPayslipDialog } from "./email-payslip-dialog";

// =========================================================
// Types
// =========================================================

interface TdsBreakdownRow {
  slabId: string;
  slabLabel: string;
  rate: number;
  taxableAmountInSlab: number;
  taxForSlab: number;
}

interface PayrollBreakdown {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  pf: number;
  professionalTax: number;
  tds: number;
  tdsBreakdown: TdsBreakdownRow[];
  gratuity: number;
  customDeductions: number;
  totalDeductions: number;
  netSalary: number;
  taxSlab: { id: string; label: string; rate: number; min: number; max: number | null } | null;
  annualIncome: number;
  annualTax: number;
}

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

  // "Calculate Payroll" step state
  const [breakdown, setBreakdown] = useState<PayrollBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);

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

  // Enhanced PDF download state
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Email payslip (enhanced PDF attachment) sub-dialog state
  const [emailPayslipOpen, setEmailPayslipOpen] = useState(false);

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
      setBreakdown(null);
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

  async function handleCalculate() {
    if (!employeeId || !month) {
      toast.error("Employee and month are required.");
      return;
    }
    setCalculating(true);
    try {
      const r = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to calculate payroll");
      }
      const data = await r.json();
      setBreakdown(data);
      toast.success("Payroll breakdown calculated.");
    } catch (err: any) {
      toast.error(err.message || "Calculation failed");
      setBreakdown(null);
    } finally {
      setCalculating(false);
    }
  }

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

      // Auto-fetch the advanced breakdown so the success state can show it.
      if (!breakdown) {
        try {
          const calcRes = await fetch("/api/payroll/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, month }),
          });
          if (calcRes.ok) {
            const calcData = await calcRes.json();
            setBreakdown(calcData);
          }
        } catch {
          // non-fatal — breakdown just won't be shown
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadEnhancedPdf() {
    if (!employeeId || !month) {
      toast.error("Employee and month are required.");
      return;
    }
    setDownloadingPdf(true);
    try {
      const r = await fetch(
        `/api/payroll/payslip-pdf?employeeId=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(month)}`
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate PDF");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Try to grab filename from Content-Disposition header
      const cd = r.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";\n]+)"?/i);
      a.download = match ? match[1] : `payslip-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Enhanced payslip PDF downloaded.");
    } catch (err: any) {
      toast.error(err.message || "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function downloadUrl(format: "docx" | "pdf") {
    if (!generatedDoc) return;
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
    setBreakdown(null);
    setEmailOpen(false);
    setPreviewOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              Generate Payslip
            </DialogTitle>
            <DialogDescription>
              Auto-creates a payroll record (if missing) and generates a payslip
              document. Use <span className="font-medium">Calculate Payroll</span> to preview the breakdown first.
            </DialogDescription>
          </DialogHeader>

          {!generatedDoc ? (
            <>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        onValueChange={(v) => {
                          setEmployeeId(v);
                          setBreakdown(null);
                        }}
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
                      onChange={(e) => {
                        setMonth(e.target.value);
                        setBreakdown(null);
                      }}
                    />
                  </div>
                </div>

                {/* Calculate Payroll action */}
                {selectedEmp && !breakdown && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calculator className="size-4 text-emerald-700 flex-shrink-0" />
                      <div className="text-xs text-muted-foreground min-w-0">
                        <span className="font-medium text-foreground">Calculate Payroll</span>
                        <span className="hidden sm:inline"> — preview HRA, PF, TDS, gratuity & net salary before generating the payslip.</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 flex-shrink-0"
                      onClick={handleCalculate}
                      disabled={calculating}
                    >
                      {calculating ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <Calculator className="size-4 mr-1.5" />
                      )}
                      Calculate
                    </Button>
                  </div>
                )}

                {/* Breakdown display */}
                {breakdown && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Receipt className="size-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          Payroll Breakdown
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {breakdown.taxSlab && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Slab: {breakdown.taxSlab.label} ({Math.round(breakdown.taxSlab.rate * 100)}%)
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setBreakdown(null)}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      {/* Earnings */}
                      <div className="p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Earnings
                        </div>
                        <BreakdownRow
                          icon={<Wallet className="size-3.5" />}
                          label="Basic Salary"
                          value={formatCurrency(breakdown.basicSalary)}
                        />
                        <BreakdownRow
                          icon={<Building2 className="size-3.5" />}
                          label="House Rent Allowance (50%)"
                          value={formatCurrency(breakdown.hra)}
                          muted
                        />
                        <BreakdownRow
                          icon={<Wallet className="size-3.5" />}
                          label="Special Allowance"
                          value={formatCurrency(breakdown.specialAllowance)}
                          muted
                        />
                        {breakdown.customDeductions < 0 && (
                          <BreakdownRow
                            icon={<Wallet className="size-3.5" />}
                            label="Additional Allowances"
                            value={formatCurrency(-breakdown.customDeductions)}
                            muted
                          />
                        )}
                        <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-border">
                          <span className="text-xs font-semibold">Gross Salary</span>
                          <span className="text-sm font-bold tabular-nums text-emerald-700">
                            {formatCurrency(breakdown.grossSalary)}
                          </span>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div className="p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Deductions
                        </div>
                        <BreakdownRow
                          icon={<ShieldCheck className="size-3.5" />}
                          label="Provident Fund (12%)"
                          value={`- ${formatCurrency(breakdown.pf)}`}
                          danger
                        />
                        <BreakdownRow
                          icon={<Receipt className="size-3.5" />}
                          label="Professional Tax"
                          value={`- ${formatCurrency(breakdown.professionalTax)}`}
                          danger
                        />
                        <BreakdownRow
                          icon={<TrendingDown className="size-3.5" />}
                          label="TDS (Income Tax)"
                          value={`- ${formatCurrency(breakdown.tds)}`}
                          danger
                        />
                        {breakdown.customDeductions > 0 && (
                          <BreakdownRow
                            icon={<TrendingDown className="size-3.5" />}
                            label="Custom Deductions"
                            value={`- ${formatCurrency(breakdown.customDeductions)}`}
                            danger
                          />
                        )}
                        <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-border">
                          <span className="text-xs font-semibold">Total Deductions</span>
                          <span className="text-sm font-bold tabular-nums text-rose-600">
                            - {formatCurrency(breakdown.totalDeductions)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary */}
                    <div className="px-3 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet className="size-4 text-emerald-700 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-800">
                          Net Salary (Take-home)
                        </span>
                      </div>
                      <span className="text-lg font-bold tabular-nums text-emerald-700">
                        {formatCurrency(breakdown.netSalary)}
                      </span>
                    </div>

                    {/* TDS Breakdown */}
                    {breakdown.tdsBreakdown.length > 0 && (
                      <details className="border-t border-border">
                        <summary className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted/30 select-none flex items-center gap-1.5">
                          <Calculator className="size-3.5" />
                          TDS Slab Breakdown
                          <span className="ml-auto text-muted-foreground font-mono">
                            Annual: {formatCurrency(breakdown.annualIncome)} · Tax: {formatCurrency(breakdown.annualTax)}
                          </span>
                        </summary>
                        <div className="px-3 pb-3 space-y-1">
                          {breakdown.tdsBreakdown.map((row) => (
                            <div
                              key={row.slabId}
                              className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {row.slabLabel}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  Taxable: {formatCurrency(row.taxableAmountInSlab)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-muted-foreground font-mono">
                                  {Math.round(row.rate * 100)}%
                                </span>
                                <span className="font-semibold tabular-nums text-rose-600">
                                  {formatCurrency(row.taxForSlab)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Employer Contribution (informational) */}
                    <div className="px-3 py-2 bg-muted/20 border-t border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Employer Contribution — Gratuity (4.81% of basic)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(breakdown.gratuity)} (informational)
                      </span>
                    </div>
                  </div>
                )}

                {/* Fallback basic info if no breakdown yet */}
                {!breakdown && selectedEmp && (
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
                      <span className="text-muted-foreground">Tax (employee record)</span>
                      <span className="font-medium tabular-nums">
                        ৳{selectedEmp.tax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span className="font-medium">Net (simple)</span>
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

                {/* Breakdown preview (if available) */}
                {breakdown && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-700" />
                      <span className="text-sm font-medium text-emerald-800">
                        Advanced Payroll Breakdown
                      </span>
                      {breakdown.taxSlab && (
                        <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/20">
                          {Math.round(breakdown.taxSlab.rate * 100)}% slab
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Earnings
                        </div>
                        <MiniBreakdownRow label="Basic" value={formatCurrency(breakdown.basicSalary)} />
                        <MiniBreakdownRow label="HRA" value={formatCurrency(breakdown.hra)} muted />
                        <MiniBreakdownRow label="Special Allow." value={formatCurrency(breakdown.specialAllowance)} muted />
                        <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-border text-xs">
                          <span className="font-semibold">Gross</span>
                          <span className="font-bold tabular-nums text-emerald-700">
                            {formatCurrency(breakdown.grossSalary)}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Deductions
                        </div>
                        <MiniBreakdownRow label="PF" value={`-${formatCurrency(breakdown.pf)}`} danger />
                        <MiniBreakdownRow label="Prof. Tax" value={`-${formatCurrency(breakdown.professionalTax)}`} danger />
                        <MiniBreakdownRow label="TDS" value={`-${formatCurrency(breakdown.tds)}`} danger />
                        <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-border text-xs">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold tabular-nums text-rose-600">
                            -{formatCurrency(breakdown.totalDeductions)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-emerald-800">
                        Net Salary (Take-home)
                      </span>
                      <span className="text-lg font-bold tabular-nums text-emerald-700">
                        {formatCurrency(breakdown.netSalary)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Enhanced PDF download — primary action */}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={downloadEnhancedPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="size-4 mr-2" />
                  )}
                  Download PDF (Enhanced)
                </Button>

                {/* Email enhanced payslip PDF to employee (full-width action) */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
                  onClick={() => setEmailPayslipOpen(true)}
                  disabled={!employeeId || !month}
                  title="Email the enhanced payslip PDF to the employee"
                >
                  <Send className="size-4 mr-2" />
                  Email Payslip (with PDF attachment)
                </Button>

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
                    onClick={() =>
                      printDocument({
                        title: generatedDoc.title || generatedDoc.documentNumber || "Payslip",
                        html: generatedDoc.content ?? "",
                        docNumber: generatedDoc.documentNumber,
                      })
                    }
                  >
                    <Printer className="size-4 mr-2" /> Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadUrl("docx")}
                  >
                    <Download className="size-4 mr-2" /> DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadUrl("pdf")}
                  >
                    <Download className="size-4 mr-2" /> PDF (basic)
                  </Button>
                  <Button
                    size="sm"
                    className="col-span-2"
                    onClick={() => setEmailOpen(true)}
                  >
                    <Mail className="size-4 mr-2" /> Send Email
                  </Button>
                </div>

                <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    The enhanced PDF uses the advanced payroll breakdown
                    (HRA, PF, progressive-slab TDS, gratuity). DOCX/PDF
                    basic and email send endpoints are served by the Documents
                    module.
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
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">Payslip Preview</DialogTitle>
                <DialogDescription className="truncate">
                  {generatedDoc?.title}
                </DialogDescription>
              </div>
              {generatedDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    printDocument({
                      title: generatedDoc.title || generatedDoc.documentNumber || "Payslip",
                      html: generatedDoc.content ?? "",
                      docNumber: generatedDoc.documentNumber,
                    })
                  }
                >
                  <Printer className="size-4 mr-1.5" /> Print
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] bg-white">
            <div
              className="p-4 sm:p-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: generatedDoc?.content ?? "",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email sub-dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 gap-0">
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

      {/* Email Payslip sub-dialog (enhanced PDF attachment) */}
      <EmailPayslipDialog
        open={emailPayslipOpen}
        onOpenChange={setEmailPayslipOpen}
        employeeId={employeeId}
        month={month}
        onSent={() => onSaved?.()}
      />
    </>
  );
}

// =========================================================
// Small sub-component: breakdown row
// =========================================================

function BreakdownRow({
  icon,
  label,
  value,
  muted,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`flex-shrink-0 ${danger ? "text-rose-600" : muted ? "text-muted-foreground" : "text-foreground"}`}>
          {icon}
        </span>
        <span className={`${muted ? "text-muted-foreground" : "text-foreground"} truncate`}>
          {label}
        </span>
      </div>
      <span
        className={`font-mono tabular-nums flex-shrink-0 ${danger ? "text-rose-600" : muted ? "text-muted-foreground" : "text-foreground font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

// Small breakdown row used in the success-state mini breakdown preview
function MiniBreakdownRow({
  label,
  value,
  muted,
  danger,
}: {
  label: string;
  value: string;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={`${muted ? "text-muted-foreground" : "text-foreground"} truncate`}>
        {label}
      </span>
      <span
        className={`font-mono tabular-nums flex-shrink-0 ${danger ? "text-rose-600" : muted ? "text-muted-foreground" : "text-foreground font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
