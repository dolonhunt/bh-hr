"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Info,
  Download,
  MailCheck,
  MailX,
  Send,
  Loader2,
  CircleCheck,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// =============================================================
// Settings → Automation tab
//
// Owns the scheduled "Monthly HR Summary Report":
//   * enable/disable (Setting monthlyReportEnabled — consumed by
//     GET /api/cron/monthly-report, scheduled via vercel.json)
//   * recipients (Setting monthlyReportRecipients, comma-separated)
//   * "Download PDF preview"  → POST /api/reports/monthly-summary {send:false}
//   * "Send now"              → POST /api/reports/monthly-summary {send:true}
//   * last-run readout (Setting monthlyReportLastRun, written by the sender)
// =============================================================

interface LastRun {
  at: string;
  month: string;
  triggeredBy: string;
  sent: number;
  failed: number;
  mode: string;
}

interface SendResult {
  to: string;
  ok: boolean;
  error?: string;
  mode: string;
}

export function AutomationTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const settings = data?.settings ?? {};
  const enabled = settings.monthlyReportEnabled === "true";
  const emailMode = data?.emailMode?.mode === "smtp" ? "smtp" : "simulated";

  const lastRun: LastRun | null = useMemo(() => {
    const raw = settings.monthlyReportLastRun;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LastRun;
    } catch {
      return null;
    }
  }, [settings.monthlyReportLastRun]);

  const [recipients, setRecipients] = useState<string | null>(null);
  const recipientValue = recipients ?? settings.monthlyReportRecipients ?? "";
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);

  async function persistSettings(entries: Array<{ key: string; value: string }>) {
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: entries }),
    });
    if (!r.ok) throw new Error("Failed to save setting");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  async function toggleEnabled(next: boolean) {
    setSaving(true);
    try {
      await persistSettings([
        { key: "monthlyReportEnabled", value: String(next) },
      ]);
      toast.success(
        next
          ? "Monthly HR summary scheduled — it will be emailed on the 1st of every month (06:00 UTC)."
          : "Monthly HR summary automation disabled."
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to save setting");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipients() {
    setSaving(true);
    try {
      await persistSettings([{ key: "monthlyReportRecipients", value: recipientValue }]);
      toast.success("Report recipients saved.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save recipients");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const r = await fetch("/api/reports/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, send: false }),
      });
      if (!r.ok) throw new Error("Failed to generate PDF");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hr-summary-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report PDF downloaded.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  }

  async function sendNow() {
    setSending(true);
    setResults(null);
    try {
      // Persist any unsaved recipient edits first so the send uses them.
      await persistSettings([
        { key: "monthlyReportRecipients", value: recipientValue },
      ]);
      const r = await fetch("/api/reports/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, send: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Failed to send report");
      setResults(body.results ?? []);
      const sent = (body.results ?? []).filter((x: SendResult) => x.ok).length;
      toast.success(
        `Report for ${body.month}: ${sent} of ${(body.results ?? []).length} email(s) ${
          body.mode === "smtp" ? "delivered" : "logged (simulated)"
        }.`
      );
      qc.invalidateQueries({ queryKey: ["email-logs"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send report");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="size-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">Monthly HR Summary Report</h3>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md cursor-default",
                      enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {enabled ? "Scheduled" : "Off"}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md cursor-default",
                      emailMode === "smtp"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {emailMode === "smtp" ? "Live SMTP" : "Simulated"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  Emails a branded PDF — headcount by department, attendance
                  breakdown, leave stats and payroll totals — to the recipients
                  below. Scheduled runs go out on the{" "}
                  <span className="font-medium text-foreground">1st of every month at 06:00 UTC</span>{" "}
                  via Vercel Cron and cover the previous month.
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              disabled={saving}
              onCheckedChange={toggleEnabled}
              aria-label="Enable monthly HR summary report"
            />
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <Label htmlFor="report-recipients" className="text-xs">
              Recipients (comma-separated email addresses)
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="report-recipients"
                type="text"
                placeholder="hr@company.com, ceo@company.com"
                value={recipientValue}
                onChange={(e) => setRecipients(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer sm:w-28"
                disabled={saving || !recipientValue.trim()}
                onClick={saveRecipients}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save list"
                )}
              </Button>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-month" className="text-xs">
                Report month
              </Label>
              <Input
                id="report-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="sm:w-44"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-0.5">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={downloading}
                onClick={downloadPdf}
              >
                {downloading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="size-4 mr-1.5" />
                )}
                PDF preview
              </Button>
              <Button
                size="sm"
                className="cursor-pointer"
                disabled={sending || !recipientValue.trim()}
                onClick={sendNow}
              >
                {sending ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                Send now
              </Button>
            </div>
          </div>

          {/* Send results */}
          {results && results.length > 0 && (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-muted/40 text-xs font-semibold flex items-center gap-2">
                <CircleCheck className="size-3.5 text-primary" />
                Delivery results
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-border/40">
                {results.map((r) => (
                  <div
                    key={r.to}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-mono truncate min-w-0">{r.to}</span>
                    {r.ok ? (
                      <span className="text-primary font-medium whitespace-nowrap flex-shrink-0">
                        {r.mode === "smtp" ? "Delivered" : "Logged (simulated)"}
                      </span>
                    ) : (
                      <span
                        className="text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap flex-shrink-0 truncate max-w-[220px] cursor-help"
                        title={r.error}
                      >
                        Failed — {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last run readout */}
          {lastRun ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-3 text-xs">
              <History className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="font-semibold">Last run</span>{" "}
                <span className="text-muted-foreground">
                  {new Date(lastRun.at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {" — "}
                <span className="text-muted-foreground">
                  {lastRun.month} report ({lastRun.triggeredBy === "cron" ? "scheduled" : "manual"}):{" "}
                  <span
                    className={cn(
                      "font-medium",
                      lastRun.failed === 0 ? "text-primary" : "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {lastRun.sent} sent
                  </span>
                  {lastRun.failed > 0 ? `, ${lastRun.failed} failed` : ""}
                  {lastRun.mode === "simulated" ? " · simulated mode" : ""}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border/60 px-3.5 py-3 text-xs text-muted-foreground">
              <Info className="size-4 mt-0.5 flex-shrink-0 opacity-60" />
              <span>
                No report has been sent yet. Use{" "}
                <span className="font-medium text-foreground">Send now</span> to
                deliver the current month immediately, or wait for the
                scheduled run.
              </span>
            </div>
          )}

          {/* Mode hint */}
          {emailMode === "simulated" && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs",
                "border-amber-500/25 bg-amber-500/5 text-foreground"
              )}
            >
              <MailX className="size-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-muted-foreground">
                Email delivery is currently in{" "}
                <span className="font-medium text-foreground">simulated mode</span>{" "}
                — scheduled sends will be logged in Email History but not
                delivered. Configure SMTP in{" "}
                <span className="font-medium text-foreground">Settings → Email Settings</span>{" "}
                for real delivery.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary card: what else could be automated (honest roadmap teaser) */}
      <Card className="border-border/60 shadow-soft bg-muted/10">
        <CardContent className="p-5 flex items-start gap-3">
          <MailCheck className="size-4 mt-0.5 flex-shrink-0 text-primary" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Everything is audited.{" "}
            </span>
            Each report send writes one Email History row per recipient plus an
            audit-log entry, whether delivered by SMTP or recorded in simulated
            mode — check Documents → Email History after a run.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
