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
  Filter,
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
import { cn, formatCurrency } from "@/lib/utils";

// ============================================================
// Color palette for chart series — emerald primary, with the
// requested accents. No indigo/blue.
// ============================================================
const CHART_COLORS = [
  "#10b981", // emerald
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
        iconClass="bg-emerald-500/10 text-emerald-600"
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
