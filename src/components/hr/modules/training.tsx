"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { cn, formatDate } from "@/lib/utils";

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
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  COMPLETED:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const ENROLLMENT_STATUS_COLOR: Record<EnrollmentStatus, string> = {
  ENROLLED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  COMPLETED:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
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

// =========================================================
// Main module
// =========================================================

export function TrainingModule() {
  const [tab, setTab] = useState<"courses" | "enrollments">("courses");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "courses" | "enrollments")}
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
      </TabsList>
      <TabsContent value="courses">
        <CoursesTab />
      </TabsContent>
      <TabsContent value="enrollments">
        <EnrollmentsTab />
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
          iconClass="bg-emerald-500/15 text-emerald-600"
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

  const { data, isLoading, isError } = useEnrollments(search, status);
  const enrollments: Enrollment[] = data?.items ?? [];

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
                              ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/20"
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
