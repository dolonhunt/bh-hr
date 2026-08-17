"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  FileText,
  Download,
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Sparkles,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  ShieldAlert,
  Gauge,
} from "lucide-react";

import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AvatarBadge } from "../shared/avatar-badge";
import { cn, formatCurrency } from "@/lib/utils";

// ============================================================
// Color palette for chart series — purple primary, with the
// requested accents. No indigo/blue.
// ============================================================
const CHART_COLORS = [
  "#6D3FC4", // purple
  "#f59e0b", // amber
  "#ef4444", // rose
  "#14b8a6", // teal
  "#a855f7", // violet
  "#f97316", // orange
  "#ec4899", // fuchsia
];

// ============================================================
// Types for the analytics payload (mirrors the API route).
// ============================================================
interface AnalyticsPayload {
  kpis: {
    totalEmployees: number;
    avgAttendanceRate: number;
    totalPayrollThisMonth: number;
    docsGeneratedThisMonth: number;
  };
  employeeGrowth: { month: string; hires: number; cumulative: number }[];
  attendanceTrend: {
    date: string;
    rate: number;
    present: number;
    total: number;
  }[];
  leaveUtilization: {
    name: string;
    value: number;
    count: number;
    color: string;
  }[];
  payrollByDepartment: { name: string; netSalary: number }[];
  documentTrend: {
    data: Record<string, any>[];
    types: string[];
  };
  performanceDistribution: { range: string; count: number }[];
  recruitmentFunnel: {
    stage: string;
    count: number;
    atStage: number;
  }[];
}

// ============================================================
// Report type cards (preserved from previous reports module).
// ============================================================
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
    description:
      "Complete directory with department, role, designation, salary, and joining info.",
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "attendance",
    title: "Attendance Report",
    description:
      "Daily check-in/out, working hours, late marks, and overtime for the selected period.",
    icon: CalendarCheck,
    color: "bg-primary/10 text-primary",
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
    description:
      "Monthly payroll breakdown with basic, allowances, deductions, tax, and net pay.",
    icon: Wallet,
    color: "bg-teal-500/10 text-teal-600",
  },
  {
    key: "document",
    title: "Document Report",
    description:
      "All generated HR documents with status, template, and recipient details.",
    icon: FileText,
    color: "bg-violet-500/10 text-violet-600",
  },
];

const FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel (.xls)" },
  { value: "pdf", label: "PDF" },
];

// ============================================================
// Main ReportsModule component.
// ============================================================
export function ReportsModule() {
  const { data, isLoading, isError } = useQuery<AnalyticsPayload>({
    queryKey: ["reports", "analytics"],
    queryFn: async () => {
      const r = await fetch("/api/reports/analytics");
      if (!r.ok) throw new Error("Failed to load analytics");
      return r.json();
    },
    staleTime: 60 * 1000,
  });

  const [active, setActive] = useState<ReportType | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Live analytics dashboard plus on-demand report exports across your organization"
        icon={<BarChart3 className="size-5" />}
      />

      {/* Top KPI cards */}
      <KpiRow data={data} loading={isLoading} />

      {/* Analytics dashboard — 6 charts in a responsive grid */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Analytics Dashboard</h2>
        </div>

        {isError && (
          <Card className="border-rose-500/30">
            <CardContent className="p-6 text-sm text-rose-700">
              Failed to load analytics data. Please refresh the page to retry.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Employee Growth"
            subtitle="Monthly hires & cumulative headcount (last 12 months)"
            loading={isLoading}
          >
            <EmployeeGrowthChart data={data?.employeeGrowth ?? []} />
          </ChartCard>

          <ChartCard
            title="Attendance Rate Trend"
            subtitle="% present (PRESENT + LATE) — last 30 days"
            loading={isLoading}
          >
            <AttendanceTrendChart data={data?.attendanceTrend ?? []} />
          </ChartCard>

          <ChartCard
            title="Leave Utilization by Type"
            subtitle="Total leave days consumed, by leave type"
            loading={isLoading}
          >
            <LeaveUtilizationChart data={data?.leaveUtilization ?? []} />
          </ChartCard>

          <ChartCard
            title="Payroll by Department"
            subtitle="Net salary distribution this month"
            loading={isLoading}
          >
            <PayrollByDeptChart data={data?.payrollByDepartment ?? []} />
          </ChartCard>

          <ChartCard
            title="Document Generation Trend"
            subtitle="Documents generated by type (last 6 months)"
            loading={isLoading}
          >
            <DocumentTrendChart
              data={data?.documentTrend?.data ?? []}
              types={data?.documentTrend?.types ?? []}
            />
          </ChartCard>

          <ChartCard
            title="Performance Score Distribution"
            subtitle="Employee count per overall-score bucket"
            loading={isLoading}
          >
            <PerformanceDistChart
              data={data?.performanceDistribution ?? []}
            />
          </ChartCard>
        </div>
      </section>

      {/* Predictions & Insights */}
      <PredictionsSection />

      {/* Recruitment funnel */}
      <RecruitmentFunnelSection
        data={data?.recruitmentFunnel ?? []}
        loading={isLoading}
      />

      {/* Export reports */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Download className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Export Reports</h2>
        </div>
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
      </section>

      {active && (
        <GenerateDialog report={active} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

// ============================================================
// KPI row
// ============================================================
function KpiRow({
  data,
  loading,
}: {
  data?: AnalyticsPayload;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard
        label="Total Employees"
        value={data.kpis.totalEmployees}
        icon={Users}
        iconClass="bg-primary/10 text-primary"
      />
      <KpiCard
        label="Avg Attendance (30d)"
        value={`${data.kpis.avgAttendanceRate}%`}
        icon={CalendarCheck}
        iconClass="bg-primary/10 text-primary"
      />
      <KpiCard
        label="Payroll This Month"
        value={formatCurrency(data.kpis.totalPayrollThisMonth)}
        icon={Wallet}
        iconClass="bg-teal-500/10 text-teal-600"
      />
      <KpiCard
        label="Docs This Month"
        value={data.kpis.docsGeneratedThisMonth}
        icon={FileText}
        iconClass="bg-violet-500/10 text-violet-600"
      />
    </div>
  );
}

// ============================================================
// Chart card wrapper
// ============================================================
function ChartCard({
  title,
  subtitle,
  loading,
  children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 shadow-soft overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 1. Employee Growth — LineChart (hires + cumulative)
// ============================================================
function EmployeeGrowthChart({
  data,
}: {
  data: { month: string; hires: number; cumulative: number }[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, n: string) => [
            n === "cumulative" ? `${v} employees` : `${v} hires`,
            n === "cumulative" ? "Cumulative" : "Hires",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="hires"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS[0] }}
          name="Hires"
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          name="Cumulative"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 2. Attendance Rate Trend — AreaChart (30 days)
// ============================================================
function AttendanceTrendChart({
  data,
}: {
  data: { date: string; rate: number; present: number; total: number }[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, n: string) => [
            n === "rate" ? `${v}%` : v,
            n === "rate" ? "Attendance Rate" : n,
          ]}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#attGrad)"
          name="Attendance Rate"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 3. Leave Utilization by Type — Donut chart
// ============================================================
function LeaveUtilizationChart({
  data,
}: {
  data: { name: string; value: number; count: number; color: string }[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, idx) => (
            <Cell
              key={`cell-${idx}`}
              fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n: string, p: any) => [
            `${v} days (${p.payload.count} requests)`,
            p.payload.name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          layout="horizontal"
          align="center"
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 4. Payroll by Department — Horizontal BarChart
// ============================================================
function PayrollByDeptChart({
  data,
}: {
  data: { name: string; netSalary: number }[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  // Reverse so the largest bar appears at the top of the chart.
  const rows = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={rows}
        margin={{ top: 8, right: 16, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any) => [formatCurrency(v), "Net Payroll"]}
        />
        <Bar dataKey="netSalary" radius={[0, 4, 4, 0]} barSize={18}>
          {rows.map((_, idx) => (
            <Cell key={`pc-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 5. Document Generation Trend — Stacked BarChart by type
// ============================================================
function DocumentTrendChart({
  data,
  types,
}: {
  data: Record<string, any>[];
  types: string[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  const seriesKeys = [...types, "Other"].filter(Boolean);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {seriesKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="docs"
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            name={key.replace(/_/g, " ")}
            barSize={28}
            radius={idx === seriesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 6. Performance Score Distribution — Histogram BarChart
// ============================================================
function PerformanceDistChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, "Employees"]} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
          {data.map((_, idx) => (
            <Cell key={`pd-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Recruitment Funnel — custom horizontal funnel
// ============================================================
function RecruitmentFunnelSection({
  data,
  loading,
}: {
  data: { stage: string; count: number; atStage: number }[];
  loading: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Recruitment Funnel</h2>
        <span className="text-xs text-muted-foreground">
          Cumulative candidates reaching each pipeline stage
        </span>
      </div>
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No recruitment data yet.
            </div>
          ) : (
            <FunnelBars data={data} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function FunnelBars({
  data,
}: {
  data: { stage: string; count: number; atStage: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, idx) => {
        const widthPct = (d.count / max) * 100;
        const prevCount = idx > 0 ? data[idx - 1].count : null;
        const conversion =
          prevCount && prevCount > 0
            ? Math.round((d.count / prevCount) * 100)
            : null;
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <div key={d.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium capitalize">
                  {d.stage.replace(/_/g, " ").toLowerCase()}
                </span>
                {conversion !== null && (
                  <span className="text-[10px] text-muted-foreground">
                    · {conversion}% conversion
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">{d.count}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({d.atStage} at stage)
                </span>
              </div>
            </div>
            <div className="h-7 w-full rounded-md bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-md transition-all flex items-center justify-end px-2"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  minWidth: d.count > 0 ? "8px" : "0",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid oklch(0.9 0 0)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#1a1a1a",
  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
} as const;

function ChartEmpty() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs">
      <BarChart3 className="size-7 mb-1 opacity-40" />
      No data available
    </div>
  );
}

// ============================================================
// Generate report dialog (preserved from previous module)
// ============================================================
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
      <DialogContent className="max-w-[95vw] sm:max-w-md">
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
              {format === "excel" &&
                "Excel exports as CSV with .xls extension for MVP."}
              {format === "pdf" &&
                "PDF generated using a minimal multi-page PDF writer."}
              {format === "csv" &&
                "Comma-separated values, opens in Excel/Sheets."}
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

// ============================================================
// Predictions & Insights — attrition risk, performance trends,
// headcount forecast, and a department risk heatmap.
// ============================================================

interface AttritionEmployee {
  employeeId: string;
  name: string;
  photo?: string | null;
  department: string;
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
}

interface PerformanceTrendEmployee {
  employeeId: string;
  name: string;
  trend: "UP" | "DOWN" | "STABLE";
  currentScore: number;
  previousScore: number;
  delta: number;
}

interface DepartmentRisk {
  name: string;
  avgRisk: number;
  lowPerformerCount: number;
  vacancyCount: number;
  headcount: number;
}

interface PredictionsPayload {
  attritionRisk: {
    employees: AttritionEmployee[];
    avgRisk: number;
    highRiskCount: number;
    total: number;
  };
  performanceTrend: {
    employees: PerformanceTrendEmployee[];
    up: number;
    down: number;
    stable: number;
    total: number;
  };
  headcountForecast: {
    current: number;
    forecast3m: number;
    forecast6m: number;
    forecast12m: number;
    hireRate: number;
    attritionRate: number;
    netMonthly: number;
    totalVacancies: number;
  };
  departmentRisk: {
    departments: DepartmentRisk[];
  };
}

const RISK_TONE: Record<string, string> = {
  LOW: "bg-primary/10 text-primary dark:text-primary/80 border-primary/20",
  MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  HIGH: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const RISK_BAR: Record<string, string> = {
  LOW: "bg-primary",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-rose-500",
};

const RISK_GAUGE_STROKE: Record<string, string> = {
  LOW: "#6D3FC4",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

function riskLevelFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 61) return "HIGH";
  if (score >= 31) return "MEDIUM";
  return "LOW";
}

function PredictionsSection() {
  const { data, isLoading, isError } = useQuery<PredictionsPayload>({
    queryKey: ["reports", "predictions"],
    queryFn: async () => {
      const r = await fetch("/api/reports/predictions");
      if (!r.ok) throw new Error("Failed to load predictions");
      return r.json();
    },
    staleTime: 60 * 1000,
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Predictions &amp; Insights</h2>
        <span className="text-xs text-muted-foreground">
          AI-assisted forecasts based on performance, attendance, salary
          revisions, and hiring trends
        </span>
      </div>

      {isError && (
        <Card className="border-rose-500/30">
          <CardContent className="p-6 text-sm text-rose-700">
            Failed to load predictions. Please refresh to retry.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttritionRiskCard
          data={data?.attritionRisk}
          loading={isLoading}
        />
        <PerformanceTrendCard
          data={data?.performanceTrend}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeadcountForecastCard
          data={data?.headcountForecast}
          loading={isLoading}
        />
        <DepartmentRiskCard
          data={data?.departmentRisk}
          loading={isLoading}
        />
      </div>
    </section>
  );
}

function PredictionsCardSkeleton() {
  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

function RiskGauge({ score }: { score: number }) {
  const level = riskLevelFromScore(score);
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={RISK_GAUGE_STROKE[level]}
          className="transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Avg risk
        </span>
      </div>
    </div>
  );
}

function AttritionRiskCard({
  data,
  loading,
}: {
  data?: PredictionsPayload["attritionRisk"];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (loading || !data) return <PredictionsCardSkeleton />;

  const top = data.employees.slice(0, 5);
  const rest = data.employees.slice(5);
  const shown = expanded ? data.employees : top;

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="size-4 text-rose-600" />
          Attrition Risk
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Top employees at risk of leaving, based on performance, salary
          stagnation, absenteeism, and probation status.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-4">
          <RiskGauge score={data.avgRisk} />
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <RiskStat
                label="High"
                value={data.employees.filter((e) => e.riskLevel === "HIGH").length}
                tone="rose"
              />
              <RiskStat
                label="Medium"
                value={data.employees.filter((e) => e.riskLevel === "MEDIUM").length}
                tone="amber"
              />
              <RiskStat
                label="Low"
                value={data.employees.filter((e) => e.riskLevel === "LOW").length}
                tone="primary"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {data.highRiskCount} high-risk · {data.total} employees scored ·
              avg {data.avgRisk}/100
            </div>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No employees to score yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {shown.map((e) => (
              <div
                key={e.employeeId}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
              >
                <AvatarBadge name={e.name} photo={e.photo} size="sm" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {e.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {e.employeeId} · {e.department}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md flex-shrink-0",
                        RISK_TONE[e.riskLevel]
                      )}
                    >
                      {e.riskLevel} · {e.score}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        RISK_BAR[e.riskLevel]
                      )}
                      style={{ width: `${Math.min(100, e.score)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {e.factors.slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5 mr-1" /> Show top 5
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5 mr-1" /> View all (
                    {data.total})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function RiskStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "primary";
}) {
  const tones: Record<string, string> = {
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    primary: "bg-primary/10 text-primary dark:text-primary/80",
  };
  return (
    <div className={cn("rounded-lg px-2 py-1.5 text-center", tones[tone])}>
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function PerformanceTrendCard({
  data,
  loading,
}: {
  data?: PredictionsPayload["performanceTrend"];
  loading: boolean;
}) {
  if (loading || !data) return <PredictionsCardSkeleton />;

  const declining = data.employees.filter((e) => e.trend === "DOWN");

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          Performance Trends
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Direction of latest review score vs the previous review cycle.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <TrendStat
            label="Improving"
            value={data.up}
            icon={TrendingUp}
            tone="primary"
          />
          <TrendStat
            label="Stable"
            value={data.stable}
            icon={Minus}
            tone="muted"
          />
          <TrendStat
            label="Declining"
            value={data.down}
            icon={TrendingDown}
            tone="rose"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {data.total} employees with multiple reviews
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-3.5" />
            Needs attention
          </div>
          {declining.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/40 rounded-lg">
              No declining performers — great!
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {declining.slice(0, 12).map((e) => (
                <div
                  key={e.employeeId}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {e.employeeId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    <span className="text-muted-foreground tabular-nums">
                      {e.previousScore}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-semibold tabular-nums">
                      {e.currentScore}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    >
                      −{Math.abs(e.delta)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  tone: "primary" | "rose" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary dark:text-primary/80",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg px-2 py-2 text-center", tones[tone])}>
      <Icon className="size-3.5 mx-auto mb-1" />
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function HeadcountForecastCard({
  data,
  loading,
}: {
  data?: PredictionsPayload["headcountForecast"];
  loading: boolean;
}) {
  if (loading || !data) return <PredictionsCardSkeleton />;

  const stages = [
    { label: "Now", value: data.current, months: 0 },
    { label: "+3 months", value: data.forecast3m, months: 3 },
    { label: "+6 months", value: data.forecast6m, months: 6 },
    { label: "+12 months", value: data.forecast12m, months: 12 },
  ];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="size-4 text-amber-600" />
          Headcount Forecast
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Projection based on historical hiring rate, attrition rate, and open
          vacancies.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stages.map((s, idx) => {
            const prev = idx > 0 ? stages[idx - 1].value : s.value;
            const diff = s.value - prev;
            const trend =
              diff > 0 ? "up" : diff < 0 ? "down" : "flat";
            return (
              <div
                key={s.label}
                className={cn(
                  "rounded-lg p-2.5 border text-center",
                  idx === 0
                    ? "bg-primary/5 border-primary/20"
                    : "border-border/40 bg-muted/20"
                )}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </div>
                <div className="text-xl font-bold tabular-nums mt-0.5">
                  {s.value}
                </div>
                {idx > 0 && (
                  <div
                    className={cn(
                      "text-[10px] font-medium inline-flex items-center gap-0.5 mt-0.5",
                      trend === "up" && "text-primary",
                      trend === "down" && "text-rose-600",
                      trend === "flat" && "text-muted-foreground"
                    )}
                  >
                    {trend === "up" && <ArrowUp className="size-2.5" />}
                    {trend === "down" && <ArrowDown className="size-2.5" />}
                    {trend === "flat" && <Minus className="size-2.5" />}
                    {diff > 0 ? `+${diff}` : diff === 0 ? "0" : diff}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg p-2.5 border border-primary/30 bg-primary/5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Hire rate
            </div>
            <div className="text-lg font-bold tabular-nums text-primary dark:text-primary/80">
              {data.hireRate.toFixed(1)}/mo
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              avg over 12 months
            </div>
          </div>
          <div className="rounded-lg p-2.5 border border-rose-500/30 bg-rose-500/5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Attrition rate
            </div>
            <div className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">
              {data.attritionRate.toFixed(1)}/mo
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {data.totalVacancies} open vacancies
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ArrowRight className="size-3.5" />
          Net monthly change:{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              data.netMonthly > 0 && "text-primary",
              data.netMonthly < 0 && "text-rose-600",
              data.netMonthly === 0 && "text-muted-foreground"
            )}
          >
            {data.netMonthly > 0 ? "+" : ""}
            {data.netMonthly.toFixed(1)} employees/mo
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentRiskCard({
  data,
  loading,
}: {
  data?: PredictionsPayload["departmentRisk"];
  loading: boolean;
}) {
  if (loading || !data) return <PredictionsCardSkeleton />;

  const depts = data.departments ?? [];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="size-4 text-violet-600" />
          Department Risk Heatmap
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Per-department attrition risk, low performers, and vacancies.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {depts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No departments yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {depts.map((d) => {
              const level = riskLevelFromScore(d.avgRisk);
              return (
                <div
                  key={d.name}
                  className={cn(
                    "rounded-lg p-3 border transition-all",
                    level === "HIGH" &&
                      "border-rose-500/40 bg-rose-500/5",
                    level === "MEDIUM" &&
                      "border-amber-500/40 bg-amber-500/5",
                    level === "LOW" &&
                      "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="text-sm font-semibold truncate">
                      {d.name}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0",
                        RISK_TONE[level]
                      )}
                    >
                      {level}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        RISK_BAR[level]
                      )}
                      style={{ width: `${Math.min(100, d.avgRisk)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div>
                      <div className="font-bold tabular-nums">
                        {d.avgRisk}%
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                        Avg risk
                      </div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums">
                        {d.headcount}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                        Headcount
                      </div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                        {d.vacancyCount}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                        Vacancies
                      </div>
                    </div>
                  </div>
                  {d.lowPerformerCount > 0 && (
                    <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-1.5 text-center">
                      {d.lowPerformerCount} low performer
                      {d.lowPerformerCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
