"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  CalendarClock,
  Clock,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronsUpDown,
  Check,
  UserPlus,
  X,
  Star,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  TrendingUp,
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
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, formatDate, relativeTime } from "@/lib/utils";

// =========================================================
// Constants & types
// =========================================================

const COURSE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
type CourseStatus = (typeof COURSE_STATUSES)[number];

const ENROLLMENT_STATUSES = ["ENROLLED", "COMPLETED", "DROPPED"] as const;
type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

const CATEGORIES = [
  "Technical",
  "Soft Skills",
  "Leadership",
  "Compliance",
  "Onboarding",
  "Safety",
  "Sales",
  "General",
] as const;

const COURSE_STATUS_COLOR: Record<CourseStatus, string> = {
  SCHEDULED: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  IN_PROGRESS:
    "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
  COMPLETED:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const ENROLLMENT_STATUS_COLOR: Record<EnrollmentStatus, string> = {
  ENROLLED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  COMPLETED:
    "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
  DROPPED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

interface Course {
  id: string;
  title: string;
  description: string | null;
  trainer: string | null;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  capacity: number;
  enrolledCount: number;
  status: CourseStatus;
  category: string;
  createdAt: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName: string | null;
  employeeCode: string | null;
  photo: string | null;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  certificate: string | null;
  status: EnrollmentStatus;
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  fullName: string;
  photo?: string | null;
  department?: { name: string; color?: string | null } | null;
  designation?: { name: string } | null;
}

interface Feedback {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string | null;
  rating: number;
  content: string;
  whatWorked: string | null;
  whatCouldImprove: string | null;
  wouldRecommend: boolean;
  submittedAt: string;
}

interface FeedbackSummary {
  totalResponses: number;
  avgRating: number;
  recommendCount: number;
  recommendPct: number;
  distribution: { rating: number; count: number }[];
}

interface FeedbackResponse {
  items: Feedback[];
  total: number;
  summary: FeedbackSummary;
}

const RATING_BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];

// =========================================================
// Main module
// =========================================================

export function TrainingModule() {
  const [tab, setTab] = useState<"courses" | "enrollments" | "feedback">("courses");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "courses" | "enrollments" | "feedback")}
      className="space-y-6"
    >
      <PageHeader
        title="Training & Development"
        description="Manage training courses and certifications"
        icon={<GraduationCap className="size-5" />}
        actions={
          <>
            {tab === "courses" && (
              <ExportButton module="training-courses" filters={{}} />
            )}
            {tab === "enrollments" && (
              <ExportButton module="training-enrollments" filters={{}} />
            )}
          </>
        }
      />
      <TabsList>
        <TabsTrigger value="courses" className="gap-1.5">
          <BookOpen className="size-4" />
          Courses
        </TabsTrigger>
        <TabsTrigger value="enrollments" className="gap-1.5">
          <Users className="size-4" />
          Enrollments
        </TabsTrigger>
        <TabsTrigger value="feedback" className="gap-1.5">
          <MessageSquare className="size-4" />
          Feedback
        </TabsTrigger>
      </TabsList>
      <TabsContent value="courses">
        <CoursesTab />
      </TabsContent>
      <TabsContent value="enrollments">
        <EnrollmentsTab />
      </TabsContent>
      <TabsContent value="feedback">
        <FeedbackTab />
      </TabsContent>
    </Tabs>
  );
}

// =========================================================
// Courses tab
// =========================================================

function useCourses(search: string, status: string) {
  return useQuery({
    queryKey: ["training-courses", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const r = await fetch(`/api/training?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load training courses");
      return r.json();
    },
  });
}

function useEnrollments(search: string, status: string) {
  return useQuery({
    queryKey: ["training-enrollments", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const r = await fetch(
        `/api/training/enrollments?${params.toString()}`
      );
      if (!r.ok) throw new Error("Failed to load enrollments");
      return r.json();
    },
  });
}

function CoursesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);

  const { data, isLoading, isError } = useCourses(search, status);

  const courses: Course[] = data?.items ?? [];
  const enrollmentsQ = useEnrollments("", "");
  const allEnrollments: Enrollment[] = enrollmentsQ.data?.items ?? [];

  // KPIs
  const activeCourses = courses.filter(
    (c) => c.status === "SCHEDULED" || c.status === "IN_PROGRESS"
  ).length;
  const totalEnrollments = allEnrollments.filter(
    (e) => e.status !== "DROPPED"
  ).length;
  const completedEnrollments = allEnrollments.filter(
    (e) => e.status === "COMPLETED"
  ).length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  // Upcoming = startDate within next 7 days
  const now = Date.now();
  const in7d = now + 7 * 24 * 60 * 60 * 1000;
  const upcoming = courses.filter((c) => {
    if (!c.startDate) return false;
    const d = new Date(c.startDate).getTime();
    return d >= now && d <= in7d;
  }).length;

  function openCreate() {
    setEditCourse(null);
    setFormOpen(true);
  }
  function openEdit(c: Course) {
    setEditCourse(c);
    setFormOpen(true);
  }
  async function deleteCourse(c: Course) {
    if (
      !confirm(
        `Permanently delete course "${c.title}"? This will also remove ${c.enrolledCount} enrollment(s).`
      )
    )
      return;
    try {
      const r = await fetch(`/api/training/${c.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete course");
      toast.success(`Course "${c.title}" deleted.`);
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete course.");
    }
  }
  async function setCourseStatus(c: Course, s: CourseStatus) {
    try {
      const r = await fetch(`/api/training/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      if (!r.ok) throw new Error("Failed to update status");
      toast.success(`Course marked as ${s}.`);
      qc.invalidateQueries({ queryKey: ["training-courses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Active Courses"
          value={activeCourses}
          icon={BookOpen}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">Scheduled + ongoing</span>}
        />
        <KpiCard
          label="Total Enrollments"
          value={totalEnrollments}
          icon={Users}
          iconClass="bg-sky-500/15 text-sky-600"
          footer={<span className="text-muted-foreground">Active learners</span>}
        />
        <KpiCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={Award}
          iconClass="text-emerald-500/15 text-primary"
          footer={
            <span className="text-muted-foreground">
              {completedEnrollments} of {totalEnrollments} completed
            </span>
          }
        />
        <KpiCard
          label="Upcoming (7d)"
          value={upcoming}
          icon={CalendarClock}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={<span className="text-muted-foreground">Starting soon</span>}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search courses by title, trainer, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {COURSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate} className="gap-1.5 md:ml-1">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create Course</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span>
              Showing{" "}
              <span className="font-semibold text-foreground">{courses.length}</span>{" "}
              course{courses.length === 1 ? "" : "s"}
              {(search || status) && " (filtered)"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 h-56">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3 mt-2" />
              <Skeleton className="h-3 w-full mt-3" />
              <Skeleton className="h-3 w-3/4 mt-1" />
              <Skeleton className="h-2 w-full mt-4" />
              <Skeleton className="h-8 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={X}
          title="Failed to load courses"
          description="Please try again."
          actionLabel="Retry"
          onAction={() => qc.invalidateQueries({ queryKey: ["training-courses"] })}
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={
            search || status ? "No matching courses" : "No training courses yet"
          }
          description={
            search || status
              ? "Try adjusting your filters."
              : "Create your first training course to start enrolling employees."
          }
          actionLabel="Create Course"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={() => openEdit(c)}
              onDelete={() => deleteCourse(c)}
              onEnroll={() => setEnrollCourse(c)}
              onStatusChange={(s) => setCourseStatus(c, s)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditCourse(null);
        }}
        course={editCourse}
        onSaved={() => qc.invalidateQueries({ queryKey: ["training-courses"] })}
      />

      {/* Enroll dialog */}
      <EnrollDialog
        course={enrollCourse}
        onClose={() => setEnrollCourse(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["training-courses"] });
          qc.invalidateQueries({ queryKey: ["training-enrollments"] });
          setEnrollCourse(null);
        }}
      />
    </div>
  );
}

function CourseCard({
  course,
  onEdit,
  onDelete,
  onEnroll,
  onStatusChange,
}: {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
  onEnroll: () => void;
  onStatusChange: (s: CourseStatus) => void;
}) {
  const pct =
    course.capacity > 0
      ? Math.min(100, Math.round((course.enrolledCount / course.capacity) * 100))
      : 0;
  const isFull = course.capacity > 0 && course.enrolledCount >= course.capacity;
  return (
    <Card className="p-4 flex flex-col gap-3 border-border/60 hover:border-border hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="font-semibold leading-tight truncate"
            title={course.title}
          >
            {course.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge variant="outline" className="text-[10px] font-medium bg-muted/50">
              {course.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "font-medium border text-[10px]",
                COURSE_STATUS_COLOR[course.status]
              )}
            >
              {course.status.charAt(0) + course.status.slice(1).toLowerCase().replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 -mr-1 -mt-1"
              aria-label="Course actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEnroll}>
              <UserPlus className="size-4 mr-2" /> Enroll Employees
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onStatusChange("IN_PROGRESS")}
              disabled={course.status === "IN_PROGRESS"}
            >
              <BookOpen className="size-4 mr-2" /> Mark In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange("COMPLETED")}
              disabled={course.status === "COMPLETED"}
            >
              <CheckCircle2 className="size-4 mr-2" /> Mark Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange("CANCELLED")}
              disabled={course.status === "CANCELLED"}
            >
              <X className="size-4 mr-2" /> Cancel Course
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-700"
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {course.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {course.description}
        </p>
      )}

      <div className="space-y-1 text-xs">
        {course.trainer && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UserCheck className="size-3.5" />
            <span className="truncate">{course.trainer}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span>
            {course.startDate ? formatDate(course.startDate) : "TBD"}
            {course.endDate ? ` → ${formatDate(course.endDate)}` : ""}
          </span>
        </div>
        {course.duration && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{course.duration}</span>
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Enrollment</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              isFull ? "text-amber-600" : "text-foreground"
            )}
          >
            {course.enrolledCount}/{course.capacity || "∞"}
            {isFull && " · Full"}
          </span>
        </div>
        {course.capacity > 0 && (
          <Progress value={pct} className="h-1.5" />
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2">
        <Button
          size="sm"
          variant="default"
          className="h-8 flex-1 gap-1.5"
          onClick={onEnroll}
          disabled={isFull}
        >
          <UserPlus className="size-3.5" />
          {isFull ? "Full" : "Enroll"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
      </div>
    </Card>
  );
}

// =========================================================
// Course form dialog
// =========================================================

function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course: Course | null;
  onSaved: () => void;
}) {
  const formKey = `${open ? "open" : "closed"}-${course?.id ?? "new"}`;
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? "Edit Course" : "Create Training Course"}
          </DialogTitle>
          <DialogDescription>
            {course
              ? "Update course details."
              : "Schedule a new training course and enroll employees after creation."}
          </DialogDescription>
        </DialogHeader>
        <CourseFormBody
          key={formKey}
          course={course}
          savingState={[saving, setSaving]}
          onSaved={() => {
            onSaved();
            onOpenChange(false);
            toast.success(course ? "Course updated." : "Course created.");
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CourseFormBody({
  course,
  savingState,
  onSaved,
  onCancel,
}: {
  course: Course | null;
  savingState: [boolean, (b: boolean) => void];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [trainer, setTrainer] = useState(course?.trainer ?? "");
  const [category, setCategory] = useState(course?.category ?? "Technical");
  const [startDate, setStartDate] = useState(
    course?.startDate ? course.startDate.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    course?.endDate ? course.endDate.slice(0, 10) : ""
  );
  const [duration, setDuration] = useState(course?.duration ?? "");
  const [capacity, setCapacity] = useState(course?.capacity ?? 20);
  const [status, setStatus] = useState<CourseStatus>(
    course?.status ?? "SCHEDULED"
  );
  const [saving, setSaving] = savingState;

  async function submit() {
    if (!title.trim()) {
      toast.error("Course title is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title,
        description: description || null,
        trainer: trainer || null,
        category,
        startDate: startDate || null,
        endDate: endDate || null,
        duration,
        capacity: Number(capacity) || 0,
        status,
      };
      const r = course
        ? await fetch(`/api/training/${course.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/training", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to save course");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save course.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-title">Course title *</Label>
        <Input
          id="course-title"
          placeholder="e.g. Advanced React Patterns"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-desc">Description</Label>
        <Textarea
          id="course-desc"
          placeholder="Brief overview of what the course covers…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="course-trainer">Trainer</Label>
          <Input
            id="course-trainer"
            placeholder="e.g. Jane Smith / External"
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="course-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="course-start">Start date</Label>
          <Input
            id="course-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-end">End date</Label>
          <Input
            id="course-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="course-duration">Duration</Label>
          <Input
            id="course-duration"
            placeholder="e.g. 8 hours"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-capacity">Capacity</Label>
          <Input
            id="course-capacity"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as CourseStatus)}
          >
            <SelectTrigger id="course-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {course ? "Save Changes" : "Create Course"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// =========================================================
// Enrollments tab
// =========================================================

function EnrollmentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [completeEnrollment, setCompleteEnrollment] = useState<Enrollment | null>(null);
  // Per-row loading state: tracks which enrollment is currently generating
  // a certificate PDF (so we can show a spinner on the specific button).
  const [certLoading, setCertLoading] = useState<Record<string, boolean>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  // Pre-fill the feedback dialog for a specific completed enrollment
  // (set when the user clicks "Feedback" on a row).
  const [feedbackEnrollment, setFeedbackEnrollment] = useState<Enrollment | null>(null);

  const { data, isLoading, isError } = useEnrollments(search, status);
  const enrollments: Enrollment[] = data?.items ?? [];
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");

  async function downloadCertificate(e: Enrollment) {
    setCertLoading((s) => ({ ...s, [e.id]: true }));
    try {
      const url = `/api/training/${encodeURIComponent(e.courseId)}/certificate?employeeId=${encodeURIComponent(e.employeeId)}`;
      const r = await fetch(url);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate certificate");
      }
      const blob = await r.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `certificate-${(e.employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}-${e.courseTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success(`Certificate downloaded for ${e.employeeName ?? "employee"}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate certificate.");
    } finally {
      setCertLoading((s) => ({ ...s, [e.id]: false }));
    }
  }

  async function downloadAllCertificates() {
    if (completedEnrollments.length === 0) {
      toast.info("No completed enrollments to certificate.");
      return;
    }
    setDownloadingAll(true);
    let successCount = 0;
    let failCount = 0;
    // Sequential download to avoid browser blocking multiple downloads.
    for (const e of completedEnrollments) {
      try {
        const url = `/api/training/${encodeURIComponent(e.courseId)}/certificate?employeeId=${encodeURIComponent(e.employeeId)}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("failed");
        const blob = await r.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `certificate-${(e.employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}-${e.courseTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        successCount++;
        // Small delay between downloads so the browser doesn't block them.
        await new Promise((res) => setTimeout(res, 250));
      } catch {
        failCount++;
      }
    }
    setDownloadingAll(false);
    if (successCount > 0) {
      toast.success(
        `Generated ${successCount} certificate${successCount === 1 ? "" : "s"}${failCount > 0 ? ` (${failCount} failed)` : ""}.`
      );
    } else {
      toast.error("Failed to generate certificates.");
    }
  }

  async function dropEnrollment(e: Enrollment) {
    if (
      !confirm(
        `Drop ${e.employeeName ?? e.employeeId} from "${e.courseTitle}"?`
      )
    )
      return;
    try {
      const r = await fetch(`/api/training/enrollments/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DROPPED" }),
      });
      if (!r.ok) throw new Error("Failed to drop enrollment");
      toast.success(`Enrollment dropped.`);
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      qc.invalidateQueries({ queryKey: ["training-courses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to drop enrollment.");
    }
  }

  async function reactivateEnrollment(e: Enrollment) {
    try {
      const r = await fetch(`/api/training/enrollments/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENROLLED" }),
      });
      if (!r.ok) throw new Error("Failed to reactivate enrollment");
      toast.success(`Enrollment reactivated.`);
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      qc.invalidateQueries({ queryKey: ["training-courses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to reactivate enrollment.");
    }
  }

  async function deleteEnrollment(e: Enrollment) {
    if (!confirm(`Permanently delete this enrollment record?`)) return;
    try {
      const r = await fetch(`/api/training/enrollments/${e.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Failed to delete enrollment");
      toast.success(`Enrollment deleted.`);
      qc.invalidateQueries({ queryKey: ["training-enrollments"] });
      qc.invalidateQueries({ queryKey: ["training-courses"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete enrollment.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top action bar — Download All Certificates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-primary/20 text-emerald-500/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 size-9 rounded-full text-emerald-500/15 text-primary flex items-center justify-center">
            <Award className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">
              {completedEnrollments.length} completed enrollment
              {completedEnrollments.length === 1 ? "" : "s"} ready for certification
            </div>
            <div className="text-xs text-muted-foreground">
              Generate professional PDF certificates in one click.
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-primary/30 text-primary hover:text-emerald-500/10 hover:text-foreground"
          disabled={downloadingAll || completedEnrollments.length === 0}
          onClick={downloadAllCertificates}
        >
          {downloadingAll ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <Award className="size-4 mr-1.5" />
          )}
          <span className="hidden sm:inline">Download All Certificates</span>
          <span className="sm:hidden">Download All</span>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ENROLLMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span>
            Showing{" "}
            <span className="font-semibold text-foreground">{enrollments.length}</span>{" "}
            enrollment{enrollments.length === 1 ? "" : "s"}
            {(search || status) && " (filtered)"}
          </span>
        )}
      </div>

      {isLoading ? (
        <Card className="p-0 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 border-b border-border/40"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </Card>
      ) : isError ? (
        <EmptyState
          icon={X}
          title="Failed to load enrollments"
          description="Please try again."
          actionLabel="Retry"
          onAction={() =>
            qc.invalidateQueries({ queryKey: ["training-enrollments"] })
          }
        />
      ) : enrollments.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            search || status ? "No matching enrollments" : "No enrollments yet"
          }
          description={
            search || status
              ? "Try adjusting your filters."
              : "Enroll employees into courses from the Courses tab."
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden border-border/60">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                  <TableHead className="hidden lg:table-cell">Completed</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="hidden xl:table-cell">Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarBadge
                          name={e.employeeName ?? "?"}
                          photo={e.photo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[140px]">
                            {e.employeeName ?? "Unknown"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {e.employeeCode ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm truncate max-w-[200px]" title={e.courseTitle}>
                        {e.courseTitle}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDate(e.enrolledAt)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {e.completedAt ? formatDate(e.completedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {e.score !== null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium text-[11px]",
                            e.score >= 80
                              ? "text-emerald-500/15 text-primary border-primary/20"
                              : e.score >= 50
                                ? "bg-amber-500/15 text-amber-700 border-amber-500/20"
                                : "bg-rose-500/15 text-rose-700 border-rose-500/20"
                          )}
                        >
                          {e.score}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {e.certificate ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Award className="size-3" />
                          <span className="truncate max-w-[120px]" title={e.certificate}>
                            {e.certificate}
                          </span>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium border text-[11px]",
                          ENROLLMENT_STATUS_COLOR[e.status]
                        )}
                      >
                        {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === "ENROLLED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setCompleteEnrollment(e)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span className="hidden xl:inline">Complete</span>
                          </Button>
                        )}
                        {e.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-primary/30 text-primary hover:text-emerald-500/10 hover:text-foreground"
                            disabled={certLoading[e.id]}
                            onClick={() => downloadCertificate(e)}
                            title="Download certificate PDF"
                          >
                            {certLoading[e.id] ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Award className="size-3.5" />
                            )}
                            <span className="hidden xl:inline">Certificate</span>
                          </Button>
                        )}
                        {e.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => setFeedbackEnrollment(e)}
                            title="Submit feedback"
                          >
                            <MessageSquare className="size-3.5" />
                            <span className="hidden xl:inline">Feedback</span>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Actions"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {e.status === "ENROLLED" && (
                              <DropdownMenuItem
                                onClick={() => setCompleteEnrollment(e)}
                              >
                                <CheckCircle2 className="size-4 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            {e.status === "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={() => downloadCertificate(e)}
                                disabled={certLoading[e.id]}
                              >
                                {certLoading[e.id] ? (
                                  <Loader2 className="size-4 mr-2 animate-spin" />
                                ) : (
                                  <Award className="size-4 mr-2" />
                                )}
                                Download Certificate
                              </DropdownMenuItem>
                            )}
                            {e.status === "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={() => setFeedbackEnrollment(e)}
                              >
                                <MessageSquare className="size-4 mr-2" /> Submit Feedback
                              </DropdownMenuItem>
                            )}
                            {e.status === "DROPPED" && (
                              <DropdownMenuItem
                                onClick={() => reactivateEnrollment(e)}
                              >
                                <UserCheck className="size-4 mr-2" /> Reactivate
                              </DropdownMenuItem>
                            )}
                            {e.status === "ENROLLED" && (
                              <DropdownMenuItem
                                className="text-amber-600 focus:text-amber-700"
                                onClick={() => dropEnrollment(e)}
                              >
                                <UserX className="size-4 mr-2" /> Drop
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-700"
                              onClick={() => deleteEnrollment(e)}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <CompleteDialog
        enrollment={completeEnrollment}
        onClose={() => setCompleteEnrollment(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["training-enrollments"] });
          qc.invalidateQueries({ queryKey: ["training-courses"] });
          setCompleteEnrollment(null);
        }}
      />

      {/* Quick submit-feedback dialog launched from a completed enrollment row */}
      <SubmitFeedbackDialog
        course={feedbackEnrollment ? {
          id: feedbackEnrollment.courseId,
          title: feedbackEnrollment.courseTitle,
        } : null}
        presetEmployeeId={feedbackEnrollment?.employeeId ?? null}
        onClose={() => setFeedbackEnrollment(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["training-feedback"] });
          setFeedbackEnrollment(null);
        }}
      />
    </div>
  );
}

// =========================================================
// Multi-select employee picker (for enroll dialog)
// =========================================================

function useEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const r = await fetch(`/api/employees?pageSize=500`);
      return r.json();
    },
    enabled,
  });
}

function MultiEmployeePicker({
  employees,
  selected,
  onToggle,
}: {
  employees: EmployeeOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(query.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(query.toLowerCase()) ||
      (e.department?.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" />
              {selected.size === 0
                ? "Select employees to enroll…"
                : `${selected.size} employee${selected.size === 1 ? "" : "s"} selected`}
            </span>
            <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search name, ID, or department…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((e) => {
                  const isSelected = selected.has(e.id);
                  return (
                    <CommandItem
                      key={e.id}
                      value={`${e.fullName} ${e.employeeId}`}
                      onSelect={() => onToggle(e.id)}
                    >
                      <AvatarBadge
                        name={e.fullName}
                        photo={e.photo}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {e.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {e.employeeId} · {e.department?.name ?? "—"}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="size-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 rounded-md border border-border/60 bg-muted/20">
          {Array.from(selected).map((id) => {
            const emp = employees.find((e) => e.id === id);
            if (!emp) return null;
            return (
              <Badge
                key={id}
                variant="outline"
                className="gap-1 py-1 pl-1.5 pr-1 bg-background"
              >
                <AvatarBadge
                  name={emp.fullName}
                  photo={emp.photo}
                  size="sm"
                  className="size-5 text-[8px]"
                />
                <span className="text-xs">{emp.fullName}</span>
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  aria-label={`Remove ${emp.fullName}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================================
// Enroll dialog (multi-select)
// =========================================================

function EnrollDialog({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: employeesData } = useEmployees(!!course);
  const employees: EmployeeOption[] = useMemo(
    () =>
      (employeesData?.items ?? []).map((e: any) => ({
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        photo: e.photo,
        department: e.department,
        designation: e.designation,
      })) ?? [],
    [employeesData]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const resetKey = course?.id ?? "none";
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!course) return;
    if (selected.size === 0) {
      toast.error("Please select at least one employee.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/training/${course.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: Array.from(selected) }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to enroll employees");
      }
      const data = await r.json();
      toast.success(
        data.enrolled > 0
          ? `Enrolled ${data.enrolled} employee${data.enrolled === 1 ? "" : "s"} in "${course.title}".`
          : "No new enrollments (already enrolled)."
      );
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to enroll employees.");
    } finally {
      setSaving(false);
    }
  }

  const isFull =
    course && course.capacity > 0 && course.enrolledCount >= course.capacity;

  return (
    <Dialog
      open={!!course}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Enroll Employees
          </DialogTitle>
          <DialogDescription>
            {course
              ? `Select employees to enroll in "${course.title}".`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {isFull && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs px-3 py-2">
            This course is currently at capacity. Existing enrollments may be
            reactivated, but no new active enrollments will be added.
          </div>
        )}

        <div className="space-y-3">
          {employeesData ? (
            <MultiEmployeePicker
              employees={employees}
              selected={selected}
              onToggle={toggle}
            />
          ) : (
            <Skeleton className="h-10 w-full" />
          )}

          {course && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Capacity: <span className="font-medium text-foreground">{course.capacity || "Unlimited"}</span>
              </span>
              <span>
                Enrolled: <span className="font-medium text-foreground">{course.enrolledCount}</span>
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Enroll {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Complete dialog
// =========================================================

function CompleteDialog({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: Enrollment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [score, setScore] = useState<string>("");
  const [certificate, setCertificate] = useState("");
  const [saving, setSaving] = useState(false);

  const resetKey = enrollment?.id ?? "none";
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setScore(
      enrollment && enrollment.score !== null ? String(enrollment.score) : ""
    );
    setCertificate(enrollment?.certificate ?? "");
  }

  async function submit() {
    if (!enrollment) return;
    setSaving(true);
    try {
      const body: any = { employeeId: enrollment.employeeId };
      if (score !== "") body.score = Number(score);
      if (certificate.trim()) body.certificate = certificate.trim();
      const r = await fetch(
        `/api/training/${enrollment.courseId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to mark complete");
      }
      toast.success(`Marked as completed.`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark complete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!enrollment}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            Mark Enrollment Complete
          </DialogTitle>
          <DialogDescription>
            {enrollment
              ? `Record completion for ${enrollment.employeeName ?? "employee"} in "${enrollment.courseTitle}".`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="complete-score">Score (%) — optional</Label>
            <Input
              id="complete-score"
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 85"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="complete-cert">Certificate / credential ID — optional</Label>
            <Input
              id="complete-cert"
              placeholder="e.g. CERT-2024-001"
              value={certificate}
              onChange={(e) => setCertificate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Feedback Tab — post-course surveys
// =========================================================

function useCoursesForFeedback() {
  return useQuery({
    queryKey: ["training-courses", "feedback-list"],
    queryFn: async () => {
      const r = await fetch(`/api/training?pageSize=500`);
      if (!r.ok) throw new Error("Failed to load courses");
      return r.json();
    },
  });
}

function useCourseFeedback(courseId: string | null) {
  return useQuery({
    queryKey: ["training-feedback", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const r = await fetch(`/api/training/${courseId}/feedback`);
      if (!r.ok) throw new Error("Failed to load feedback");
      return r.json();
    },
    enabled: !!courseId,
  });
}

function FeedbackTab() {
  const qc = useQueryClient();
  const coursesQ = useCoursesForFeedback();
  const courses: Course[] = coursesQ.data?.items ?? [];
  // `userSelectedCourseId` is the explicit user choice ("" = not yet chosen).
  // The effective selectedCourseId falls back to the first course when available
  // so the tab shows feedback immediately instead of an empty state.
  const [userSelectedCourseId, setUserSelectedCourseId] = useState<string>("");
  const selectedCourseId = userSelectedCourseId || courses[0]?.id || "";
  const [submitOpen, setSubmitOpen] = useState(false);
  const [presetEmployeeId, setPresetEmployeeId] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const feedbackQ = useCourseFeedback(selectedCourseId || null);
  const feedback: Feedback[] = feedbackQ.data?.items ?? [];
  const summary: FeedbackSummary | undefined = feedbackQ.data?.summary;

  function openSubmit(employeeId?: string) {
    setPresetEmployeeId(employeeId ?? null);
    setSubmitOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Course selector + submit button */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <Label htmlFor="feedback-course" className="sr-only">
            Select course
          </Label>
          <Select
            value={selectedCourseId || "NONE"}
            onValueChange={(v) => setUserSelectedCourseId(v === "NONE" ? "" : v)}
          >
            <SelectTrigger id="feedback-course" className="md:max-w-md">
              <SelectValue placeholder="Select a course to view feedback…" />
            </SelectTrigger>
            <SelectContent>
              {courses.length === 0 ? (
                <SelectItem value="NONE" disabled>
                  No courses available
                </SelectItem>
              ) : (
                courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({c.category})
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!selectedCourseId}
          onClick={() => openSubmit()}
        >
          <Plus className="size-4" />
          Submit Feedback
        </Button>
      </div>

      {coursesQ.isLoading ? (
        <Skeleton className="h-8 w-full md:max-w-md" />
      ) : null}

      {!selectedCourseId ? (
        <EmptyState
          icon={MessageSquare}
          title="Select a course to view feedback"
          description="Pick a course from the dropdown above to see what employees had to say after completing it."
        />
      ) : feedbackQ.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : feedbackQ.isError ? (
        <EmptyState
          icon={X}
          title="Failed to load feedback"
          description="Please try again."
          actionLabel="Retry"
          onAction={() =>
            qc.invalidateQueries({
              queryKey: ["training-feedback", selectedCourseId],
            })
          }
        />
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <KpiCard
              label="Avg Rating"
              value={
                summary ? (
                  <span className="inline-flex items-center gap-1.5">
                    {summary.avgRating.toFixed(1)}
                    <StarRating value={Math.round(summary.avgRating)} size={14} />
                  </span>
                ) : (
                  "—"
                )
              }
              icon={Star}
              iconClass="bg-amber-500/15 text-amber-600"
              footer={
                <span className="text-muted-foreground">
                  {summary?.totalResponses ?? 0} response
                  {(summary?.totalResponses ?? 0) === 1 ? "" : "s"}
                </span>
              }
            />
            <KpiCard
              label="Would Recommend"
              value={summary ? `${summary.recommendPct}%` : "—"}
              icon={ThumbsUp}
              iconClass="text-emerald-500/15 text-primary"
              footer={
                <span className="text-muted-foreground">
                  {summary?.recommendCount ?? 0} of{" "}
                  {summary?.totalResponses ?? 0} recommend
                </span>
              }
            />
            <KpiCard
              label="Total Responses"
              value={summary?.totalResponses ?? 0}
              icon={MessageSquare}
              iconClass="bg-primary/10 text-primary"
              footer={
                <span className="text-muted-foreground">
                  {selectedCourse?.title ?? "Selected course"}
                </span>
              }
            />
          </div>

          {/* Rating distribution */}
          {summary && summary.totalResponses > 0 ? (
            <Card className="p-4 sm:p-5 border-border/60">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Rating Distribution</div>
                  <div className="text-xs text-muted-foreground">
                    How employees rated this course
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  N = {summary.totalResponses}
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.distribution}
                    margin={{ top: 8, right: 12, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis
                      dataKey="rating"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}★`}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={32}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: number) => [
                        `${value} response${value === 1 ? "" : "s"}`,
                        `Rating`,
                      ]}
                      labelFormatter={(label) => `${label} star`}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {summary.distribution.map((entry) => (
                        <Cell
                          key={entry.rating}
                          fill={RATING_BAR_COLORS[entry.rating - 1]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No feedback yet"
              description="Once employees complete this course, their feedback will appear here with rating distribution and individual responses."
              actionLabel="Submit First Feedback"
              onAction={() => openSubmit()}
            />
          )}

          {/* Feedback list */}
          {feedback.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">
                  Individual Responses
                </div>
                <div className="text-xs text-muted-foreground">
                  {feedback.length} response{feedback.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
                {feedback.map((f) => (
                  <FeedbackCard key={f.id} feedback={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {submitOpen && selectedCourse && (
        <SubmitFeedbackDialog
          course={selectedCourse}
          presetEmployeeId={presetEmployeeId}
          onClose={() => {
            setSubmitOpen(false);
            setPresetEmployeeId(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({
              queryKey: ["training-feedback", selectedCourseId],
            });
            setSubmitOpen(false);
            setPresetEmployeeId(null);
          }}
        />
      )}
    </div>
  );
}

function FeedbackCard({ feedback: f }: { feedback: Feedback }) {
  return (
    <Card className="p-4 border-border/60 hover:shadow-soft transition-shadow">
      <div className="flex items-start gap-3">
        <AvatarBadge
          name={f.employeeName ?? "?"}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {f.employeeName ?? "Anonymous"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {relativeTime(f.submittedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StarRating value={f.rating} />
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 gap-1",
                  f.wouldRecommend
                    ? "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20"
                )}
              >
                <ThumbsUp className="size-3" />
                {f.wouldRecommend ? "Recommends" : "Doesn't recommend"}
              </Badge>
            </div>
          </div>

          <p className="text-sm mt-2 text-foreground/90 leading-relaxed">
            {f.content}
          </p>

          {(f.whatWorked || f.whatCouldImprove) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {f.whatWorked && (
                <div className="rounded-md text-emerald-500/5 border border-primary/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-primary dark:text-primary/80 font-semibold flex items-center gap-1 mb-1">
                    <Sparkles className="size-3" />
                    What worked well
                  </div>
                  <div className="text-xs text-foreground/80">
                    {f.whatWorked}
                  </div>
                </div>
              )}
              {f.whatCouldImprove && (
                <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1 mb-1">
                    <TrendingUp className="size-3" />
                    Could improve
                  </div>
                  <div className="text-xs text-foreground/80">
                    {f.whatCouldImprove}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StarRating({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < value
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

// =========================================================
// Submit Feedback Dialog
// =========================================================

function SubmitFeedbackDialog({
  course,
  presetEmployeeId,
  onClose,
  onSaved,
}: {
  course: { id: string; title: string } | null;
  presetEmployeeId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Fetch completed enrollments for this course to populate the employee picker.
  const enrollmentsQ = useQuery({
    queryKey: ["training-feedback", "eligible-employees", course?.id],
    queryFn: async () => {
      if (!course) return { items: [] };
      const r = await fetch(`/api/training/${course.id}/enroll`);
      if (!r.ok) throw new Error("Failed to load enrollments");
      return r.json();
    },
    enabled: !!course,
  });

  const eligibleEmployees: EmployeeOption[] = useMemo(() => {
    const items: Enrollment[] = enrollmentsQ.data?.items ?? [];
    return items
      .filter((e) => e.status === "COMPLETED")
      .map((e) => ({
        id: e.employeeId,
        employeeId: e.employeeCode ?? e.employeeId,
        fullName: e.employeeName ?? "Unknown",
        photo: e.photo,
        department: null,
        designation: null,
      }));
  }, [enrollmentsQ.data]);

  const [employeeId, setEmployeeId] = useState<string>(presetEmployeeId ?? "");
  const [rating, setRating] = useState<number>(5);
  const [content, setContent] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatCouldImprove, setWhatCouldImprove] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presetEmployeeId) setEmployeeId(presetEmployeeId);
  }, [presetEmployeeId]);

  // Reset state when dialog opens for a new course
  useEffect(() => {
    if (course) {
      setRating(5);
      setContent("");
      setWhatWorked("");
      setWhatCouldImprove("");
      setWouldRecommend(true);
      if (!presetEmployeeId) setEmployeeId("");
    }
  }, [course?.id, presetEmployeeId]);

  async function submit() {
    if (!course) return;
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please provide overall feedback.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        employeeId,
        rating,
        content: content.trim(),
        wouldRecommend,
      };
      if (whatWorked.trim()) body.whatWorked = whatWorked.trim();
      if (whatCouldImprove.trim()) body.whatCouldImprove = whatCouldImprove.trim();

      const r = await fetch(`/api/training/${course.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to submit feedback");
      }
      toast.success("Feedback submitted. Thank you!");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!course}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Submit Course Feedback
          </DialogTitle>
          <DialogDescription>
            {course
              ? `Share your thoughts on "${course.title}". Your feedback helps improve future sessions.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {enrollmentsQ.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : eligibleEmployees.length === 0 ? (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs px-3 py-2">
            No employees have completed this course yet. Feedback can only be
            submitted by employees who have a COMPLETED enrollment.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Employee select */}
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select
                value={employeeId}
                onValueChange={setEmployeeId}
                disabled={!!presetEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your name…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Only employees who completed this course can submit feedback.
              </p>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label>Rating *</Label>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      className="p-0.5 rounded hover:bg-muted/60 transition-colors"
                      aria-label={`${v} star${v === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          v <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-muted-foreground/40"
                        )}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-sm font-medium">
                  {rating} / 5
                </span>
              </div>
            </div>

            {/* Overall feedback */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-content">Overall feedback *</Label>
              <Textarea
                id="fb-content"
                placeholder="Share your overall experience with the course…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            {/* What worked */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-worked">
                What worked well?{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="fb-worked"
                placeholder="Specific exercises, examples, or aspects that were effective…"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={2}
              />
            </div>

            {/* What could improve */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-improve">
                What could be improved?{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="fb-improve"
                placeholder="Suggestions for future iterations of this course…"
                value={whatCouldImprove}
                onChange={(e) => setWhatCouldImprove(e.target.value)}
                rows={2}
              />
            </div>

            {/* Would recommend */}
            <div className="space-y-1.5">
              <Label>Would you recommend this course?</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={wouldRecommend ? "default" : "outline"}
                  className={cn(
                    "gap-1.5",
                    wouldRecommend &&
                      "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                  onClick={() => setWouldRecommend(true)}
                >
                  <ThumbsUp className="size-3.5" />
                  Yes, recommend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!wouldRecommend ? "default" : "outline"}
                  className={cn(
                    "gap-1.5",
                    !wouldRecommend && "bg-rose-600 hover:bg-rose-700 text-white"
                  )}
                  onClick={() => setWouldRecommend(false)}
                >
                  <X className="size-3.5" />
                  Not really
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || eligibleEmployees.length === 0}
            className="gap-1.5"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

