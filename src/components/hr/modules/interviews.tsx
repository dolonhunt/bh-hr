"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  Video,
  MapPin,
  Phone,
  Code2,
  Users as UsersIcon,
  Trophy,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  ExternalLink,
  Star,
  CalendarDays,
  Clock,
  User,
  Briefcase,
  Loader2,
  UserCircle2,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CalendarPlus,
  Download,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { ExportButton } from "../shared/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate } from "@/lib/utils";

// =========================================================
// Types & constants
// =========================================================

type InterviewType =
  | "PHONE"
  | "VIDEO"
  | "ONSITE"
  | "TECHNICAL"
  | "HR"
  | "FINAL";

type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type Recommendation = "HIRE" | "REJECT" | "HOLD";

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string | null;
  jobTitle: string | null;
  interviewerId: string | null;
  interviewerName: string | null;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  location?: string | null;
  meetingLink?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  rating?: number | null;
  recommendation?: Recommendation | null;
  createdAt: string;
}

const INTERVIEW_TYPES: InterviewType[] = [
  "PHONE",
  "VIDEO",
  "ONSITE",
  "TECHNICAL",
  "HR",
  "FINAL",
];

const TYPE_META: Record<
  InterviewType,
  { label: string; icon: typeof Phone; color: string }
> = {
  PHONE: { label: "Phone", icon: Phone, color: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  VIDEO: { label: "Video", icon: Video, color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ONSITE: { label: "Onsite", icon: MapPin, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  TECHNICAL: { label: "Technical", icon: Code2, color: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  HR: { label: "HR", icon: UsersIcon, color: "bg-primary/15 text-primary dark:text-primary/80" },
  FINAL: { label: "Final", icon: Trophy, color: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

const STATUS_TONE: Record<InterviewStatus, string> = {
  SCHEDULED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  COMPLETED: "bg-primary/15 text-primary dark:text-primary/80 border-primary/20",
  CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  NO_SHOW: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const RECOMMENDATION_TONE: Record<Recommendation, string> = {
  HIRE: "bg-primary/15 text-primary dark:text-primary/80 border-primary/20",
  REJECT: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  HOLD: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

// =========================================================
// Main module
// =========================================================

export function InterviewsModule() {
  const [tab, setTab] = useState<
    "upcoming" | "past" | "all" | "calendar" | "summary"
  >("upcoming");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Schedule and track candidate interviews"
        icon={<CalendarClock className="size-5" />}
        actions={<ExportButton module="interviews" filters={{}} />}
      />
      <KpiRow />
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setTab(v as "upcoming" | "past" | "all" | "calendar" | "summary")
        }
        className="space-y-6"
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarClock className="size-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <CheckCircle2 className="size-4" />
            Past
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <CalendarDays className="size-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="size-4" />
            Week View
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <ClipboardList className="size-4" />
            Candidate Summary
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <UpcomingTab />
        </TabsContent>
        <TabsContent value="past">
          <PastTab />
        </TabsContent>
        <TabsContent value="all">
          <AllTab />
        </TabsContent>
        <TabsContent value="calendar">
          <WeekView />
        </TabsContent>
        <TabsContent value="summary">
          <CandidateSummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =========================================================
// KPI Row
// =========================================================

function KpiRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", "kpi"],
    queryFn: async () => {
      const r = await fetch("/api/interviews");
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });

  const items: Interview[] = data?.items ?? [];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const upcoming = items.filter(
    (i) => i.status === "SCHEDULED" && new Date(i.scheduledAt).getTime() >= Date.now()
  ).length;

  const completedThisWeek = items.filter((i) => {
    if (i.status !== "COMPLETED") return false;
    const d = new Date(i.scheduledAt);
    return d.getTime() >= weekStart.getTime() && d.getTime() < weekEnd.getTime();
  }).length;

  const cancelled = items.filter((i) => i.status === "CANCELLED").length;

  const rated = items.filter((i) => i.status === "COMPLETED" && typeof i.rating === "number");
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length
      : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <KpiCard
        label="Scheduled (upcoming)"
        value={upcoming}
        icon={CalendarClock}
        iconClass="bg-amber-500/15 text-amber-600"
        footer={<span className="text-muted-foreground">Awaiting interview</span>}
      />
      <KpiCard
        label="Completed this week"
        value={completedThisWeek}
        icon={CheckCircle2}
        iconClass="bg-primary/15 text-primary"
        footer={<span className="text-muted-foreground">Since Monday</span>}
      />
      <KpiCard
        label="Cancelled"
        value={cancelled}
        icon={XCircle}
        iconClass="bg-rose-500/15 text-rose-600"
        footer={<span className="text-muted-foreground">All-time</span>}
      />
      <KpiCard
        label="Avg Rating"
        value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
        icon={Star}
        iconClass="bg-primary/10 text-primary"
        footer={
          <span className="text-muted-foreground">
            {rated.length} rated interview{rated.length === 1 ? "" : "s"}
          </span>
        }
      />
    </div>
  );
}

// =========================================================
// Filter bar (shared)
// =========================================================

function InterviewFilters({
  search,
  setSearch,
  type,
  setType,
  onCreate,
  extraAction,
}: {
  search: string;
  setSearch: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  onCreate: () => void;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by candidate, job, interviewer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={type || "ALL"}
        onValueChange={(v) => setType(v === "ALL" ? "" : v)}
      >
        <SelectTrigger className="md:w-44">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All types</SelectItem>
          {INTERVIEW_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_META[t].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {extraAction}
      <Button size="sm" onClick={onCreate} className="gap-1.5 md:ml-1">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Schedule Interview</span>
        <span className="sm:hidden">New</span>
      </Button>
    </div>
  );
}

// =========================================================
// Upcoming tab — card list of future + SCHEDULED interviews
// =========================================================

function UpcomingTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editInterview, setEditInterview] = useState<Interview | null>(null);
  const [completeInterview, setCompleteInterview] =
    useState<Interview | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interviews", "list", search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const r = await fetch(`/api/interviews?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });

  const all: Interview[] = data?.items ?? [];
  // Filter upcoming: status SCHEDULED + future date.
  const upcoming = all
    .filter(
      (i) =>
        i.status === "SCHEDULED" &&
        new Date(i.scheduledAt).getTime() >= Date.now() - 60 * 60 * 1000 // 1h grace
    )
    .filter((i) => !type || i.type === type)
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return [i.candidateName, i.jobTitle, i.interviewerName, i.location]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  async function cancelInterview(i: Interview) {
    if (!confirm(`Cancel the ${i.type} interview with ${i.candidateName}?`))
      return;
    try {
      const r = await fetch(`/api/interviews/${i.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!r.ok) throw new Error("Failed to cancel interview");
      toast.success(`Interview with ${i.candidateName} cancelled.`);
      qc.invalidateQueries({ queryKey: ["interviews"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel interview.");
    }
  }

  async function deleteInterview(i: Interview) {
    if (!confirm(`Permanently delete the interview with ${i.candidateName}?`))
      return;
    try {
      const r = await fetch(`/api/interviews/${i.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete interview");
      toast.success(`Interview with ${i.candidateName} deleted.`);
      qc.invalidateQueries({ queryKey: ["interviews"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete interview.");
    }
  }

  async function downloadSingleIcs(i: Interview) {
    setDownloadingId(i.id);
    try {
      const r = await fetch(`/api/interviews/${i.id}/ics`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate calendar invite");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";\n]+)"?/i);
      a.download = match ? match[1] : `interview-${i.candidateName}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Calendar invite downloaded for ${i.candidateName}.`);
    } catch (err: any) {
      toast.error(err?.message || "Calendar invite download failed.");
    } finally {
      setDownloadingId("");
    }
  }

  async function downloadAllIcs() {
    setExportingAll(true);
    try {
      const r = await fetch(`/api/interviews/ics-all`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "No upcoming interviews to export.");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all-interviews.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Calendar file with all upcoming interviews downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="space-y-5">
      <InterviewFilters
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        onCreate={() => {
          setEditInterview(null);
          setFormOpen(true);
        }}
        extraAction={
          <Button
            size="sm"
            variant="outline"
            onClick={downloadAllIcs}
            disabled={exportingAll || upcoming.length === 0}
            title="Download .ics file with all upcoming interviews"
          >
            {exportingAll ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-4 mr-1.5" />
            )}
            <span className="hidden sm:inline">Export All (ICS)</span>
            <span className="sm:hidden">All</span>
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={XCircle}
          title="Failed to load interviews"
          description="Please try again later."
        />
      )}

      {!isLoading && !isError && upcoming.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming interviews"
          description="Schedule an interview to see it here."
          actionLabel="Schedule Interview"
          onAction={() => {
            setEditInterview(null);
            setFormOpen(true);
          }}
        />
      )}

      {!isLoading && !isError && upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map((i) => (
            <UpcomingCard
              key={i.id}
              interview={i}
              onComplete={() => setCompleteInterview(i)}
              onEdit={() => {
                setEditInterview(i);
                setFormOpen(true);
              }}
              onCancel={() => cancelInterview(i)}
              onDelete={() => deleteInterview(i)}
              onAddToCalendar={() => downloadSingleIcs(i)}
              downloadingIcs={downloadingId === i.id}
            />
          ))}
        </div>
      )}

      <InterviewFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditInterview(null);
        }}
        interview={editInterview}
        onSaved={() => qc.invalidateQueries({ queryKey: ["interviews"] })}
      />

      <CompleteDialog
        interview={completeInterview}
        onClose={() => setCompleteInterview(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["interviews"] })}
      />
    </div>
  );
}

function UpcomingCard({
  interview,
  onComplete,
  onEdit,
  onCancel,
  onDelete,
  onAddToCalendar,
  downloadingIcs,
}: {
  interview: Interview;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onAddToCalendar: () => void;
  downloadingIcs?: boolean;
}) {
  const t = TYPE_META[interview.type];
  const TypeIcon = t.icon;
  const scheduled = new Date(interview.scheduledAt);
  const isToday =
    scheduled.toDateString() === new Date().toDateString();

  return (
    <Card className="p-4 md:p-5 gap-0 border-border/60 shadow-soft hover:shadow-card-hover hover:border-border transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Left: candidate */}
        <div className="flex items-center gap-3 min-w-0 md:w-64">
          <AvatarBadge name={interview.candidateName} size="md" />
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {interview.candidateName}
            </div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Briefcase className="size-3" />
              {interview.jobTitle ?? "General"}
            </div>
          </div>
        </div>

        {/* Middle: details */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              When
            </div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {formatDate(interview.scheduledAt, "short")}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {scheduled.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {interview.duration} min
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Interviewer
            </div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              {interview.interviewerName ?? "Unassigned"}
            </div>
            <div className="text-xs text-muted-foreground">Type · {t.label}</div>
          </div>
          <div className="space-y-0.5 col-span-2 md:col-span-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Where
            </div>
            <div className="text-sm font-medium flex items-center gap-1.5 truncate">
              {interview.type === "VIDEO" ? (
                <Video className="size-3.5 text-muted-foreground" />
              ) : (
                <MapPin className="size-3.5 text-muted-foreground" />
              )}
              <span className="truncate">
                {interview.meetingLink
                  ? "Video call"
                  : interview.location ?? "TBD"}
              </span>
            </div>
            {isToday && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px] px-1.5 py-0">
                Today
              </Badge>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full capitalize",
              t.color
            )}
          >
            <TypeIcon className="size-3 mr-1" />
            {t.label}
          </Badge>
          {interview.meetingLink && (
            <Button asChild size="sm" className="gap-1.5">
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Join</span>
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onAddToCalendar}
            disabled={downloadingIcs}
            title="Add to calendar (.ics)"
            className="gap-1.5"
          >
            {downloadingIcs ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="size-3.5" />
            )}
            <span className="hidden sm:inline">Calendar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onComplete} className="gap-2 cursor-pointer">
                <CheckCircle className="size-4 text-primary" />
                Complete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onCancel}
                className="gap-2 cursor-pointer text-amber-600 focus:text-amber-700"
              >
                <XCircle className="size-4" />
                Cancel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {interview.notes && (
        <div className="mt-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
          <span className="font-medium text-foreground">Notes: </span>
          {interview.notes}
        </div>
      )}
    </Card>
  );
}

// =========================================================
// Past tab — table of completed interviews
// =========================================================

function PastTab() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", "past", search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const r = await fetch(`/api/interviews?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });

  const all: Interview[] = data?.items ?? [];
  const past = all
    .filter((i) => i.status === "COMPLETED")
    .filter((i) => !type || i.type === type)
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return [i.candidateName, i.jobTitle, i.interviewerName]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });

  return (
    <div className="space-y-5">
      <InterviewFilters
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        onCreate={() => {}}
      />
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
      {!isLoading && past.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="No completed interviews"
          description="Completed interviews will appear here with rating and recommendation."
        />
      )}
      {!isLoading && past.length > 0 && (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Job</TableHead>
                <TableHead className="hidden md:table-cell">Interviewer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {past.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AvatarBadge name={i.candidateName} size="sm" />
                      <span className="font-medium">{i.candidateName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {i.jobTitle ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {i.interviewerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(i.scheduledAt, "short")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0 rounded-full",
                        TYPE_META[i.type].color
                      )}
                    >
                      {TYPE_META[i.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RatingStars value={i.rating ?? 0} />
                  </TableCell>
                  <TableCell>
                    {i.recommendation ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 rounded-full",
                          RECOMMENDATION_TONE[i.recommendation]
                        )}
                      >
                        {i.recommendation}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// =========================================================
// All tab — full table with status badge
// =========================================================

function AllTab() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", "all", search, type, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const r = await fetch(`/api/interviews?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });

  const all: Interview[] = data?.items ?? [];
  const filtered = all
    .filter((i) => !type || i.type === type)
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return [i.candidateName, i.jobTitle, i.interviewerName, i.location]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate, job, interviewer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={type || "ALL"}
          onValueChange={(v) => setType(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {INTERVIEW_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No-show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="No interviews found"
          description="Try adjusting filters or schedule a new interview."
        />
      )}
      {!isLoading && filtered.length > 0 && (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Job</TableHead>
                <TableHead className="hidden lg:table-cell">Interviewer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AvatarBadge name={i.candidateName} size="sm" />
                      <span className="font-medium">{i.candidateName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {i.jobTitle ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {i.interviewerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(i.scheduledAt, "datetime")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0 rounded-full",
                        TYPE_META[i.type].color
                      )}
                    >
                      {TYPE_META[i.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0 rounded-full capitalize",
                        STATUS_TONE[i.status]
                      )}
                    >
                      {i.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {i.rating ? (
                      <RatingStars value={i.rating} />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// =========================================================
// Week view — grid of time slots × days
// =========================================================

function WeekView() {
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", "week"],
    queryFn: async () => {
      const r = await fetch("/api/interviews");
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });

  // Build the current week (Mon → Sun).
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Hours: 8 AM → 8 PM
  const HOURS = Array.from({ length: 13 }).map((_, i) => 8 + i);

  const all: Interview[] = data?.items ?? [];

  // Filter interviews to this week's range.
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 7);
  const weekInterviews = all.filter((i) => {
    const t = new Date(i.scheduledAt).getTime();
    return t >= monday.getTime() && t < weekEnd.getTime();
  });

  function cellFor(day: Date, hour: number) {
    return weekInterviews.filter((i) => {
      const d = new Date(i.scheduledAt);
      return (
        d.toDateString() === day.toDateString() &&
        d.getHours() === hour
      );
    });
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <Card className="p-3 md:p-4 overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-end pr-2">
            Time
          </div>
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={cn(
                  "rounded-md py-1.5 px-2 text-center text-xs",
                  isToday
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground"
                )}
              >
                <div className="uppercase tracking-wider text-[10px]">
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </div>
                <div className="text-sm font-medium">
                  {d.getDate()}/{d.getMonth() + 1}
                </div>
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div className="space-y-1">
          {HOURS.map((h) => (
            <div
              key={h}
              className="grid grid-cols-[64px_repeat(7,1fr)] gap-1"
            >
              <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1 tabular-nums">
                {h.toString().padStart(2, "0")}:00
              </div>
              {days.map((d, di) => {
                const items = cellFor(d, h);
                return (
                  <div
                    key={di}
                    className="min-h-[44px] rounded-md border border-border/40 bg-muted/20 p-1 space-y-1"
                  >
                    {items.map((iv) => (
                      <div
                        key={iv.id}
                        className={cn(
                          "rounded px-1.5 py-1 text-[10px] leading-tight border",
                          TYPE_META[iv.type].color
                        )}
                        title={`${iv.candidateName} — ${iv.type}`}
                      >
                        <div className="font-semibold truncate">
                          {iv.candidateName}
                        </div>
                        <div className="truncate opacity-80">
                          {new Date(iv.scheduledAt).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" }
                          )}{" "}
                          · {TYPE_META[iv.type].label}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// =========================================================
// Rating stars
// =========================================================

function RatingStars({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const starCls = size === "md" ? "size-6" : "size-3.5";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const StarIcon = Star;
        return (
          <button
            key={n}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(n)}
            className={cn(
              onChange ? "cursor-pointer" : "cursor-default",
              "transition-transform",
              onChange && "hover:scale-110"
            )}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <StarIcon
              className={cn(
                starCls,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// =========================================================
// Schedule Interview dialog
// =========================================================

function InterviewFormDialog({
  open,
  onOpenChange,
  interview,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  interview: Interview | null;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!interview;

  // Lookup data
  const { data: candidatesData } = useQuery({
    queryKey: ["candidates", "all"],
    queryFn: async () => {
      const r = await fetch("/api/candidates?pageSize=200");
      return r.json();
    },
  });
  const { data: jobsData } = useQuery({
    queryKey: ["jobs", "all"],
    queryFn: async () => {
      const r = await fetch("/api/jobs?pageSize=200");
      return r.json();
    },
  });
  const { data: employeesData } = useQuery({
    queryKey: ["employees", "all"],
    queryFn: async () => {
      const r = await fetch("/api/employees?pageSize=200");
      return r.json();
    },
  });

  const candidates: any[] = candidatesData?.items ?? [];
  const jobs: any[] = jobsData?.items ?? [];
  const employees: any[] = employeesData?.items ?? [];

  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState<InterviewType>("VIDEO");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (interview) {
      setCandidateId(interview.candidateId);
      setJobId(interview.jobId ?? "");
      setInterviewerId(interview.interviewerId ?? "");
      // Format scheduledAt to datetime-local (yyyy-MM-ddThh:mm)
      const d = new Date(interview.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      );
      setDuration(interview.duration);
      setType(interview.type);
      setLocation(interview.location ?? "");
      setMeetingLink(interview.meetingLink ?? "");
      setNotes(interview.notes ?? "");
    } else {
      setCandidateId("");
      setJobId("");
      setInterviewerId("");
      // Default: tomorrow 10:00
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      );
      setDuration(30);
      setType("VIDEO");
      setLocation("");
      setMeetingLink("");
      setNotes("");
    }
  }, [interview, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId) {
      toast.error("Please select a candidate.");
      return;
    }
    if (!scheduledAt) {
      toast.error("Please pick a date and time.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        candidateId,
        jobId: jobId || null,
        interviewerId: interviewerId || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        duration: Number(duration),
        type,
        location: location || null,
        meetingLink: meetingLink || null,
        notes: notes || null,
      };
      const url = isEdit
        ? `/api/interviews/${interview!.id}`
        : "/api/interviews";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save interview");
      }
      toast.success(
        isEdit ? "Interview updated." : "Interview scheduled successfully."
      );
      onSaved();
      qc.invalidateQueries({ queryKey: ["interviews"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save interview.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Interview" : "Schedule Interview"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the interview details below."
              : "Set up a new interview for a candidate."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Candidate *</Label>
              <Select
                value={candidateId}
                onValueChange={setCandidateId}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.job ? `· ${c.job.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Job</Label>
              <Select value={jobId || "NONE"} onValueChange={(v) => setJobId(v === "NONE" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No specific job</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interviewer</Label>
              <Select
                value={interviewerId || "NONE"}
                onValueChange={(v) => setInterviewerId(v === "NONE" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                      {e.designation ? ` · ${e.designation.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date &amp; Time *</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interview Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as InterviewType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Conference Room A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meeting Link</Label>
              <Input
                placeholder="https://meet.example.com/…"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Agenda, prep notes, focus areas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Complete Interview dialog
// =========================================================

function CompleteDialog({
  interview,
  onClose,
  onSaved,
}: {
  interview: Interview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [recommendation, setRecommendation] =
    useState<Recommendation | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (interview) {
      setRating(interview.rating ?? 0);
      setRecommendation(interview.recommendation ?? "");
      setNotes(interview.notes ?? "");
    }
  }, [interview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interview) return;
    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating (1–5 stars).");
      return;
    }
    if (!recommendation) {
      toast.error("Please choose a recommendation.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/interviews/${interview.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          recommendation,
          notes: notes || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to mark interview complete");
      }
      toast.success(`Interview with ${interview.candidateName} marked complete.`);
      onSaved();
      qc.invalidateQueries({ queryKey: ["interviews"] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete interview.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!interview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="size-5 text-primary" />
            Complete Interview
          </DialogTitle>
          <DialogDescription>
            Rate the candidate and record your recommendation for{" "}
            <span className="font-medium text-foreground">
              {interview?.candidateName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rating *</Label>
            <div className="flex items-center gap-1 py-1">
              <RatingStars value={rating} onChange={setRating} size="md" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recommendation *</Label>
            <Select
              value={recommendation}
              onValueChange={(v) => setRecommendation(v as Recommendation)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIRE">Hire</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
                <SelectItem value="HOLD">Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Strengths, concerns, follow-ups…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Candidate Summary tab — aggregated feedback across interviewers
// =========================================================

interface AggSummary {
  avgRating: number;
  recommendationCounts: { HIRE: number; REJECT: number; HOLD: number };
  totalInterviews: number;
  completedInterviews: number;
  ratedInterviews: number;
  interviewers: { id: string | null; name: string; interviewCount: number }[];
  overallRecommendation: Recommendation | null;
  tie: boolean;
}

interface AggResponse {
  candidate: {
    id: string;
    name: string;
    jobId?: string | null;
    status?: string;
    email?: string | null;
  } | null;
  summary: AggSummary;
  timeline: Interview[];
}

const REC_COLORS: Record<Recommendation, string> = {
  HIRE: "#10b981",
  REJECT: "#f43f5e",
  HOLD: "#f59e0b",
};

const REC_TONE: Record<Recommendation, string> = {
  HIRE: "bg-primary/15 text-primary dark:text-primary/80 border-primary/20",
  REJECT: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  HOLD: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

function CandidateSummaryTab() {
  const [candidateId, setCandidateId] = useState<string>("");

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates", "summary-list"],
    queryFn: async () => {
      const r = await fetch("/api/candidates?pageSize=200");
      if (!r.ok) throw new Error("Failed to load candidates");
      return r.json();
    },
  });

  const candidates: any[] = candidatesData?.items ?? [];

  // Presence list used to pick a sensible default candidate (one that
  // actually has interviews).
  const { data: allInterviewsData } = useQuery({
    queryKey: ["interviews", "summary-presence"],
    queryFn: async () => {
      const r = await fetch("/api/interviews");
      if (!r.ok) throw new Error("Failed to load interviews");
      return r.json();
    },
  });
  const interviewsPresent: Interview[] = allInterviewsData?.items ?? [];

  const defaultCandidateId = useMemo(() => {
    if (candidates.length === 0) return "";
    const withInterview = candidates.find((c) =>
      interviewsPresent.some((i) => i.candidateId === c.id)
    );
    return (withInterview ?? candidates[0]).id;
  }, [candidates, interviewsPresent]);

  const effectiveId = candidateId || defaultCandidateId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interviews", "aggregate", effectiveId],
    queryFn: async () => {
      if (!effectiveId) return null;
      const r = await fetch(
        `/api/interviews/aggregate?candidateId=${encodeURIComponent(effectiveId)}`
      );
      if (!r.ok) throw new Error("Failed to load aggregate");
      return r.json();
    },
    enabled: !!effectiveId,
  });

  const agg: AggResponse | null = data ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          Select candidate:
        </Label>
        <Select
          value={effectiveId || "NONE"}
          onValueChange={(v) => setCandidateId(v === "NONE" ? "" : v)}
        >
          <SelectTrigger className="md:max-w-md">
            <SelectValue placeholder="Choose a candidate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">— Select —</SelectItem>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.job ? ` · ${c.job.title}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!effectiveId && (
        <EmptyState
          icon={ClipboardList}
          title="No candidate selected"
          description="Pick a candidate above to see aggregated interview feedback, ratings and recommendations."
        />
      )}

      {effectiveId && candidatesLoading && (
        <Skeleton className="h-64 w-full rounded-xl" />
      )}

      {effectiveId && !candidatesLoading && isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {effectiveId && !candidatesLoading && !isLoading && isError && (
        <EmptyState
          icon={AlertCircle}
          title="Failed to load summary"
          description="Please try again later."
        />
      )}

      {effectiveId && !candidatesLoading && !isLoading && agg && (
        <CandidateSummaryContent agg={agg} />
      )}
    </div>
  );
}

function CandidateSummaryContent({ agg }: { agg: AggResponse }) {
  const { candidate, summary, timeline } = agg;

  const pieData = (
    ["HIRE", "REJECT", "HOLD"] as Recommendation[]
  )
    .map((k) => ({
      name: k,
      value: summary.recommendationCounts[k] ?? 0,
      color: REC_COLORS[k],
    }))
    .filter((d) => d.value > 0);

  const totalRecs = pieData.reduce((s, d) => s + d.value, 0);

  const overallTone = summary.overallRecommendation
    ? REC_TONE[summary.overallRecommendation]
    : "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-5">
      {/* Candidate header + overall recommendation badge */}
      <Card className="p-5 gap-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarBadge name={candidate?.name ?? "?"} size="md" />
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {candidate?.name ?? "Unknown candidate"}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Briefcase className="size-3" />
                {candidate?.status ?? "—"}
                {candidate?.email ? (
                  <>
                    <span className="mx-1">·</span>
                    {candidate.email}
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Overall recommendation
            </div>
            {summary.overallRecommendation ? (
              <Badge
                className={cn(
                  "text-sm px-3 py-1 border font-semibold",
                  overallTone
                )}
              >
                {summary.overallRecommendation}
              </Badge>
            ) : summary.tie && totalRecs > 0 ? (
              <Badge className="text-sm px-3 py-1 border font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20">
                Tied — Hold
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1">
                No recommendation yet
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Avg Rating"
          value={
            summary.avgRating > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                {summary.avgRating.toFixed(1)}
                <Star className="size-4 fill-amber-400 text-amber-400" />
              </span>
            ) : (
              "—"
            )
          }
          icon={Star}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={
            <span className="text-muted-foreground">
              {summary.ratedInterviews} rated
            </span>
          }
        />
        <KpiCard
          label="Total Interviews"
          value={summary.totalInterviews}
          icon={CalendarClock}
          iconClass="bg-primary/10 text-primary"
          footer={
            <span className="text-muted-foreground">
              {summary.completedInterviews} completed
            </span>
          }
        />
        <KpiCard
          label="Interviewers"
          value={summary.interviewers.length}
          icon={UsersIcon}
          iconClass="bg-violet-500/15 text-violet-600"
          footer={
            <span className="text-muted-foreground">
              Unique panel members
            </span>
          }
        />
        <KpiCard
          label="Recommendations"
          value={totalRecs}
          icon={TrendingUp}
          iconClass="bg-primary/15 text-primary"
          footer={
            <span className="text-muted-foreground">
              H{summary.recommendationCounts.HIRE} · R
              {summary.recommendationCounts.REJECT} · H
              {summary.recommendationCounts.HOLD}
            </span>
          }
        />
      </div>

      {/* Recommendation pie + interviewers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 gap-0 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Recommendation Split</h3>
            {totalRecs > 0 ? (
              <span className="text-xs text-muted-foreground">
                {totalRecs} total
              </span>
            ) : null}
          </div>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground italic">
              No recommendations yet
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid #E8DEFB",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {(["HIRE", "REJECT", "HOLD"] as Recommendation[]).map((k) => {
                  const v = summary.recommendationCounts[k] ?? 0;
                  const pct =
                    totalRecs > 0 ? Math.round((v / totalRecs) * 100) : 0;
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-sm"
                          style={{ backgroundColor: REC_COLORS[k] }}
                        />
                        <span className="font-medium">{k}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span>{v}</span>
                        <span className="text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5 gap-0 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3">Interviewers</h3>
          {summary.interviewers.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">
              No interviewers assigned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.interviewers.map((iv, idx) => (
                <div
                  key={`${iv.id ?? "null"}-${idx}`}
                  className="flex items-center gap-2.5 rounded-md border border-border/40 bg-muted/20 p-2.5"
                >
                  <AvatarBadge name={iv.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {iv.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {iv.interviewCount} interview
                      {iv.interviewCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-5 gap-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Interview Timeline</h3>
          <span className="text-xs text-muted-foreground">
            {timeline.length} interview{timeline.length === 1 ? "" : "s"} · chronological
          </span>
        </div>
        {timeline.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interviews yet"
            description="Schedule interviews for this candidate to see a timeline."
          />
        ) : (
          <ol className="relative border-l border-border/60 ml-3 space-y-4">
            {timeline.map((i) => {
              const t = TYPE_META[i.type];
              const TypeIcon = t.icon;
              return (
                <li key={i.id} className="ml-5 pl-2">
                  <span
                    className={cn(
                      "absolute -left-2 size-4 rounded-full border-2 border-background",
                      "ring-2 ring-border/40",
                      i.status === "COMPLETED"
                        ? "bg-primary"
                        : i.status === "CANCELLED" || i.status === "NO_SHOW"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                    )}
                  />
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 rounded-full",
                            t.color
                          )}
                        >
                          <TypeIcon className="size-3 mr-0.5" />
                          {t.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 rounded-full capitalize",
                            STATUS_TONE[i.status]
                          )}
                        >
                          {i.status.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {i.recommendation && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 rounded-full",
                              REC_TONE[i.recommendation]
                            )}
                          >
                            {i.recommendation}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-1.5 flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground" />
                        {i.interviewerName ?? "Unassigned"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {formatDate(i.scheduledAt, "datetime")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {i.duration} min
                        </span>
                        {i.jobTitle && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="size-3" />
                            {i.jobTitle}
                          </span>
                        )}
                      </div>
                      {i.notes && (
                        <div className="mt-2 text-sm text-muted-foreground rounded-md bg-muted/30 p-2 border border-border/40">
                          {i.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      {typeof i.rating === "number" && i.rating > 0 ? (
                        <RatingStars value={i.rating} />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Not rated
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
