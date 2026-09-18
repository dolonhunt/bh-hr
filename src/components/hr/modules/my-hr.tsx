"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserRound,
  CalendarDays,
  Wallet,
  FileText,
  Clock,
  Loader2,
  Link2,
  Megaphone,
  Sun,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CalendarPlus,
  Building2,
  BadgeCheck,
  Search,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { StatusBadge } from "../shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// =========================================================
// Types
// =========================================================

interface MeResponse {
  user: { id: string; name: string; email: string; role: string };
  autoLinked: boolean;
  employee: EmployeeProfile | null;
  stats?: Record<string, any>;
  leaveBalances?: LeaveBalance[];
  recentLeaveRequests?: LeaveReq[];
  payslips?: Payslip[];
}

interface EmployeeProfile {
  id: string;
  employeeId: string;
  fullName: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
  employmentType: string;
  employmentStatus: string;
  joiningDate: string | null;
  workLocation: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  manager: { id: string; fullName: string; photo: string | null; employeeId: string } | null;
}

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  color: string | null;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

interface LeaveReq {
  id: string;
  leaveTypeName: string;
  color: string | null;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  appliedAt: string;
}

interface Payslip {
  id: string;
  payrollMonth: string;
  netSalary: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  status: string;
  paymentDate: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  pinned: boolean;
  publishedAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-rose-500",
  HIGH: "bg-amber-500",
  NORMAL: "bg-primary",
  LOW: "bg-slate-400",
};

// =========================================================
// Data hooks
// =========================================================

function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const r = await fetch("/api/me");
      if (!r.ok) throw new Error("Failed to load profile");
      return r.json();
    },
  });
}

// =========================================================
// Main module
// =========================================================

export function MyHrModule() {
  const { data, isLoading, refetch } = useMe();
  const openEmployee = useApp((s) => s.openEmployee);
  const setModule = useApp((s) => s.setModule);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const emp = data?.employee ?? null;

  return (
    <div>
      <PageHeader
        icon={<UserRound className="size-5" />}
        title="My HR"
        description="Self-service portal — your profile, leave, payslips & company updates"
        actions={
          emp ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEmployee(emp.id)}
              >
                <FileText className="size-4 mr-1.5" /> Full HR Profile
              </Button>
              <LinkProfileDialog onChanged={() => refetch()} />
            </div>
          ) : undefined
        }
      />

      {!emp ? (
        <NotLinkedState onChanged={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <ProfileHero emp={emp} stats={data!.stats!} onOpenProfile={() => openEmployee(emp.id)} />
          <KpiRow stats={data!.stats!} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <LeaveBalancesCard balances={data!.leaveBalances ?? []} />
              <RecentLeaveCard requests={data!.recentLeaveRequests ?? []} />
              <PayslipsCard payslips={data!.payslips ?? []} onOpenPayroll={() => setModule("payroll")} />
            </div>
            <div className="space-y-6 min-w-0">
              <QuickLeaveRequestCard employeeId={emp.id} onDone={() => refetch()} />
              <AnnouncementsPreviewCard onViewAll={() => setModule("announcements")} />
              <HolidaysPreviewCard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// Not-linked state
// =========================================================

function NotLinkedState({ onChanged }: { onChanged: () => void }) {
  return (
    <Card className="border-border/60 shadow-soft max-w-xl mx-auto">
      <CardHeader className="items-center text-center pb-2">
        <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
          <Link2 className="size-7" />
        </div>
        <CardTitle className="text-lg">Link your employee profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which employee record belongs to you to unlock your personal
          leave balances, payslips, attendance and company updates.
        </p>
      </CardHeader>
      <CardContent>
        <LinkProfileBody onDone={onChanged} autoNavigate />
      </CardContent>
    </Card>
  );
}

function LinkProfileDialog({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="size-4 mr-1.5" /> Change Profile
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change linked profile</DialogTitle>
          <DialogDescription>
            Pick the employee record that belongs to you.
          </DialogDescription>
        </DialogHeader>
        <LinkProfileBody
          onDone={() => {
            setOpen(false);
            onChanged();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function LinkProfileBody({
  onDone,
  autoNavigate = false,
}: {
  onDone: () => void;
  autoNavigate?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; fullName: string; employeeId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ["me-link-employees", search],
    queryFn: async () => {
      const r = await fetch(
        `/api/employees?search=${encodeURIComponent(search)}&pageSize=8`
      );
      if (!r.ok) throw new Error("Failed to load employees");
      return r.json();
    },
  });

  const items: Array<{ id: string; fullName: string; employeeId: string; photo?: string | null; department?: { name: string } | null }> =
    data?.items ?? [];

  async function confirm() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedEmployeeId: selected.id }),
      });
      if (!r.ok) throw new Error("Failed to link profile");
      toast.success(`Linked to ${selected.fullName}`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to link profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search your name or employee ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
        {isFetching ? (
          <div className="space-y-2 py-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No employees match “{search}”.
          </p>
        ) : (
          items.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition cursor-pointer border border-transparent",
                selected?.id === e.id
                  ? "bg-accent text-accent-foreground neu-raised-sm border-border/40"
                  : "hover:bg-muted/60"
              )}
            >
              <Avatar className="size-9 border border-border/40">
                <AvatarImage src={e.photo ?? undefined} alt={e.fullName} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {e.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.fullName}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {e.employeeId}
                  {e.department ? ` · ${e.department.name}` : ""}
                </div>
              </div>
              {selected?.id === e.id && (
                <BadgeCheck className="size-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button onClick={confirm} disabled={!selected || saving} className="min-w-32">
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Link2 className="size-4 mr-2" />}
          Link profile
        </Button>
        {autoNavigate && null}
      </DialogFooter>
    </div>
  );
}

// =========================================================
// Profile hero
// =========================================================

function ProfileHero({
  emp,
  stats,
  onOpenProfile,
}: {
  emp: EmployeeProfile;
  stats: Record<string, any>;
  onOpenProfile: () => void;
}) {
  const initials = emp.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="border-border/60 shadow-soft overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-primary/[0.06] px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="size-16 border-2 border-background shadow-soft">
            <AvatarImage src={emp.photo ?? undefined} alt={emp.fullName} />
            <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight truncate">
                {emp.fullName}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                {emp.employeeId}
              </span>
              <StatusBadge status={emp.employmentStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[emp.designation?.name, emp.department?.name, emp.employmentType?.replace("_", " ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenProfile} className="hidden sm:inline-flex">
            View Profile <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 border-t border-border/40">
          <HeroFact icon={Mail} label="Work email" value={emp.email ?? "—"} truncate />
          <HeroFact icon={Phone} label="Phone" value={emp.phone ?? "—"} />
          <HeroFact
            icon={CalendarDays}
            label="Joined"
            value={emp.joiningDate ? formatDate(emp.joiningDate) : "—"}
          />
          <HeroFact
            icon={MapPin}
            label="Location"
            value={emp.workLocation ?? "—"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeroFact({
  icon: Icon,
  label,
  value,
  truncate = false,
}: {
  icon: any;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-3 flex items-start gap-2.5 min-w-0">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-xs font-medium mt-0.5",
            truncate && "truncate"
          )}
          title={value}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// KPI row
// =========================================================

function KpiRow({ stats }: { stats: Record<string, any> }) {
  const month = stats.monthAttendance ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Leave Remaining"
        value={`${stats.totalLeaveRemaining ?? 0}`}
        delta={{
          value: `of ${stats.totalLeaveAllocated ?? 0} allocated`,
          trend: "flat",
        }}
        icon={CalendarDays}
        iconClass="bg-primary/10 text-primary"
      />
      <KpiCard
        label="Attendance (this month)"
        value={`${stats.attendanceRate ?? 0}%`}
        delta={{
          value: `${month.present ?? 0} present · ${month.late ?? 0} late`,
          trend: "flat",
        }}
        icon={TrendingUp}
        iconClass="bg-emerald-500/10 text-emerald-600"
      />
      <KpiCard
        label="Pending Requests"
        value={`${stats.pendingLeaveCount ?? 0}`}
        delta={{ value: "awaiting approval", trend: "flat" }}
        icon={Clock}
        iconClass="bg-amber-500/10 text-amber-600"
      />
      <KpiCard
        label="Payslips & Docs"
        value={`${stats.payslipsCount ?? 0}`}
        delta={{ value: `${stats.documentsCount ?? 0} documents`, trend: "flat" }}
        icon={Wallet}
        iconClass="bg-violet-500/10 text-violet-600"
      />
    </div>
  );
}

// =========================================================
// Leave balances
// =========================================================

function LeaveBalancesCard({ balances }: { balances: LeaveBalance[] }) {
  const active = balances.filter((b) => b.allocated > 0 || b.used > 0);
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" /> Leave Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No leave types configured yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            {active.map((b) => {
              const pct =
                b.allocated > 0
                  ? Math.min(100, Math.round((b.used / b.allocated) * 100))
                  : 0;
              return (
                <div key={b.leaveTypeId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate flex items-center gap-2">
                      <span
                        className="size-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color ?? "var(--primary)" }}
                      />
                      {b.leaveTypeName}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      <span className="font-semibold text-foreground">
                        {b.remaining}
                      </span>{" "}
                      / {b.allocated} left
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2"
                    indicatorStyle={
                      b.color ? { backgroundColor: b.color } : undefined
                    }
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{b.used} used</span>
                    {b.pending > 0 && <span>{b.pending} pending</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================
// Recent leave requests
// =========================================================

function RecentLeaveCard({ requests }: { requests: LeaveReq[] }) {
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Recent Leave Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No leave requests yet — submit one from the panel.
          </p>
        ) : (
          <div className="divide-y divide-border/40 -mx-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    <span
                      className="size-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.color ?? "var(--primary)" }}
                    />
                    {r.leaveTypeName}
                    <span className="text-xs text-muted-foreground font-normal">
                      {r.days} day{r.days === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================
// Payslips
// =========================================================

function PayslipsCard({
  payslips,
  onOpenPayroll,
}: {
  payslips: Payslip[];
  onOpenPayroll: () => void;
}) {
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="size-4 text-primary" /> My Payslips
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onOpenPayroll}>
          Payroll <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {payslips.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No payslips generated yet.
          </p>
        ) : (
          <div className="space-y-2">
            {payslips.map((p) => {
              const [year, month] = p.payrollMonth.split("-");
              const monthName = new Date(
                Number(year), Number(month) - 1, 1
              ).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/40 transition"
                >
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] uppercase leading-none font-semibold">
                      {new Date(Number(year), Number(month) - 1, 1)
                        .toLocaleDateString("en-GB", { month: "short" })
                        .toUpperCase()}
                    </span>
                    <span className="text-sm font-bold leading-none mt-0.5">
                      {month}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {formatCurrency(p.netSalary)}
                      <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                        net
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {monthName}
                      {p.paymentDate ? ` · paid ${formatDate(p.paymentDate)}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================
// Quick leave request (with working-day preview)
// =========================================================

const WEEKEND_DAYS = [5, 6]; // Friday & Saturday — Bangladesh weekend

function QuickLeaveRequestCard({
  employeeId,
  onDone,
}: {
  employeeId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: typesData } = useQuery({
    queryKey: ["me-leave-types"],
    queryFn: async () => {
      const r = await fetch("/api/leave-types");
      if (!r.ok) throw new Error("Failed to load leave types");
      return r.json();
    },
  });
  const types: Array<{ id: string; name: string; color?: string }> =
    typesData?.items ?? typesData ?? [];

  const { data: holidaysData } = useQuery({
    queryKey: ["me-holidays"],
    queryFn: async () => {
      const r = await fetch("/api/holidays?upcoming=true&limit=30");
      if (!r.ok) throw new Error("Failed to load holidays");
      return r.json();
    },
  });
  const holidayDates = useMemo(() => {
    const set = new Set<string>();
    for (const h of (holidaysData?.items ?? []) as Holiday[]) {
      set.add(new Date(h.date).toDateString());
    }
    return set;
  }, [holidaysData]);

  // Working-days preview: inclusive range minus weekends & holidays.
  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
    let days = 0;
    let weekendCount = 0;
    let holidayCount = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      if (WEEKEND_DAYS.includes(cursor.getDay())) {
        weekendCount++;
      } else if (holidayDates.has(cursor.toDateString())) {
        holidayCount++;
      } else {
        days++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return { total: days + weekendCount + holidayCount, days, weekendCount, holidayCount };
  }, [startDate, endDate, holidayDates]);

  async function submit() {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      toast.error("Fill in leave type, dates and a short reason.");
      return;
    }
    if (workingDays && workingDays.days === 0 && workingDays.total > 0) {
      toast.error("Selected range contains no working days.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit request");
      }
      toast.success(
        workingDays && workingDays.total !== workingDays.days
          ? `Leave request submitted — ${workingDays.days} working day(s) (${workingDays.total} calendar days, ${workingDays.weekendCount + workingDays.holidayCount} non-working day${workingDays.weekendCount + workingDays.holidayCount === 1 ? "" : "s"} excluded)`
          : "Leave request submitted for approval"
      );
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["me"] });
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarPlus className="size-4 text-primary" /> Request Leave
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs">Leave type</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && endDate < e.target.value) setEndDate(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {workingDays && (
          <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/60 px-3 py-2">
            <Sparkles className="size-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {workingDays.days} working day{workingDays.days === 1 ? "" : "s"}
              </span>
              {workingDays.weekendCount > 0 &&
                ` · ${workingDays.weekendCount} weekend`}
              {workingDays.holidayCount > 0 &&
                ` · ${workingDays.holidayCount} holiday`}
              {workingDays.days === 0 && (
                <span className="text-rose-600 font-medium">
                  {" "}
                  — no working days in range
                </span>
              )}
            </span>
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Reason</Label>
          <Textarea
            placeholder="Short reason for your manager…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <CalendarPlus className="size-4 mr-2" />
          )}
          Submit Request
        </Button>
      </CardContent>
    </Card>
  );
}

// =========================================================
// Announcements preview
// =========================================================

function AnnouncementsPreviewCard({ onViewAll }: { onViewAll: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["me-announcements"],
    queryFn: async () => {
      const r = await fetch("/api/announcements");
      if (!r.ok) throw new Error("Failed to load announcements");
      return r.json();
    },
  });

  const items: Announcement[] = (data?.items ?? [])
    .slice()
    .sort((a: Announcement, b: Announcement) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 3);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Megaphone className="size-4 text-primary" /> Notice Board
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onViewAll}>
          View all <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2 py-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No announcements right now.
          </p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition"
            >
              <span
                className={cn(
                  "size-2 rounded-full mt-1.5 flex-shrink-0",
                  PRIORITY_DOT[a.priority] ?? "bg-primary"
                )}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug line-clamp-1">
                  {a.pinned && (
                    <span className="text-[10px] font-semibold text-primary mr-1.5 uppercase">
                      Pinned
                    </span>
                  )}
                  {a.title}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  {a.body}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================
// Holidays preview
// =========================================================

function HolidaysPreviewCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["me-holidays-preview"],
    queryFn: async () => {
      const r = await fetch("/api/holidays?upcoming=true&limit=4");
      if (!r.ok) throw new Error("Failed to load holidays");
      return r.json();
    },
  });

  const items: Holiday[] = (data?.items ?? []).slice(0, 3);

  const typeCls = (t: string) =>
    t === "PUBLIC"
      ? "bg-primary/10 text-primary"
      : t === "OPTIONAL"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-sky-500/10 text-sky-600";

  function daysUntil(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `In ${diff} days`;
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sun className="size-4 text-amber-600" /> Upcoming Holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2 py-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming holidays.
          </p>
        ) : (
          items.map((h) => {
            const d = new Date(h.date);
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
              >
                <div
                  className={cn(
                    "size-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0",
                    typeCls(h.type)
                  )}
                >
                  <span className="text-sm font-bold leading-none">
                    {d.getDate()}
                  </span>
                  <span className="text-[9px] uppercase leading-none mt-0.5">
                    {d.toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {daysUntil(h.date)} · {h.type.toLowerCase()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
