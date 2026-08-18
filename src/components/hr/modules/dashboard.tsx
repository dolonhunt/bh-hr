"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  CalendarX,
  FileText,
  Mail,
  MailX,
  Plus,
  FilePlus,
  Wallet,
  Activity,
  ChevronRight,
  Sparkles,
  Settings2,
  GripVertical,
  Loader2,
  RotateCcw,
  LayoutDashboard,
  PieChart,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDate, relativeTime, cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================================
// Types
// ============================================================

interface DashboardData {
  kpis: {
    totalEmployees: number;
    presentToday: number;
    onLeaveToday: number;
    lateToday: number;
    pendingLeave: number;
    docsGenerated: number;
    docsSent: number;
    failedEmails: number;
  };
  recentEmployees: any[];
  pendingLeaveReqs: any[];
  recentDocuments: any[];
  attendanceTrend: {
    date: string;
    present: number;
    late: number;
    leave: number;
    absent: number;
  }[];
  deptDistribution: { name: string; count: number; color: string }[];
  leaveTrend: { status: string; count: number }[];
}

interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

interface LayoutResponse {
  widgets: WidgetConfig[];
}

// Widget catalog: ID → metadata for the customize dialog
const WIDGET_CATALOG: Record<
  string,
  { label: string; description: string; icon: typeof Users }
> = {
  hero_banner: {
    label: "Welcome Banner",
    description: "Personalized greeting, today's date, and attendance rate ring",
    icon: Sparkles,
  },
  kpi_row: {
    label: "KPI Cards",
    description: "8 key metrics — employees, attendance, leave, documents, emails",
    icon: LayoutDashboard,
  },
  attendance_chart: {
    label: "Attendance Overview",
    description: "7-day stacked bar chart by attendance status",
    icon: CalendarCheck,
  },
  dept_distribution: {
    label: "Department Distribution",
    description: "Donut chart of headcount per department",
    icon: PieChart,
  },
  quick_actions: {
    label: "Quick Actions",
    description: "One-click shortcuts for common HR tasks",
    icon: Zap,
  },
  recent_employees: {
    label: "Recent Employees",
    description: "Latest 5 employees added to the directory",
    icon: Users,
  },
  pending_leave: {
    label: "Pending Leave",
    description: "Latest 5 leave requests awaiting approval",
    icon: CalendarDays,
  },
  recent_documents: {
    label: "Recent Documents",
    description: "Latest 6 generated documents",
    icon: FileText,
  },
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "hero_banner", visible: true, order: 0 },
  { id: "kpi_row", visible: true, order: 1 },
  { id: "attendance_chart", visible: true, order: 2 },
  { id: "dept_distribution", visible: true, order: 3 },
  { id: "quick_actions", visible: true, order: 4 },
  { id: "recent_employees", visible: true, order: 5 },
  { id: "pending_leave", visible: true, order: 6 },
  { id: "recent_documents", visible: true, order: 7 },
];

// ============================================================
// Dashboard Module
// ============================================================

export function DashboardModule() {
  const setModule = useApp((s) => s.setModule);
  const openEmployee = useApp((s) => s.openEmployee);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const authUser = useApp((s) => s.authUser);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // ----- Fetch dashboard data -----
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  // ----- Fetch widget layout (with safe fallback) -----
  const layoutQuery = useQuery<LayoutResponse>({
    queryKey: ["dashboard-layout"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/layout");
      if (!r.ok) throw new Error("Failed to load dashboard layout");
      return r.json();
    },
    // If the API fails we fall back to the default layout.
    retry: 0,
  });

  const layout = layoutQuery.data?.widgets ?? DEFAULT_LAYOUT;

  // Compute the ordered list of visible widgets.
  const visibleWidgets = useMemo(
    () =>
      [...layout]
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order),
    [layout]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <EmptyState
        icon={Activity}
        title="Unable to load dashboard"
        description="Please try refreshing the page."
      />
    );
  }

  const { kpis } = data;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const attendanceRate =
    kpis.totalEmployees > 0
      ? Math.round((kpis.presentToday / kpis.totalEmployees) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Today's HR overview across your organization"
        icon={<Sparkles className="size-5" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setCustomizeOpen(true)}
              aria-label="Customize dashboard"
            >
              <Settings2 className="size-4 mr-1.5" /> Customize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setQuickAction("generate-document")}
            >
              <FilePlus className="size-4 mr-1.5" /> Generate Document
            </Button>
            <Button size="sm" onClick={() => setQuickAction("add-employee")}>
              <Plus className="size-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {/* Mobile-only Customize button (sm:hidden above hides it) */}
      <div className="sm:hidden -mt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setCustomizeOpen(true)}
        >
          <Settings2 className="size-4 mr-1.5" /> Customize Dashboard
        </Button>
      </div>

      {visibleWidgets.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No widgets visible"
          description="All dashboard widgets are hidden. Click Customize to enable some."
        >
          <Button onClick={() => setCustomizeOpen(true)} className="mt-3">
            <Settings2 className="size-4 mr-1.5" /> Customize Dashboard
          </Button>
        </EmptyState>
      ) : (
        <DashboardGrid
          visibleWidgets={visibleWidgets}
          data={data}
          kpis={kpis}
          authUser={authUser}
          greeting={greeting}
          attendanceRate={attendanceRate}
          setModule={setModule}
          openEmployee={openEmployee}
          setQuickAction={setQuickAction}
        />
      )}

      <CustomizeDashboardDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        currentLayout={layout}
      />
    </div>
  );
}

// ============================================================
// Dashboard Grid — renders the ordered visible widgets, with
// smart grouping for the chart pair and list trio.
// ============================================================

interface DashboardGridProps {
  visibleWidgets: WidgetConfig[];
  data: DashboardData;
  kpis: DashboardData["kpis"];
  authUser: { name?: string } | null;
  greeting: string;
  attendanceRate: number;
  setModule: (m: any) => void;
  openEmployee: (id: string) => void;
  setQuickAction: (a: string) => void;
}

function DashboardGrid({
  visibleWidgets,
  data,
  kpis,
  authUser,
  greeting,
  attendanceRate,
  setModule,
  openEmployee,
  setQuickAction,
}: DashboardGridProps) {
  // Group consecutive widgets into "rendering groups".
  // A group is either a single widget (full-width) or a list of
  // 2-3 widgets (rendered in a 3-col grid).
  const groups: Array<WidgetConfig[]> = useMemo(() => {
    const out: Array<WidgetConfig[]> = [];
    let i = 0;
    const CHARTS = new Set(["attendance_chart", "dept_distribution"]);
    const LISTS = new Set([
      "recent_employees",
      "pending_leave",
      "recent_documents",
    ]);
    while (i < visibleWidgets.length) {
      const w = visibleWidgets[i];
      // Try to collect a run of consecutive chart widgets.
      if (CHARTS.has(w.id)) {
        const run: WidgetConfig[] = [w];
        let j = i + 1;
        while (j < visibleWidgets.length && CHARTS.has(visibleWidgets[j].id)) {
          run.push(visibleWidgets[j]);
          j++;
        }
        out.push(run);
        i = j;
        continue;
      }
      // Try to collect a run of consecutive list widgets.
      if (LISTS.has(w.id)) {
        const run: WidgetConfig[] = [w];
        let j = i + 1;
        while (j < visibleWidgets.length && LISTS.has(visibleWidgets[j].id)) {
          run.push(visibleWidgets[j]);
          j++;
        }
        out.push(run);
        i = j;
        continue;
      }
      // Single full-width widget.
      out.push([w]);
      i++;
    }
    return out;
  }, [visibleWidgets]);

  return (
    <>
      {groups.map((group, gi) => {
        // Chart pair → 3-col grid (attendance_chart takes 2/3)
        if (group.length === 2 && group.every((w) => w.id === "attendance_chart" || w.id === "dept_distribution")) {
          return (
            <div key={gi} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {group.map((w) => (
                <WidgetRenderer
                  key={w.id}
                  widgetId={w.id}
                  data={data}
                  kpis={kpis}
                  authUser={authUser}
                  greeting={greeting}
                  attendanceRate={attendanceRate}
                  setModule={setModule}
                  openEmployee={openEmployee}
                  setQuickAction={setQuickAction}
                  className={w.id === "attendance_chart" ? "lg:col-span-2" : ""}
                />
              ))}
            </div>
          );
        }
        // List trio → 3-col grid
        if (
          group.length >= 2 &&
          group.every((w) =>
            ["recent_employees", "pending_leave", "recent_documents"].includes(
              w.id
            )
          )
        ) {
          return (
            <div key={gi} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {group.map((w) => (
                <WidgetRenderer
                  key={w.id}
                  widgetId={w.id}
                  data={data}
                  kpis={kpis}
                  authUser={authUser}
                  greeting={greeting}
                  attendanceRate={attendanceRate}
                  setModule={setModule}
                  openEmployee={openEmployee}
                  setQuickAction={setQuickAction}
                />
              ))}
            </div>
          );
        }
        // Single (or non-matching group) → full-width stack
        return (
          <div key={gi} className="space-y-4">
            {group.map((w) => (
              <WidgetRenderer
                key={w.id}
                widgetId={w.id}
                data={data}
                kpis={kpis}
                authUser={authUser}
                greeting={greeting}
                attendanceRate={attendanceRate}
                setModule={setModule}
                openEmployee={openEmployee}
                setQuickAction={setQuickAction}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

// ============================================================
// Widget Renderer — switches on widget ID
// ============================================================

interface WidgetRendererProps {
  widgetId: string;
  data: DashboardData;
  kpis: DashboardData["kpis"];
  authUser: { name?: string } | null;
  greeting: string;
  attendanceRate: number;
  setModule: (m: any) => void;
  openEmployee: (id: string) => void;
  setQuickAction: (a: string) => void;
  className?: string;
}

function WidgetRenderer(props: WidgetRendererProps) {
  const { widgetId, className } = props;
  switch (widgetId) {
    case "hero_banner":
      return <HeroBannerWidget {...props} />;
    case "kpi_row":
      return <KpiRowWidget {...props} />;
    case "attendance_chart":
      return <AttendanceChartWidget className={className} data={props.data} />;
    case "dept_distribution":
      return (
        <DeptDistributionWidget className={className} data={props.data} />
      );
    case "quick_actions":
      return <QuickActionsWidget setQuickAction={props.setQuickAction} />;
    case "recent_employees":
      return (
        <RecentEmployeesWidget
          data={props.data}
          openEmployee={props.openEmployee}
          setModule={props.setModule}
        />
      );
    case "pending_leave":
      return (
        <PendingLeaveWidget
          data={props.data}
          openEmployee={props.openEmployee}
          setModule={props.setModule}
        />
      );
    case "recent_documents":
      return (
        <RecentDocumentsWidget data={props.data} setModule={props.setModule} />
      );
    default:
      return null;
  }
}

// ============================================================
// Individual Widgets
// ============================================================

function HeroBannerWidget({
  kpis,
  authUser,
  greeting,
  attendanceRate,
}: WidgetRendererProps) {
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-soft bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/8 blur-3xl -mr-20 -mt-20" />
      <CardContent className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
            {greeting}, {authUser?.name?.split(" ")[0] ?? "HR"} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            You have{" "}
            <span className="font-semibold text-foreground">
              {kpis.pendingLeave} pending leave request
              {kpis.pendingLeave !== 1 ? "s" : ""}
            </span>{" "}
            and{" "}
            <span className="font-semibold text-foreground">
              {kpis.docsGenerated} document
              {kpis.docsGenerated !== 1 ? "s" : ""} generated
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative size-20 flex items-center justify-center">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#E8DEFB"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#18A98F"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${
                  (2 * Math.PI * 34 * attendanceRate) / 100
                } ${2 * Math.PI * 34}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-lg font-bold tabular-nums">
                {attendanceRate}%
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">
                Present
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-sm space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Present</span>
              <span className="font-semibold tabular-nums">
                {kpis.presentToday}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">On Leave</span>
              <span className="font-semibold tabular-nums">
                {kpis.onLeaveToday}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Late</span>
              <span className="font-semibold tabular-nums">{kpis.lateToday}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiRowWidget({
  data,
  kpis,
  setModule,
}: WidgetRendererProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        label="Total Employees"
        value={kpis.totalEmployees}
        icon={Users}
        iconClass="bg-primary/10 text-primary"
        delta={{ value: "+3", trend: "up" }}
        onClick={() => setModule("employees")}
        sparkline={[17, 17, 18, 18, 19, 19, 20]}
      />
      <KpiCard
        label="Present Today"
        value={kpis.presentToday}
        icon={CalendarCheck}
        iconClass="bg-primary/10 text-primary"
        delta={{ value: "+5%", trend: "up" }}
        onClick={() => setModule("attendance")}
        sparkline={data.attendanceTrend.map((d) => d.present)}
      />
      <KpiCard
        label="On Leave"
        value={kpis.onLeaveToday}
        icon={CalendarDays}
        iconClass="bg-amber-500/10 text-amber-600"
        onClick={() => setModule("leave")}
        sparkline={data.attendanceTrend.map((d) => d.leave)}
      />
      <KpiCard
        label="Late Today"
        value={kpis.lateToday}
        icon={Clock}
        iconClass="bg-rose-500/10 text-rose-600"
        delta={{ value: "-2", trend: "down" }}
        onClick={() => setModule("attendance")}
        sparkline={data.attendanceTrend.map((d) => d.late)}
      />
      <KpiCard
        label="Pending Leave"
        value={kpis.pendingLeave}
        icon={CalendarX}
        iconClass="bg-amber-500/10 text-amber-600"
        onClick={() => setModule("leave")}
      />
      <KpiCard
        label="Documents Generated"
        value={kpis.docsGenerated}
        icon={FileText}
        iconClass="bg-violet-500/10 text-violet-600"
        onClick={() => setModule("documents")}
        sparkline={[2, 3, 5, 4, 6, 7, kpis.docsGenerated]}
      />
      <KpiCard
        label="Documents Sent"
        value={kpis.docsSent}
        icon={Mail}
        iconClass="bg-teal-500/10 text-teal-600"
        onClick={() => setModule("documents")}
        sparkline={[1, 2, 2, 3, 4, 5, kpis.docsSent]}
      />
      <KpiCard
        label="Failed Emails"
        value={kpis.failedEmails}
        icon={MailX}
        iconClass="bg-rose-500/10 text-rose-600"
        onClick={() => setModule("documents")}
      />
    </div>
  );
}

function AttendanceChartWidget({
  data,
  className,
}: {
  data: DashboardData;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/30 shadow-soft", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">
            Attendance Overview
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last 7 days — stacked by status
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] flex-wrap justify-end">
          <Legend2 color="#18A98F" label="Present" />
          <Legend2 color="#F3A65A" label="Late" />
          <Legend2 color="#FF6658" label="Absent" />
          <Legend2 color="#94a3b8" label="Leave" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.attendanceTrend} barCategoryGap="28%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E8DEFB"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#5F5870" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#5F5870" }}
            />
            <Tooltip
              cursor={{ fill: "#F1ECF7" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E8DEFB",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(109,63,196,0.08)",
              }}
            />
            <Bar dataKey="present" name="Present" stackId="a" fill="#18A98F" radius={[0, 0, 0, 0]} />
            <Bar dataKey="late" name="Late" stackId="a" fill="#F3A65A" />
            <Bar dataKey="absent" name="Absent" stackId="a" fill="#FF6658" />
            <Bar dataKey="leave" name="Leave" stackId="a" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DeptDistributionWidget({
  data,
  className,
}: {
  data: DashboardData;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/30 shadow-soft", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Department Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Headcount by department
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <RechartsPieChart>
            <Pie
              data={data.deptDistribution}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="#FFFD FC"
              strokeWidth={2}
            >
              {data.deptDistribution.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E8DEFB",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(109,63,196,0.08)",
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
          {data.deptDistribution.slice(0, 8).map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-1.5 text-xs"
              title={`${d.name}: ${d.count} employees`}
            >
              <span
                className="size-2.5 rounded-sm flex-shrink-0"
                style={{ background: d.color }}
              />
              <span className="text-muted-foreground truncate flex-1 min-w-0">
                {d.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsWidget({
  setQuickAction,
}: {
  setQuickAction: (a: string) => void;
}) {
  const actions = [
    {
      key: "add-employee",
      label: "Add Employee",
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      key: "generate-document",
      label: "Generate Document",
      icon: FilePlus,
      color: "bg-violet-500/10 text-violet-600",
    },
    {
      key: "create-payslip",
      label: "Create Payslip",
      icon: Wallet,
      color: "bg-teal-500/10 text-teal-600",
    },
    {
      key: "add-attendance",
      label: "Add Attendance",
      icon: CalendarCheck,
      color: "bg-primary/10 text-primary",
    },
    {
      key: "add-leave",
      label: "Add Leave",
      icon: CalendarDays,
      color: "bg-amber-500/10 text-amber-600",
    },
  ];
  return (
    <Card className="border-border/30 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Common HR tasks in one click
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                onClick={() => setQuickAction(a.key)}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card p-4 hover:shadow-card-hover hover:border-border transition-all text-left"
              >
                <div
                  className={`size-10 rounded-lg flex items-center justify-center ${a.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="text-sm font-medium leading-tight">
                  {a.label}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEmployeesWidget({
  data,
  openEmployee,
  setModule,
}: {
  data: DashboardData;
  openEmployee: (id: string) => void;
  setModule: (m: any) => void;
}) {
  return (
    <Card className="border-border/30 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="size-4 text-primary" /> Recent Employees
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setModule("employees")}
        >
          View all <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {data.recentEmployees.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No employees yet.
          </p>
        )}
        {data.recentEmployees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => openEmployee(emp.id)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition text-left"
          >
            <AvatarBadge name={emp.fullName} photo={emp.photo} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {emp.fullName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {emp.employeeId} · {emp.designation?.name ?? "—"}
              </div>
            </div>
            <StatusBadge status={emp.employmentStatus} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function PendingLeaveWidget({
  data,
  openEmployee,
  setModule,
}: {
  data: DashboardData;
  openEmployee: (id: string) => void;
  setModule: (m: any) => void;
}) {
  return (
    <Card className="border-border/30 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="size-4 text-amber-600" /> Pending Leave
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setModule("leave")}
        >
          View all <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.pendingLeaveReqs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No pending requests.
          </p>
        )}
        {data.pendingLeaveReqs.map((lr) => (
          <button
            key={lr.id}
            onClick={() => {
              if (lr.employee?.id) openEmployee(lr.employee.id);
            }}
            className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/60 transition text-left"
          >
            <AvatarBadge
              name={lr.employee?.fullName}
              photo={lr.employee?.photo}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {lr.employee?.fullName}
              </div>
              <div className="text-xs text-muted-foreground">
                {lr.leaveType?.name} · {lr.days} day(s)
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {formatDate(lr.startDate)} → {formatDate(lr.endDate)}
              </div>
            </div>
            <StatusBadge status={lr.status} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentDocumentsWidget({
  data,
  setModule,
}: {
  data: DashboardData;
  setModule: (m: any) => void;
}) {
  return (
    <Card className="border-border/30 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="size-4 text-violet-600" /> Recent Documents
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setModule("documents")}
        >
          View all <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.recentDocuments.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No documents generated yet.
          </p>
        )}
        {data.recentDocuments.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setModule("documents")}
            className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/60 transition text-left"
          >
            <div className="size-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center flex-shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {doc.documentNumber}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {doc.employee?.fullName ?? "—"} · {doc.type}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {relativeTime(doc.createdAt)}
              </div>
            </div>
            <StatusBadge status={doc.status} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className="size-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

// ============================================================
// Dashboard Skeleton (loading state)
// ============================================================

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today's HR overview across your organization"
        icon={<Sparkles className="size-5" />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-80 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================
// Customize Dashboard Dialog (with drag-and-drop)
// ============================================================

function CustomizeDashboardDialog({
  open,
  onOpenChange,
  currentLayout,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentLayout: WidgetConfig[];
}) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<WidgetConfig[] | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  // Sync local state when server layout changes (or when dialog opens).
  // Using the React-documented "adjust state during render" pattern
  // avoids the react-hooks/set-state-in-effect lint rule.
  const sig = open
    ? currentLayout
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((w) => `${w.id}:${w.visible}:${w.order}`)
        .join("|")
    : null;
  const [syncedSig, setSyncedSig] = useState<string | null>(null);
  if (sig && sig !== syncedSig) {
    setSyncedSig(sig);
    setLocal(
      currentLayout
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((w) => ({ ...w }))
    );
  }

  // Reset sync signature when dialog closes so a fresh sync happens
  // on next open.
  useEffect(() => {
    if (!open) {
      setSyncedSig(null);
      setLocal(null);
    }
  }, [open]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !local) return;
    const oldIndex = local.findIndex((w) => w.id === active.id);
    const newIndex = local.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setLocal((prev) => {
      if (!prev) return prev;
      const moved = arrayMove(prev, oldIndex, newIndex);
      // Re-number orders so they remain 0..N-1.
      return moved.map((w, idx) => ({ ...w, order: idx }));
    });
  }

  function toggleVisible(id: string) {
    setLocal((prev) => {
      if (!prev) return prev;
      return prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
    });
  }

  function resetToDefault() {
    setLocal(DEFAULT_LAYOUT.map((w) => ({ ...w })));
    toast.info("Layout reset to default — click Save to apply");
  }

  async function save() {
    if (!local) return;
    setSaving(true);
    try {
      const r = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: local }),
      });
      if (!r.ok) throw new Error("Failed to save dashboard layout");
      await qc.invalidateQueries({ queryKey: ["dashboard-layout"] });
      toast.success("Dashboard layout saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save dashboard layout");
    } finally {
      setSaving(false);
    }
  }

  const visibleCount = local?.filter((w) => w.visible).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            Customize Dashboard
          </DialogTitle>
          <DialogDescription>
            Toggle widgets on or off and drag to reorder. Hidden widgets stay
            available — just toggle them back on later.
          </DialogDescription>
        </DialogHeader>

        {!local ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {visibleCount} of {local.length} widgets visible
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={resetToDefault}
              >
                <RotateCcw className="size-3.5 mr-1" /> Reset to default
              </Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1 -mr-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={local.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1.5">
                    {local.map((w, idx) => {
                      const meta = WIDGET_CATALOG[w.id];
                      if (!meta) return null;
                      return (
                        <SortableWidgetRow
                          key={w.id}
                          id={w.id}
                          label={meta.label}
                          description={meta.description}
                          icon={meta.icon}
                          visible={w.visible}
                          order={idx}
                          onToggle={() => toggleVisible(w.id)}
                        />
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !local}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving…
              </>
            ) : (
              "Save layout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Sortable Widget Row (dnd-kit)
// ============================================================

function SortableWidgetRow({
  id,
  label,
  description,
  icon: Icon,
  visible,
  order,
  onToggle,
}: {
  id: string;
  label: string;
  description: string;
  icon: typeof Users;
  visible: boolean;
  order: number;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  } as React.CSSProperties;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        isDragging && "shadow-lg border-primary/40 bg-card",
        visible
          ? "border-border bg-card"
          : "border-border/50 bg-muted/30 opacity-70"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none flex-shrink-0"
        aria-label={`Drag ${label} to reorder`}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Order number */}
      <div className="flex-shrink-0 size-6 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground flex items-center justify-center tabular-nums">
        {order + 1}
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="size-4" />
      </div>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {description}
        </div>
      </div>

      {/* Visibility toggle */}
      <Switch
        checked={visible}
        onCheckedChange={onToggle}
        aria-label={`Toggle visibility of ${label}`}
      />
    </li>
  );
}
