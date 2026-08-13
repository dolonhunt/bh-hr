"use client";

import { useState } from "react";
import { PageHeader } from "../shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  FileText,
  Download,
  BarChart3,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportType {
  key: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    key: "employee",
    title: "Employee Report",
    description: "Complete directory with department, role, designation, salary, and joining info.",
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "attendance",
    title: "Attendance Report",
    description: "Daily check-in/out, working hours, late marks, and overtime for the selected period.",
    icon: CalendarCheck,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "leave",
    title: "Leave Report",
    description: "All leave requests with type, days, status, and reasons.",
    icon: CalendarDays,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "payroll",
    title: "Payroll Report",
    description: "Monthly payroll breakdown with basic, allowances, deductions, tax, and net pay.",
    icon: Wallet,
    color: "bg-teal-500/10 text-teal-600",
  },
  {
    key: "document",
    title: "Document Report",
    description: "All generated HR documents with status, template, and recipient details.",
    icon: FileText,
    color: "bg-violet-500/10 text-violet-600",
  },
];

const FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel (.xls)" },
  { value: "pdf", label: "PDF" },
];

export function ReportsModule() {
  const [active, setActive] = useState<ReportType | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate and download HR reports across your organization"
        icon={<BarChart3 className="size-5" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          return (
            <Card
              key={r.key}
              className="border-border/60 shadow-soft hover:shadow-card-hover transition-all flex flex-col"
            >
              <CardContent className="p-5 flex flex-col flex-1">
                <div
                  className={cn(
                    "size-11 rounded-xl flex items-center justify-center mb-3",
                    r.color
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="font-semibold">{r.title}</div>
                <p className="text-sm text-muted-foreground mt-1 flex-1">
                  {r.description}
                </p>
                <Button
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setActive(r)}
                >
                  <Download className="size-4 mr-1.5" /> Generate
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active && (
        <GenerateDialog report={active} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

function GenerateDialog({
  report,
  onClose,
}: {
  report: ReportType;
  onClose: () => void;
}) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [format, setFormat] = useState("csv");
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        type: report.key,
        format,
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/reports/generate?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : format === "excel" ? "xls" : "csv";
      const filename = `${report.key}-report-${new Date().toISOString().split("T")[0]}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Report downloaded (${filename})`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate {report.title}</DialogTitle>
          <DialogDescription>
            Choose a date range and format. Click download to generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format === "excel" && "Excel exports as CSV with .xls extension for MVP."}
              {format === "pdf" && "PDF generated using pdfkit with landscape layout."}
              {format === "csv" && "Comma-separated values, opens in Excel/Sheets."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={download} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Download className="size-4 mr-1.5" /> Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
