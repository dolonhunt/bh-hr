"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  UserPlus,
  UserCheck,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Archive,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Award,
  Trash2,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";

// =========================================================
// Constants & types
// =========================================================

const JOB_STATUSES = ["OPEN", "CLOSED", "ON_HOLD", "FILLED"] as const;
const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "REMOTE",
] as const;

const PIPELINE_STAGES = [
  "APPLIED",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "OFFER",
  "HIRED",
] as const;

const ALL_STAGES = [...PIPELINE_STAGES, "REJECTED"] as const;

type Stage = (typeof ALL_STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const STAGE_ACCENT: Record<Stage, string> = {
  APPLIED: "border-t-amber-400",
  SCREENING: "border-t-amber-500",
  SHORTLISTED: "border-t-sky-400",
  INTERVIEW: "border-t-sky-500",
  SELECTED: "border-t-teal-500",
  OFFER: "border-t-purple-400",
  HIRED: "border-t-purple-600",
  REJECTED: "border-t-rose-500",
};

interface JobDepartment {
  id: string;
  name: string;
  color?: string | null;
}

interface Job {
  id: string;
  title: string;
  departmentId?: string | null;
  department?: JobDepartment | null;
  employmentType: string;
  location?: string | null;
  vacancy: number;
  closingDate?: string | null;
  description?: string | null;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: string;
  createdAt: string;
  candidateCount?: number;
  stageCounts?: Record<string, number>;
}

interface CandidateJob {
  id: string;
  title: string;
  department?: JobDepartment | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  jobId?: string | null;
  job?: CandidateJob | null;
  employeeId?: string | null;
  cvPath?: string | null;
  experience: number;
  skills?: string | null;
  interviewNotes?: string | null;
  expectedSalary?: number | null;
  status: string;
  appliedAt: string;
  updatedAt: string;
}

export function RecruitmentModule() {
  const [tab, setTab] = useState<"jobs" | "candidates">("jobs");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "jobs" | "candidates")}
      className="space-y-6"
    >
      <PageHeader
        title="Recruitment"
        description="Manage job postings and candidate pipelines"

        actions={
          <>
            {tab === "candidates" && (
              <ExportButton module="candidates" filters={{}} />
            )}
          </>
        }
      />
      <TabsList>
        <TabsTrigger value="jobs" className="gap-1.5">
          <Briefcase className="size-4" />
          Jobs
        </TabsTrigger>
        <TabsTrigger value="candidates" className="gap-1.5">
          <Users className="size-4" />
          Candidates
        </TabsTrigger>
      </TabsList>
      <TabsContent value="jobs">
        <JobsTab />
      </TabsContent>
      <TabsContent value="candidates">
        <CandidatesTab />
      </TabsContent>
    </Tabs>
  );
}

// =========================================================
// JOBS TAB
// =========================================================

function JobsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [viewCandidatesJob, setViewCandidatesJob] = useState<Job | null>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", search, departmentId, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "24");
      const r = await fetch(`/api/jobs?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const jobs: Job[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // KPI cards (computed from current page items)
  const openJobs = jobs.filter((j) => j.status === "OPEN").length;
  const totalVacancy = jobs.reduce((s, j) => s + (j.vacancy ?? 0), 0);
  const candidatesApplied = jobs.reduce(
    (s, j) => s + (j.candidateCount ?? 0),
    0
  );
  const hiredThisMonth = jobs.reduce((s, j) => {
    const hired = j.stageCounts?.HIRED ?? 0;
    return s + hired;
  }, 0);

  function openCreate() {
    setEditJob(null);
    setFormOpen(true);
  }

  function openEdit(job: Job) {
    setEditJob(job);
    setFormOpen(true);
  }

  async function archiveJob(job: Job) {
    if (!confirm(`Archive job "${job.title}"? It will be marked CLOSED.`))
      return;
    try {
      const r = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!r.ok) throw new Error("Failed to archive job");
      toast.success(`Job "${job.title}" archived.`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive job.");
    }
  }

  async function deleteJob(job: Job) {
    if (!confirm(`Permanently delete job "${job.title}"?`)) return;
    try {
      const r = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete job");
      toast.success(`Job "${job.title}" deleted.`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete job.");
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Open Jobs"
          value={openJobs}
          icon={Briefcase}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">Hiring now</span>}
        />
        <KpiCard
          label="Total Vacancy"
          value={totalVacancy}
          icon={Users}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={<span className="text-muted-foreground">Open positions</span>}
        />
        <KpiCard
          label="Candidates Applied"
          value={candidatesApplied}
          icon={UserPlus}
          iconClass="bg-sky-500/15 text-sky-600"
          footer={<span className="text-muted-foreground">Across all jobs</span>}
        />
        <KpiCard
          label="Hired (this view)"
          value={hiredThisMonth}
          icon={UserCheck}
          iconClass="bg-primary/15 text-primary"
          footer={<span className="text-muted-foreground">HIRED stage</span>}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, location…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={departmentId || "ALL"}
          onValueChange={(v) => {
            setDepartmentId(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {(departments?.items ?? departments ?? []).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate} className="gap-1.5 md:ml-1">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create Job</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{jobs.length}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> jobs
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && jobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No job postings found"
          description={
            search || departmentId || status
              ? "Try adjusting your filters."
              : "Create your first job posting to start receiving applications."
          }
          actionLabel="Create Job"
          onAction={openCreate}
        />
      )}

      {/* Cards grid */}
      {!isLoading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewCandidates={() => setViewCandidatesJob(job)}
              onEdit={() => openEdit(job)}
              onArchive={() => archiveJob(job)}
              onDelete={() => deleteJob(job)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <JobFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditJob(null);
        }}
        job={editJob}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["jobs"] });
        }}
      />

      <JobCandidatesDialog
        job={viewCandidatesJob}
        onClose={() => setViewCandidatesJob(null)}
      />
    </div>
  );
}

function JobCard({
  job,
  onViewCandidates,
  onEdit,
  onArchive,
  onDelete,
}: {
  job: Job;
  onViewCandidates: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const deptColor = job.department?.color ?? "#94a3b8";
  const salaryRange =
    job.salaryMin || job.salaryMax
      ? `${formatCurrency(job.salaryMin ?? 0)} – ${formatCurrency(job.salaryMax ?? 0)}`
      : "—";

  return (
    <Card
      className={cn(
        "relative border-border/60 shadow-soft p-0 overflow-hidden flex flex-col",
        "border-t-4",
        STAGE_ACCENT[(job.status as Stage) ?? "APPLIED"] ?? "border-t-primary"
      )}
    >
      {/* Department color stripe */}
      <div
        className="h-1 w-full"
        style={{ background: deptColor }}
      />
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">
              {job.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span
                className="size-2 rounded-full"
                style={{ background: deptColor }}
              />
              {job.department?.name ?? "—"}
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <Badge variant="outline" className="capitalize">
            {job.employmentType.replace(/_/g, " ").toLowerCase()}
          </Badge>
          {job.location && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3.5" />
              {job.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="size-3.5" />
            {job.vacancy} {job.vacancy === 1 ? "vacancy" : "vacancies"}
          </span>
          {job.closingDate && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {formatDate(job.closingDate)}
            </span>
          )}
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Salary:</span>{" "}
          <span className="font-medium tabular-nums">{salaryRange}</span>
        </div>

        <div className="flex items-center justify-between pt-1 mt-auto border-t border-border/60">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {job.candidateCount ?? 0}
            </span>{" "}
            candidate{(job.candidateCount ?? 0) === 1 ? "" : "s"}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewCandidates}>
                <Eye className="size-4 mr-2" /> View Candidates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-amber-700 focus:text-amber-800"
                onClick={onArchive}
              >
                <Archive className="size-4 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-700"
                onClick={onDelete}
              >
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

// =========================================================
// JOB FORM DIALOG (Create + Edit)
// =========================================================

function JobFormDialog({
  open,
  onOpenChange,
  job,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  job: Job | null;
  onSaved: () => void;
}) {
  const formKey = `${open ? "open" : "closed"}-${job?.id ?? "new"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => onOpenChange(o)}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {job ? "Edit Job Posting" : "Create Job Posting"}
          </DialogTitle>
          <DialogDescription>
            {job
              ? "Update the details of this job posting."
              : "Fill out the form to publish a new job opening."}
          </DialogDescription>
        </DialogHeader>
        <JobFormBody
          key={formKey}
          job={job}
          onSaved={() => {
            onSaved();
            onOpenChange(false);
            toast.success(job ? "Job updated." : "Job created.");
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function JobFormBody({
  job,
  onSaved,
  onCancel,
}: {
  job: Job | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const [title, setTitle] = useState(job?.title ?? "");
  const [departmentId, setDepartmentId] = useState(job?.departmentId ?? "");
  const [employmentType, setEmploymentType] = useState<string>(
    job?.employmentType ?? "FULL_TIME"
  );
  const [location, setLocation] = useState(job?.location ?? "");
  const [vacancy, setVacancy] = useState<number>(job?.vacancy ?? 1);
  const [closingDate, setClosingDate] = useState<string>(
    job?.closingDate ? job.closingDate.slice(0, 10) : ""
  );
  const [description, setDescription] = useState(job?.description ?? "");
  const [requirements, setRequirements] = useState(job?.requirements ?? "");
  const [salaryMin, setSalaryMin] = useState<string>(
    job?.salaryMin ? String(job.salaryMin) : ""
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    job?.salaryMax ? String(job.salaryMax) : ""
  );
  const [status, setStatus] = useState<string>(job?.status ?? "OPEN");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a job title.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        departmentId: departmentId || null,
        employmentType,
        location: location.trim() || null,
        vacancy: Number(vacancy) || 1,
        closingDate: closingDate || null,
        description: description.trim() || null,
        requirements: requirements.trim() || null,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        status,
      };
      const url = job ? `/api/jobs/${job.id}` : `/api/jobs`;
      const method = job ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save job");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Job Title</Label>
        <Input
          id="title"
          placeholder="e.g. Senior Backend Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select
            value={departmentId || "NONE"}
            onValueChange={(v) => setDepartmentId(v === "NONE" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No department</SelectItem>
              {(departments?.items ?? departments ?? []).map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Employment Type</Label>
          <Select
            value={employmentType}
            onValueChange={setEmploymentType}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Dhaka / Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vacancy">Vacancy</Label>
          <Input
            id="vacancy"
            type="number"
            min={1}
            value={vacancy}
            onChange={(e) => setVacancy(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closingDate">Closing Date</Label>
          <Input
            id="closingDate"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="salaryMin">Salary Min</Label>
          <Input
            id="salaryMin"
            type="number"
            min={0}
            placeholder="e.g. 50000"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salaryMax">Salary Max</Label>
          <Input
            id="salaryMax"
            type="number"
            min={0}
            placeholder="e.g. 80000"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Describe the role and responsibilities…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          rows={3}
          placeholder="Required skills, experience, qualifications…"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving && (
            <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {job ? "Save Changes" : "Create Job"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// =========================================================
// JOB CANDIDATES DIALOG (read-only list of applicants)
// =========================================================

function JobCandidatesDialog({
  job,
  onClose,
}: {
  job: Job | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["job-candidates", job?.id],
    queryFn: async () => {
      const r = await fetch(`/api/candidates?jobId=${job!.id}&pageSize=200`);
      return r.json();
    },
    enabled: !!job,
  });

  if (!job) return null;

  const candidates: Candidate[] = data?.items ?? [];

  return (
    <Dialog
      open={!!job}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Applicants — {job.title}</DialogTitle>
          <DialogDescription>
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"}{" "}
            applied · {job.department?.name ?? "—"}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No candidates have applied for this job yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30"
              >
                <AvatarBadge name={c.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.email}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// CANDIDATES TAB — pipeline board
// =========================================================

function CandidatesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("pageSize", "200");
      const r = await fetch(`/api/candidates?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const candidates: Candidate[] = data?.items ?? [];

  const byStage = useMemo(() => {
    const map: Record<Stage, Candidate[]> = {
      APPLIED: [],
      SCREENING: [],
      SHORTLISTED: [],
      INTERVIEW: [],
      SELECTED: [],
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };
    for (const c of candidates) {
      const stage = (c.status as Stage) ?? "APPLIED";
      if (map[stage]) map[stage].push(c);
      else map.APPLIED.push(c);
    }
    return map;
  }, [candidates]);

  const rejected = byStage.REJECTED;
  const activeStages = PIPELINE_STAGES as readonly Stage[];

  function openCreate() {
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Top filter row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5 md:ml-1">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Add Candidate</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && candidates.length === 0 && (
        <EmptyState
          icon={Users}
          title="No candidates found"
          description={
            search
              ? "Try adjusting your search."
              : "Add your first candidate to start tracking the recruitment pipeline."
          }
          actionLabel="Add Candidate"
          onAction={openCreate}
        />
      )}

      {/* Pipeline board */}
      {!isLoading && candidates.length > 0 && (
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="flex gap-3 min-w-max">
            {activeStages.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                candidates={byStage[stage]}
                onView={setDetail}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejected (collapsed) */}
      {!isLoading && rejected.length > 0 && (
        <Collapsible
          open={rejectedOpen}
          onOpenChange={setRejectedOpen}
          className="rounded-xl border border-rose-500/30 bg-rose-500/5"
        >
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500" />
                <span className="font-medium text-sm">Rejected candidates</span>
                <Badge
                  variant="outline"
                  className="text-rose-700 border-rose-500/30 bg-rose-500/10"
                >
                  {rejected.length}
                </Badge>
              </div>
              {rejectedOpen ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {rejected.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDetail(c)}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60 hover:bg-muted/30 text-left"
                >
                  <AvatarBadge name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <CandidateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["candidates"] })}
      />

      <CandidateDetailDialog
        candidate={detail}
        onClose={() => setDetail(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["candidates"] })}
      />
    </div>
  );
}

function PipelineColumn({
  stage,
  candidates,
  onView,
}: {
  stage: Stage;
  candidates: Candidate[];
  onView: (c: Candidate) => void;
}) {
  return (
    <div className="w-72 shrink-0">
      <div
        className={cn(
          "rounded-t-xl border-t-4 bg-muted/40 border border-border/60",
          STAGE_ACCENT[stage]
        )}
      >
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">
              {STAGE_LABEL[stage]}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[11px] tabular-nums px-1.5"
          >
            {candidates.length}
          </Badge>
        </div>
      </div>
      <div className="bg-muted/20 border border-t-0 border-border/60 rounded-b-xl p-2 space-y-2 max-h-[70vh] overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            No candidates
          </div>
        ) : (
          candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onView(c)}
              className="w-full text-left rounded-lg bg-background border border-border/60 p-2.5 hover:shadow-soft hover:border-border transition-all"
            >
              <div className="flex items-center gap-2">
                <AvatarBadge name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.email}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {Math.round(c.experience)}y exp
                </span>
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  View <ChevronRight className="size-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// =========================================================
// CANDIDATE FORM DIALOG (Add)
// =========================================================

function CandidateFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const formKey = `${open ? "open" : "closed"}-new`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogDescription>
            Create a new candidate record and add them to the APPLIED stage.
          </DialogDescription>
        </DialogHeader>
        <CandidateFormBody
          key={formKey}
          onSaved={() => {
            onSaved();
            onOpenChange(false);
            toast.success("Candidate added.");
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CandidateFormBody({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: jobsData } = useQuery({
    queryKey: ["jobs-select"],
    queryFn: async () => {
      const r = await fetch(`/api/jobs?pageSize=100`);
      return r.json();
    },
  });
  const jobs: Job[] = jobsData?.items ?? [];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobId, setJobId] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter the candidate's name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter the candidate's email.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        jobId: jobId || null,
        experience: experience ? Number(experience) : 0,
        skills: skills.trim() || null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        status: "APPLIED",
      };
      const r = await fetch(`/api/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add candidate");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add candidate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cand-name">Full Name</Label>
          <Input
            id="cand-name"
            placeholder="e.g. Ayesha Siddiqua"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cand-email">Email</Label>
          <Input
            id="cand-email"
            type="email"
            placeholder="e.g. name@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cand-phone">Phone</Label>
          <Input
            id="cand-phone"
            placeholder="e.g. +880 17XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Applied For (Job)</Label>
          <Select
            value={jobId || "NONE"}
            onValueChange={(v) => setJobId(v === "NONE" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No specific job" />
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cand-exp">Experience (yrs)</Label>
          <Input
            id="cand-exp"
            type="number"
            min={0}
            step={0.5}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cand-salary">Expected Salary</Label>
          <Input
            id="cand-salary"
            type="number"
            min={0}
            placeholder="e.g. 60000"
            value={expectedSalary}
            onChange={(e) => setExpectedSalary(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cand-skills">Skills</Label>
        <Textarea
          id="cand-skills"
          rows={2}
          placeholder="Comma-separated list, e.g. Node.js, React, SQL, AWS"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving && (
            <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          Add Candidate
        </Button>
      </DialogFooter>
    </form>
  );
}

// =========================================================
// CANDIDATE DETAIL DIALOG (with stage transition buttons + notes)
// =========================================================

function CandidateDetailDialog({
  candidate,
  onClose,
  onUpdated,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);

  // Sync notes when candidate changes (use key-based remount via candidate.id)
  // We use a derived pattern: track the candidate id and reset state when it changes
  const candidateId = candidate?.id;
  const [trackedId, setTrackedId] = useState<string | null>(null);
  if (candidate && candidate.id !== trackedId) {
    setTrackedId(candidate.id);
    setNotes(candidate.interviewNotes ?? "");
  }
  if (!candidate && trackedId !== null) {
    setTrackedId(null);
  }

  if (!candidate) return null;

  const skills = candidate.skills
    ? candidate.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  async function moveStage(stage: Stage) {
    if (!candidate) return;
    setMoving(stage);
    try {
      const r = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stage }),
      });
      if (!r.ok) throw new Error("Failed to update stage");
      toast.success(`Moved to ${STAGE_LABEL[stage]}.`);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["candidates"] });
      // Close dialog so the pipeline board re-renders in view
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update stage.");
    } finally {
      setMoving(null);
    }
  }

  async function saveNotes() {
    if (!candidate) return;
    setSavingNotes(true);
    try {
      const r = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewNotes: notes.trim() || null }),
      });
      if (!r.ok) throw new Error("Failed to save notes");
      toast.success("Interview notes saved.");
      onUpdated();
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <Dialog
      open={!!candidate}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidate Detail</DialogTitle>
          <DialogDescription>
            Applied {relativeTime(candidate.appliedAt)} ·{" "}
            {candidate.job?.title ?? "No specific job"}
          </DialogDescription>
        </DialogHeader>

        {/* Header: avatar + name + contact */}
        <div className="flex items-start gap-4 rounded-lg border border-border/60 p-4 bg-muted/20">
          <AvatarBadge name={candidate.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-base truncate">
              {candidate.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {candidate.email}
              </span>
              {candidate.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {candidate.phone}
                </span>
              )}
            </div>
            {candidate.job?.department && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: candidate.job.department.color ?? "#94a3b8",
                  }}
                />
                <span className="text-muted-foreground">
                  {candidate.job.department.name}
                </span>
              </div>
            )}
          </div>
          <StatusBadge status={candidate.status} />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoTile
            label="Experience"
            value={`${Math.round(candidate.experience)} yr${candidate.experience === 1 ? "" : "s"}`}
          />
          <InfoTile
            label="Expected Salary"
            value={formatCurrency(candidate.expectedSalary)}
          />
          <InfoTile
            label="Applied"
            value={formatDate(candidate.appliedAt, "short")}
          />
          <InfoTile
            label="Updated"
            value={relativeTime(candidate.updatedAt)}
          />
        </div>

        {/* Skills chips */}
        {skills.length > 0 && (
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-sm font-medium mb-2">Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <Badge
                  key={`${s}-${i}`}
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Interview notes (editable) */}
        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Interview Notes</div>
            <Button
              size="sm"
              variant="outline"
              onClick={saveNotes}
              disabled={savingNotes}
              className="gap-1.5"
            >
              {savingNotes ? (
                <span className="size-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
              ) : (
                <Award className="size-3.5" />
              )}
              Save
            </Button>
          </div>
          <Textarea
            rows={4}
            placeholder="Interviewer feedback, strengths, concerns, next steps…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Stage transitions */}
        <div className="rounded-lg border border-border/60 p-3">
          <div className="text-sm font-medium mb-2">Move to Stage</div>
          <div className="flex flex-wrap gap-2">
            {ALL_STAGES.map((stage) => {
              const active = candidate.status === stage;
              const isRejected = stage === "REJECTED";
              return (
                <Button
                  key={stage}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={active || moving !== null}
                  onClick={() => moveStage(stage)}
                  className={cn(
                    "gap-1.5",
                    isRejected &&
                      !active &&
                      "text-rose-600 border-rose-500/40 hover:bg-rose-500/10",
                    active && isRejected && "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {moving === stage && (
                    <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {STAGE_LABEL[stage]}
                </Button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}
