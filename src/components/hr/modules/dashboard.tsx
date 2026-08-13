"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingUp,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatDate, relativeTime } from "@/lib/utils";
import Link from "next/link";

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

export function DashboardModule() {
  const setModule = useApp((s) => s.setModule);
  const openEmployee = useApp((s) => s.openEmployee);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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
              onClick={() => setQuickAction("generate-document")}
            >
              <FilePlus className="size-4 mr-1.5" /> Generate Document
            </Button>
            <Button size="sm" onClick={() => setQuickAction("add-employee")}>
              <Plus className="size-4 mr-1.5" /> Add Employee
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Employees"
          value={kpis.totalEmployees}
          icon={Users}
          iconClass="bg-primary/10 text-primary"
          delta={{ value: "+3", trend: "up" }}
          onClick={() => setModule("employees")}
        />
        <KpiCard
          label="Present Today"
          value={kpis.presentToday}
          icon={CalendarCheck}
          iconClass="bg-emerald-500/10 text-emerald-600"
          delta={{ value: "+5%", trend: "up" }}
          onClick={() => setModule("attendance")}
        />
        <KpiCard
          label="On Leave"
          value={kpis.onLeaveToday}
          icon={CalendarDays}
          iconClass="bg-amber-500/10 text-amber-600"
          onClick={() => setModule("leave")}
        />
        <KpiCard
          label="Late Today"
          value={kpis.lateToday}
          icon={Clock}
          iconClass="bg-rose-500/10 text-rose-600"
          delta={{ value: "-2", trend: "down" }}
          onClick={() => setModule("attendance")}
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
        />
        <KpiCard
          label="Documents Sent"
          value={kpis.docsSent}
          icon={Mail}
          iconClass="bg-teal-500/10 text-teal-600"
          onClick={() => setModule("documents")}
        />
        <KpiCard
          label="Failed Emails"
          value={kpis.failedEmails}
          icon={MailX}
          iconClass="bg-rose-500/10 text-rose-600"
          onClick={() => setModule("documents")}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance trend */}
        <Card className="lg:col-span-2 border-border/60 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Attendance Overview
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last 7 days — stacked by status
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <Legend2 color="#10b981" label="Present" />
              <Legend2 color="#f59e0b" label="Late" />
              <Legend2 color="#ef4444" label="Absent" />
              <Legend2 color="#94a3b8" label="Leave" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.attendanceTrend} barCategoryGap="28%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.92 0 0)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "oklch(0.5 0 0)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "oklch(0.5 0 0)" }}
                />
                <Tooltip
                  cursor={{ fill: "oklch(0.96 0 0)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid oklch(0.9 0 0)",
                    fontSize: 12,
                    boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
                  }}
                />
                <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" />
                <Bar dataKey="leave" name="Leave" stackId="a" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department distribution */}
        <Card className="border-border/60 shadow-soft">
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
              <PieChart>
                <Pie
                  data={data.deptDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="oklch(1 0 0)"
                  strokeWidth={2}
                >
                  {data.deptDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid oklch(0.9 0 0)",
                    fontSize: 12,
                    boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
                  }}
                />
              </PieChart>
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
      </div>

      {/* Quick Actions row */}
      <Card className="border-border/60 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Common HR tasks in one click
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
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
                color: "bg-emerald-500/10 text-emerald-600",
              },
              {
                key: "add-leave",
                label: "Add Leave",
                icon: CalendarDays,
                color: "bg-amber-500/10 text-amber-600",
              },
            ].map((a) => {
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

      {/* Bottom row: Recent employees + Pending leave + Recent docs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent employees */}
        <Card className="border-border/60 shadow-soft">
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

        {/* Pending leave requests */}
        <Card className="border-border/60 shadow-soft">
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

        {/* Recent documents */}
        <Card className="border-border/60 shadow-soft">
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
      </div>
    </div>
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
