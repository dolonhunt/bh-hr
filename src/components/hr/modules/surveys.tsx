"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  MessageSquare,
  Star,
  Plus,
  Trash2,
  Pencil,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Users,
  BarChart3,
  TrendingUp,
  Send,
  ClipboardList,
  CircleDashed,
  Lock,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
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
import { Switch } from "@/components/ui/switch";
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
import { cn, formatDate, relativeTime } from "@/lib/utils";

// =========================================================
// Types & constants
// =========================================================

type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";
type QuestionType = "TEXT" | "RATING" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  anonymous?: boolean;
  createdAt: string;
  createdBy: string | null;
  questions: SurveyQuestion[];
  responseCount: number;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId?: string | null;
  employeeName?: string | null;
  anonymous?: boolean;
  displayName?: string;
  answers: { questionId: string; value: any }[];
  submittedAt: string;
  createdAt: string;
}

interface SurveyDetail extends Survey {
  responses: SurveyResponse[];
}

const Q_TYPES: QuestionType[] = [
  "TEXT",
  "RATING",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
];

const Q_TYPE_LABEL: Record<QuestionType, string> = {
  TEXT: "Text",
  RATING: "Rating (1–5)",
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
};

const Q_TYPE_ICON: Record<QuestionType, typeof MessageSquare> = {
  TEXT: MessageSquare,
  RATING: Star,
  SINGLE_CHOICE: CircleDashed,
  MULTIPLE_CHOICE: CheckCircle2,
};

const CHART_COLORS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
  "#f97316",
  "#0ea5e9",
  "#84cc16",
];

// =========================================================
// Main module
// =========================================================

export function SurveysModule() {
  const [tab, setTab] = useState<"surveys" | "responses">("surveys");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback & Surveys"
        description="Collect employee feedback and engagement insights"
        icon={<MessageSquare className="size-5" />}
        actions={<ExportButton module="surveys" filters={{}} />}
      />
      <KpiRow />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "surveys" | "responses")}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="surveys" className="gap-1.5">
            <ClipboardList className="size-4" />
            Surveys
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-1.5">
            <BarChart3 className="size-4" />
            Responses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="surveys">
          <SurveysTab />
        </TabsContent>
        <TabsContent value="responses">
          <ResponsesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =========================================================
// KPI Row
// =========================================================

const ASSUMED_EMPLOYEE_COUNT = 20; // Approx denominator for response rate.

function KpiRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["surveys", "list"],
    queryFn: async () => {
      const r = await fetch("/api/surveys");
      if (!r.ok) throw new Error("Failed to load surveys");
      return r.json();
    },
  });

  const surveys: Survey[] = data?.items ?? [];

  const active = surveys.filter((s) => s.status === "ACTIVE").length;
  const totalResponses = surveys.reduce((s, x) => s + (x.responseCount ?? 0), 0);
  const responseRate =
    surveys.length > 0
      ? Math.min(
          100,
          Math.round(
            (totalResponses /
              (surveys.length * ASSUMED_EMPLOYEE_COUNT || 1)) *
              100
          )
        )
      : 0;

  // Avg rating: fetch detail records for every non-draft survey in parallel
  // via useQueries (no manual setState). Derived during render.
  const activeSurveys = surveys.filter((s) => s.status !== "DRAFT");
  const detailQueries = useQueries({
    queries: activeSurveys.map((s) => ({
      queryKey: ["survey", "detail", s.id],
      queryFn: async () => {
        const r = await fetch(`/api/surveys/${s.id}`);
        if (!r.ok) return null;
        return r.json();
      },
      enabled: surveys.length > 0,
    })),
  });

  const avgRating = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const q of detailQueries) {
      const d = q.data;
      if (!d || !d.responses) continue;
      for (const r of d.responses) {
        for (const question of d.questions ?? []) {
          if (question.type !== "RATING") continue;
          const ans = r.answers?.find(
            (a: any) => a.questionId === question.id
          );
          if (ans && typeof ans.value === "number") {
            total += ans.value;
            count += 1;
          }
        }
      }
    }
    return count > 0 ? total / count : null;
  }, [detailQueries]);

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
        label="Active Surveys"
        value={active}
        icon={MessageSquare}
        iconClass="bg-primary/10 text-primary"
        footer={<span className="text-muted-foreground">Currently open</span>}
      />
      <KpiCard
        label="Total Responses"
        value={totalResponses}
        icon={Users}
        iconClass="bg-primary/15 text-primary"
        footer={<span className="text-muted-foreground">All surveys</span>}
      />
      <KpiCard
        label="Avg Response Rate"
        value={`${responseRate}%`}
        icon={TrendingUp}
        iconClass="bg-amber-500/15 text-amber-600"
        footer={<span className="text-muted-foreground">Approx.</span>}
      />
      <KpiCard
        label="Avg Rating"
        value={avgRating !== null ? avgRating.toFixed(1) : "—"}
        icon={Star}
        iconClass="bg-violet-500/15 text-violet-600"
        footer={
          <span className="text-muted-foreground">
            {avgRating !== null ? "Across all rating Qs" : "No ratings yet"}
          </span>
        }
      />
    </div>
  );
}

// =========================================================
// Surveys tab — card grid
// =========================================================

function SurveysTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveys", "list", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const r = await fetch(`/api/surveys?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load surveys");
      return r.json();
    },
  });

  const surveys: Survey[] = data?.items ?? [];
  const filtered = surveys.filter((s) => {
    if (status && s.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function closeSurvey(s: Survey) {
    if (!confirm(`Close survey "${s.title}"? No new responses will be accepted.`))
      return;
    try {
      const r = await fetch(`/api/surveys/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!r.ok) throw new Error("Failed to close survey");
      toast.success(`Survey "${s.title}" closed.`);
      qc.invalidateQueries({ queryKey: ["surveys"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to close survey.");
    }
  }

  async function activateSurvey(s: Survey) {
    try {
      const r = await fetch(`/api/surveys/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!r.ok) throw new Error("Failed to activate survey");
      toast.success(`Survey "${s.title}" is now active.`);
      qc.invalidateQueries({ queryKey: ["surveys"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate survey.");
    }
  }

  async function deleteSurvey(s: Survey) {
    if (
      !confirm(
        `Permanently delete "${s.title}" and all ${s.responseCount} response(s)?`
      )
    )
      return;
    try {
      const r = await fetch(`/api/surveys/${s.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete survey");
      toast.success(`Survey "${s.title}" deleted.`);
      qc.invalidateQueries({ queryKey: ["surveys"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete survey.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Search surveys…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:max-w-xs"
        />
        <Select
          value={status || "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => {
            setEditSurvey(null);
            setCreateOpen(true);
          }}
          className="gap-1.5 md:ml-auto"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create Survey</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={X}
          title="Failed to load surveys"
          description="Please try again later."
        />
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No surveys yet"
          description="Create your first survey to start collecting employee feedback."
          actionLabel="Create Survey"
          onAction={() => {
            setEditSurvey(null);
            setCreateOpen(true);
          }}
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              onEdit={() => {
                setEditSurvey(s);
                setCreateOpen(true);
              }}
              onClose={() => closeSurvey(s)}
              onActivate={() => activateSurvey(s)}
              onDelete={() => deleteSurvey(s)}
            />
          ))}
        </div>
      )}

      <SurveyFormDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setEditSurvey(null);
        }}
        survey={editSurvey}
        onSaved={() => qc.invalidateQueries({ queryKey: ["surveys"] })}
      />
    </div>
  );
}

function SurveyCard({
  survey,
  onEdit,
  onClose,
  onActivate,
  onDelete,
}: {
  survey: Survey;
  onEdit: () => void;
  onClose: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const responseRate = Math.min(
    100,
    Math.round(
      (survey.responseCount / (ASSUMED_EMPLOYEE_COUNT || 1)) * 100
    )
  );

  return (
    <Card className="p-5 gap-0 border-border/60 shadow-soft hover:shadow-card-hover hover:border-border transition-all flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{survey.title}</h3>
          {survey.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {survey.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {survey.anonymous && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary dark:text-primary/80 border-primary/20 gap-1"
            >
              <ShieldCheck className="size-3" />
              Anonymous
            </Badge>
          )}
          <StatusBadge status={survey.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
        <div className="rounded-md bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Questions
          </div>
          <div className="font-semibold text-base mt-0.5">
            {survey.questions.length}
          </div>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Responses
          </div>
          <div className="font-semibold text-base mt-0.5">
            {survey.responseCount}
          </div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Response rate</span>
          <span className="font-medium tabular-nums">{responseRate}%</span>
        </div>
        <Progress value={responseRate} className="h-1.5" />
      </div>

      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
        <Users className="size-3" />
        Created {relativeTime(survey.createdAt)}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-1"
          onClick={() => {
            // Switch to Responses tab — emit via custom event for the
            // parent module. Simpler: open in new dialog using URL hash.
            // Use a custom window event.
            window.dispatchEvent(
              new CustomEvent("surveys:view-responses", {
                detail: { surveyId: survey.id },
              })
            );
          }}
        >
          <Eye className="size-3.5" />
          View Responses
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Plus className="size-4 rotate-45" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            {survey.status !== "ACTIVE" && (
              <DropdownMenuItem
                onClick={onActivate}
                className="gap-2 cursor-pointer text-primary focus:text-primary"
              >
                <Send className="size-4" />
                Activate
              </DropdownMenuItem>
            )}
            {survey.status === "ACTIVE" && (
              <DropdownMenuItem
                onClick={onClose}
                className="gap-2 cursor-pointer text-amber-600 focus:text-amber-700"
              >
                <Lock className="size-4" />
                Close
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
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
    </Card>
  );
}

// =========================================================
// Responses tab — analytics
// =========================================================

function ResponsesTab() {
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: surveysData } = useQuery({
    queryKey: ["surveys", "list"],
    queryFn: async () => {
      const r = await fetch("/api/surveys");
      return r.json();
    },
  });
  const surveys: Survey[] = surveysData?.items ?? [];

  // Listen for "view responses" events from the Surveys tab.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.surveyId) {
        setSelectedId(detail.surveyId);
      }
    }
    window.addEventListener("surveys:view-responses", handler);
    return () =>
      window.removeEventListener("surveys:view-responses", handler);
  }, []);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["survey", "detail", selectedId],
    queryFn: async () => {
      const r = await fetch(`/api/surveys/${selectedId}`);
      if (!r.ok) throw new Error("Failed to load survey");
      return r.json();
    },
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          Select survey:
        </Label>
        <Select
          value={selectedId || "NONE"}
          onValueChange={(v) => setSelectedId(v === "NONE" ? "" : v)}
        >
          <SelectTrigger className="md:max-w-md">
            <SelectValue placeholder="Choose a survey to view analytics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">— Select —</SelectItem>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title} ({s.responseCount} responses)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedId && (
        <EmptyState
          icon={BarChart3}
          title="No survey selected"
          description="Pick a survey above to see response analytics — rating averages, choice distribution, and text answers."
        />
      )}

      {selectedId && isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {selectedId && !isLoading && detail && (
        <ResponsesAnalytics detail={detail as SurveyDetail} />
      )}
    </div>
  );
}

function ResponsesAnalytics({ detail }: { detail: SurveyDetail }) {
  const responses = detail.responses ?? [];
  const isAnonymous = detail.anonymous === true;

  return (
    <div className="space-y-5">
      <Card className="p-5 gap-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{detail.title}</h3>
              <StatusBadge status={detail.status} />
              {isAnonymous && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary dark:text-primary/80 border-primary/20 gap-1"
                >
                  <ShieldCheck className="size-3" />
                  Anonymous
                </Badge>
              )}
            </div>
            {detail.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {detail.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">
                {responses.length}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Responses
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">
                {detail.questions.length}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Questions
              </div>
            </div>
          </div>
        </div>
        {isAnonymous && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-primary/10 border border-primary/20 p-3 text-xs text-foreground dark:text-muted-foreground">
            <ShieldCheck className="size-4 flex-shrink-0 mt-0.5" />
            <span>
              Responses are anonymous. Employee identities will not be stored or displayed.
            </span>
          </div>
        )}
      </Card>

      {responses.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No responses yet"
          description="Once employees submit responses, analytics will appear here."
        />
      )}

      {responses.length > 0 && (
        <div className="space-y-4">
          {detail.questions.map((q, idx) => (
            <QuestionAnalytics
              key={q.id}
              question={q}
              index={idx}
              responses={responses}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionAnalytics({
  question,
  index,
  responses,
}: {
  question: SurveyQuestion;
  index: number;
  responses: SurveyResponse[];
}) {
  const QIcon = Q_TYPE_ICON[question.type];

  // Collect answers for this question.
  const answers = responses
    .map((r) => r.answers?.find((a) => a.questionId === question.id)?.value)
    .filter((v) => v !== undefined && v !== null && v !== "");

  return (
    <Card className="p-5 gap-0">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
          Q{index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{question.text}</h4>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <QIcon className="size-3 mr-1" />
              {Q_TYPE_LABEL[question.type]}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {answers.length} of {responses.length} answered
          </div>
        </div>
      </div>

      {question.type === "RATING" && (
        <RatingAnalytics answers={answers as number[]} />
      )}
      {question.type === "SINGLE_CHOICE" && (
        <ChoiceAnalytics
          options={question.options ?? []}
          answers={(answers as string[]).map((a) => [String(a)])}
        />
      )}
      {question.type === "MULTIPLE_CHOICE" && (
        <ChoiceAnalytics
          options={question.options ?? []}
          answers={answers as string[][]}
        />
      )}
      {question.type === "TEXT" && (
        <TextAnalytics
          entries={responses
            .map((r) => {
              const a = r.answers?.find((aa) => aa.questionId === question.id);
              if (!a || a.value === undefined || a.value === null || a.value === "") return null;
              return {
                text: String(a.value),
                displayName: r.displayName ?? (r.employeeName ?? "—"),
                submittedAt: r.submittedAt,
              };
            })
            .filter((x): x is { text: string; displayName: string; submittedAt: string } => x !== null)}
        />
      )}
    </Card>
  );
}

function RatingAnalytics({ answers }: { answers: number[] }) {
  const valid = answers.filter((a) => typeof a === "number" && a >= 1 && a <= 5);
  const avg =
    valid.length > 0
      ? valid.reduce((s, a) => s + a, 0) / valid.length
      : 0;

  // Distribution: 1..5
  const dist = [1, 2, 3, 4, 5].map((n) => ({
    rating: `${n}★`,
    count: valid.filter((v) => v === n).length,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-5",
                n <= Math.round(avg)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          ))}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {avg.toFixed(1)}
        </div>
        <div className="text-sm text-muted-foreground">
          from {valid.length} response{valid.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dist}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="rating"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <RechartsTooltip
              cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChoiceAnalytics({
  options,
  answers,
}: {
  options: string[];
  answers: string[][];
}) {
  // Flatten answers (multiple_choice may have several per response).
  const flat = answers.flat();
  const data = options.map((opt, idx) => ({
    name: opt,
    shortLabel: opt.length > 16 ? opt.slice(0, 14) + "…" : opt,
    count: flat.filter((a) => a === opt).length,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="shortLabel"
              tick={{ fontSize: 12 }}
              width={120}
            />
            <RechartsTooltip
              cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="size-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate">{d.name}</span>
            </div>
            <span className="font-medium tabular-nums">
              {d.count} ({Math.round((d.count / Math.max(1, answers.length)) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextAnalytics({
  entries,
}: {
  entries: { text: string; displayName: string; submittedAt: string }[];
}) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No text responses.
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {entries.map((e, i) => (
        <div
          key={i}
          className="text-sm rounded-md border border-border/50 bg-muted/20 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              — {e.displayName}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {relativeTime(e.submittedAt)}
            </span>
          </div>
          <div>{e.text}</div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// Survey multi-step create dialog
// =========================================================

interface DraftQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
}

function newDraftQuestion(): DraftQuestion {
  return {
    id: `q_${Math.random().toString(36).slice(2, 10)}`,
    text: "",
    type: "TEXT",
    options: [],
  };
}

function SurveyFormDialog({
  open,
  onOpenChange,
  survey,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  survey: Survey | null;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!survey;

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    newDraftQuestion(),
  ]);
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description ?? "");
      setAnonymous(survey.anonymous === true);
      setQuestions(
        survey.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options ?? [],
        }))
      );
      setStep(1);
      setPublish(survey.status === "ACTIVE");
    } else {
      setTitle("");
      setDescription("");
      setAnonymous(false);
      setQuestions([newDraftQuestion()]);
      setStep(1);
      setPublish(false);
    }
  }, [survey, open]);

  function addQuestion() {
    setQuestions((qs) => [...qs, newDraftQuestion()]);
  }
  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }
  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }
  function addOption(qid: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, ""] } : q
      )
    );
  }
  function updateOption(qid: string, idx: number, val: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) }
          : q
      )
    );
  }
  function removeOption(qid: string, idx: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.filter((_, i) => i !== idx) }
          : q
      )
    );
  }

  const step1Valid = title.trim().length > 0;
  const step2Valid =
    questions.length > 0 &&
    questions.every(
      (q) =>
        q.text.trim().length > 0 &&
        ((q.type !== "SINGLE_CHOICE" && q.type !== "MULTIPLE_CHOICE") ||
          (q.options.length >= 2 && q.options.every((o) => o.trim().length > 0)))
    );

  async function handleSave(finalPublish: boolean) {
    if (!step1Valid || !step2Valid) {
      toast.error("Please complete the title and all questions.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        anonymous,
        status: finalPublish ? "ACTIVE" : isEdit ? undefined : "DRAFT",
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text.trim(),
          type: q.type,
          options:
            q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE"
              ? q.options.map((o) => o.trim())
              : undefined,
        })),
      };
      const url = isEdit ? `/api/surveys/${survey!.id}` : "/api/surveys";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save survey");
      }
      toast.success(
        isEdit
          ? "Survey updated."
          : finalPublish
            ? "Survey published — employees can now respond."
            : "Survey saved as draft."
      );
      onSaved();
      qc.invalidateQueries({ queryKey: ["surveys"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save survey.");
    } finally {
      setSaving(false);
    }
  }

  const stepLabels = ["Details", "Questions", "Review"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Survey" : "Create Survey"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update survey details and questions."
              : "Build a multi-question survey to collect employee feedback."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary dark:text-primary/80"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle2 className="size-4" /> : n}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className="flex-1 h-px bg-border/60 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Survey Title *</Label>
              <Input
                placeholder="e.g. Q3 Employee Engagement Survey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Briefly describe the purpose of this survey…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex-shrink-0 pt-0.5">
                <Switch
                  checked={anonymous}
                  onCheckedChange={setAnonymous}
                  aria-label="Anonymous responses"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-primary" />
                  Anonymous responses
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, employee identities will not be stored with
                  responses. All answers will appear as &ldquo;Anonymous&rdquo;
                  in analytics and cannot be traced back to a person.
                </p>
              </div>
            </div>
            {anonymous && (
              <div className="flex items-start gap-2 rounded-md bg-primary/10 border border-primary/20 p-2.5 text-xs text-foreground dark:text-muted-foreground">
                <Info className="size-4 flex-shrink-0 mt-0.5" />
                <span>
                  Responses are anonymous. Employee identities will not be stored.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-4 gap-0 border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Question {idx + 1}
                  </div>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Question Text *</Label>
                    <Input
                      placeholder="e.g. How satisfied are you with your role?"
                      value={q.text}
                      onChange={(e) =>
                        updateQuestion(q.id, { text: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(q.id, { type: v as QuestionType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Q_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {Q_TYPE_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(q.type === "SINGLE_CHOICE" ||
                  q.type === "MULTIPLE_CHOICE") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options (min 2)</Label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateOption(q.id, oi, e.target.value)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-rose-600 hover:text-rose-700"
                          onClick={() => removeOption(q.id, oi)}
                          disabled={q.options.length <= 2}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(q.id)}
                      className="gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Add option
                    </Button>
                  </div>
                )}
                {q.type === "RATING" && (
                  <div className="text-xs text-muted-foreground italic bg-muted/30 rounded-md p-2">
                    Employees will rate on a 1–5 star scale.
                  </div>
                )}
                {q.type === "TEXT" && (
                  <div className="text-xs text-muted-foreground italic bg-muted/30 rounded-md p-2">
                    Employees will type a free-text answer.
                  </div>
                )}
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addQuestion}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Add Question
            </Button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <Card className="p-4 gap-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Title
              </div>
              <div className="font-semibold text-base mt-0.5">
                {title || "—"}
              </div>
              {description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {description}
                </div>
              )}
            </Card>
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <Card key={q.id} className="p-3 gap-0 border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Q{idx + 1} · {Q_TYPE_LABEL[q.type]}
                      </div>
                      <div className="font-medium text-sm mt-0.5">
                        {q.text || "—"}
                      </div>
                      {(q.type === "SINGLE_CHOICE" ||
                        q.type === "MULTIPLE_CHOICE") && (
                        <ul className="text-xs text-muted-foreground mt-1 ml-4 list-disc">
                          {q.options.map((o, i) => (
                            <li key={i}>{o || "—"}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>
                Publish immediately
                <span className="text-muted-foreground ml-1">
                  (otherwise saved as draft)
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
              }
              className="gap-1.5 ml-auto"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={() => handleSave(publish)}
              disabled={saving}
              className="gap-1.5 ml-auto"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit
                ? "Save Changes"
                : publish
                  ? "Publish Survey"
                  : "Save as Draft"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
