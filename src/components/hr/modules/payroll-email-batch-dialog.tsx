"use client";

import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarBadge } from "../shared/avatar-badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MailCheck,
  MailX,
  Send,
  Info,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// PayrollEmailBatchDialog — "Email Payslips" for a whole month.
// Lists every APPROVED/any-status payroll record for the chosen
// month with the employee's resolved recipient address, then runs
// the batch endpoint (real SMTP with PDF attached when configured,
// simulated otherwise) and reports per-employee results.
// ============================================================

interface BatchResult {
  employeeId: string;
  employeeName: string;
  recipientTo?: string;
  ok: boolean;
  error?: string;
  emailLogId?: string;
}

interface BatchResponse {
  ok: boolean;
  mode: "smtp" | "simulated";
  month: string;
  totals: { attempted: number; sent: number; failed: number; skippedNoEmail: number };
  results: BatchResult[];
}

export function PayrollEmailBatchDialog({
  open,
  onOpenChange,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMonth: string;
}) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(defaultMonth);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BatchResponse | null>(null);

  // Preview: payroll rows for the chosen month + resolved emails
  const previewQuery = useQuery({
    queryKey: ["payroll", "email-batch-preview", month],
    queryFn: () =>
      fetch(`/api/payroll?payrollMonth=${month}&pageSize=200`).then((r) => r.json()),
    enabled: open,
  });
  const rows: {
    id: string;
    employeeId?: string;
    status?: string;
    netSalary?: number;
    employee?: {
      fullName?: string;
      officialEmail?: string | null;
      personalEmail?: string | null;
    };
  }[] = previewQuery.data?.items ?? [];
  const emailable = rows.filter(
    (r) => r.employee?.officialEmail || r.employee?.personalEmail
  );

  // Delivery mode (shared ["settings"] cache)
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    enabled: open,
    staleTime: 120_000,
  });
  const mode = settingsQuery.data?.emailMode?.mode ?? "simulated";

  async function run() {
    if (emailable.length === 0) {
      toast.error("No payroll records with an email address for this month.");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch("/api/payroll/email-payslips-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Batch email failed");
      setResult(data);
      toast.success(
        data.mode === "smtp"
          ? `Payslips delivered: ${data.totals.sent} sent, ${data.totals.failed} failed.`
          : `Payslip emails logged (simulated): ${data.totals.sent} recorded, ${data.totals.failed} failed.`
      );
      qc.invalidateQueries({ queryKey: ["email-logs"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Batch email failed");
    } finally {
      setRunning(false);
    }
  }

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setResult(null);
      setMonth(defaultMonth);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            Email Payslips — {month}
          </DialogTitle>
          <DialogDescription>
            Sends every payroll record for the month to its employee with the
            payslip PDF attached. Failures are collected per employee — the
            batch continues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Month + mode */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Payroll month</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setResult(null);
                }}
                className="w-44"
                aria-label="Payroll month"
              />
            </div>
            <Badge
              variant="outline"
              className={cn(
                "h-6 px-2 text-[11px] font-medium cursor-default",
                mode === "smtp"
                  ? "bg-primary/5 text-primary border-primary/30"
                  : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/30"
              )}
            >
              {mode === "smtp" ? (
                <>
                  <MailCheck className="size-3 mr-1" /> Live SMTP — real delivery
                </>
              ) : (
                <>
                  <Info className="size-3 mr-1" /> Simulated — no SMTP configured
                </>
              )}
            </Badge>
          </div>

          {/* Preview list */}
          {!result && (
            <div className="rounded-lg border border-border/60">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30 text-xs">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {previewQuery.isLoading
                    ? "Loading payroll records…"
                    : `${emailable.length} employee${emailable.length !== 1 ? "s" : ""} will receive a payslip email`}
                </span>
                {rows.length > emailable.length && (
                  <span className="text-muted-foreground">
                    ({rows.length - emailable.length} skipped — no email on file)
                  </span>
                )}
              </div>
              <ScrollArea className="max-h-64">
                <div className="divide-y divide-border/40">
                  {previewQuery.isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Loading…
                    </div>
                  ) : emailable.length === 0 ? (
                    <div className="px-3 py-6 text-xs text-muted-foreground">
                      No payroll records for {month}. Create payroll records
                      first (single or Batch Create), then email them.
                    </div>
                  ) : (
                    emailable.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-3 py-2 text-xs"
                      >
                        <AvatarBadge
                          name={r.employee?.fullName ?? ""}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {r.employee?.fullName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.employee?.officialEmail ??
                              r.employee?.personalEmail}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          net ৳{Number(r.netSalary ?? 0).toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 h-4.5 border-border text-muted-foreground"
                        >
                          {r.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-lg border border-border/60">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-border/60 bg-muted/30 text-xs">
                <span className="font-medium">
                  {result.mode === "smtp" ? "Delivered" : "Logged (simulated)"}:{" "}
                  <span className="text-primary font-semibold">
                    {result.totals.sent}
                  </span>
                </span>
                {result.totals.failed > 0 && (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    Failed: {result.totals.failed}
                  </span>
                )}
                {result.totals.skippedNoEmail > 0 && (
                  <span className="text-muted-foreground">
                    Skipped (no email): {result.totals.skippedNoEmail}
                  </span>
                )}
                <span className="text-muted-foreground ml-auto font-mono text-[11px]">
                  {result.month}
                </span>
              </div>
              <ScrollArea className="max-h-56">
                <div className="divide-y divide-border/40">
                  {result.results.map((r) => (
                    <div
                      key={r.employeeId}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs"
                    >
                      {r.ok ? (
                        <MailCheck className="size-3.5 text-primary flex-shrink-0" />
                      ) : (
                        <MailX className="size-3.5 text-rose-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {r.employeeName}
                        </div>
                        {r.ok ? (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.recipientTo}
                          </div>
                        ) : (
                          <div
                            className="text-[11px] text-rose-600 dark:text-rose-400 truncate cursor-help"
                            title={r.error}
                          >
                            {r.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={close} disabled={running}>
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={run}
              disabled={running || previewQuery.isLoading || emailable.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              {running ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending {emailable.length}…
                </>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  Send {emailable.length} email
                  {emailable.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
