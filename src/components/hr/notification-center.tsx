"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CalendarClock,
  FileCheck,
  Cake,
  AlertTriangle,
  Wallet,
  CalendarX,
  Info,
  CheckCheck,
  Settings2,
  Loader2,
  Inbox,
  RotateCcw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, relativeTime } from "@/lib/utils";
import { useApp, type ModuleKey } from "@/lib/store";

// ----- Types -----

type NotificationType =
  | "LEAVE_PENDING"
  | "DOCUMENT_PENDING_APPROVAL"
  | "BIRTHDAY_UPCOMING"
  | "TASK_OVERDUE"
  | "PAYROLL_PENDING"
  | "ATTENDANCE_ANOMALY"
  | "SYSTEM";

type Severity = "info" | "warning" | "urgent";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

interface PreferencesResponse {
  types: Record<NotificationType, boolean>;
}

// ----- Static type metadata -----

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; label: string; description: string }
> = {
  LEAVE_PENDING: {
    icon: CalendarClock,
    label: "Leave requests",
    description: "Pending leave applications awaiting approval",
  },
  DOCUMENT_PENDING_APPROVAL: {
    icon: FileCheck,
    label: "Document approvals",
    description: "Documents waiting for your sign-off",
  },
  BIRTHDAY_UPCOMING: {
    icon: Cake,
    label: "Birthdays",
    description: "Employee birthdays in the next 7 days",
  },
  TASK_OVERDUE: {
    icon: AlertTriangle,
    label: "Overdue tasks",
    description: "Onboarding tasks past their due date",
  },
  PAYROLL_PENDING: {
    icon: Wallet,
    label: "Draft payrolls",
    description: "Payroll records still in DRAFT status",
  },
  ATTENDANCE_ANOMALY: {
    icon: CalendarX,
    label: "Attendance anomalies",
    description: "Unusual attendance patterns or absences",
  },
  SYSTEM: {
    icon: Info,
    label: "System",
    description: "Platform-wide announcements",
  },
};

const SEVERITY_STYLE: Record<
  Severity,
  { dot: string; ring: string; bg: string; text: string }
> = {
  info: {
    dot: "bg-sky-500",
    ring: "ring-sky-500/20",
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  urgent: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/20",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
  },
};

const ALL_TYPES = Object.keys(TYPE_META) as NotificationType[];

// ----- Component -----

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({
  open,
  onOpenChange,
}: NotificationCenterProps) {
  const setModule = useApp((s) => s.setModule);
  const openEmployee = useApp((s) => s.openEmployee);
  const setDocumentsTab = useApp((s) => s.setDocumentsTab);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "mentions">("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // ----- Fetch notifications -----
  const queryKey = useMemo(
    () => ["notifications", filter] as const,
    [filter]
  );

  const { data, isLoading, isFetching, refetch } = useQuery<NotificationResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unreadOnly", "true");
      const r = await fetch(`/api/notifications?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load notifications");
      return r.json();
    },
    enabled: open,
    staleTime: 15_000,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // ----- Mark one as read -----
  async function markRead(id: string) {
    setMarkingId(id);
    try {
      const r = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (!r.ok) throw new Error("Failed to mark as read");
      // Optimistic: invalidate immediately so the badge updates.
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark as read");
    } finally {
      setMarkingId(null);
    }
  }

  // ----- Mark all as read -----
  async function markAllRead() {
    try {
      const r = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!r.ok) throw new Error("Failed to mark all as read");
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark all as read");
    }
  }

  // ----- Click handler — navigate based on link -----
  function handleClick(n: NotificationItem) {
    if (!n.read) markRead(n.id);
    onOpenChange(false);
    if (!n.link) return;
    try {
      const url = new URL(n.link, window.location.origin);
      const moduleKey = url.searchParams.get("module") as ModuleKey | null;
      const employee = url.searchParams.get("employee");
      const tab = url.searchParams.get("tab");
      if (employee) {
        openEmployee(employee);
        return;
      }
      if (moduleKey) {
        setModule(moduleKey);
      }
      if (tab === "approval-queue") {
        setDocumentsTab("approval-queue");
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border gap-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-primary" />
                  Notifications
                </SheetTitle>
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary text-[10px]"
                  >
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setPrefsOpen(true)}
                  aria-label="Notification preferences"
                >
                  <Settings2 className="size-4" />
                  <span className="hidden sm:inline ml-1">Preferences</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="size-4" />
                  <span className="hidden sm:inline ml-1">Mark all read</span>
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">
              Recent HR activity and pending items
            </SheetDescription>

            {/* Filter tabs */}
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
              className="mt-3"
            >
              <TabsList className="h-8 w-full">
                <TabsTrigger value="all" className="text-xs h-7">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs h-7">
                  Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </TabsTrigger>
                <TabsTrigger value="mentions" className="text-xs h-7">
                  Mentions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </SheetHeader>

          {/* List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 sm:p-3">
              {isLoading ? (
                <LoadingState />
              ) : items.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                <ul className="space-y-1">
                  <AnimatePresence initial={false}>
                    {items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        onClick={() => handleClick(n)}
                        onMarkRead={() => markRead(n.id)}
                        marking={markingId === n.id}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {data?.total ?? 0} total · {unreadCount} unread
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}

// ----- Notification Row -----

function NotificationRow({
  n,
  onClick,
  onMarkRead,
  marking,
}: {
  n: NotificationItem;
  onClick: () => void;
  onMarkRead: () => void;
  marking: boolean;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
  const Icon = meta.icon;
  const sev = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
    >
      <button
        onClick={onClick}
        className={cn(
          "group w-full text-left flex items-start gap-3 rounded-xl border p-3 transition-all",
          "hover:shadow-sm hover:bg-muted/40",
          n.read
            ? "border-border/50 bg-transparent"
            : "border-border bg-card"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "relative flex-shrink-0 size-9 rounded-lg flex items-center justify-center",
            sev.bg,
            sev.text
          )}
        >
          <Icon className="size-4" />
          {!n.read && (
            <span
              className={cn(
                "absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-background",
                sev.dot
              )}
              aria-label="Unread"
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium leading-snug line-clamp-2">
              {n.title}
            </div>
            {!n.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                disabled={marking}
                aria-label="Mark as read"
                className={cn(
                  "flex-shrink-0 size-6 rounded-md flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-muted text-muted-foreground hover:text-foreground",
                  marking && "opacity-100 animate-pulse"
                )}
              >
                {marking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {n.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 border-0 leading-none",
                sev.bg,
                sev.text
              )}
            >
              {meta.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {relativeTime(n.createdAt)}
            </span>
          </div>
        </div>
      </button>
    </motion.li>
  );
}

// ----- Empty State -----

function EmptyState({ filter }: { filter: "all" | "unread" | "mentions" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
        <Inbox className="size-6" />
      </div>
      <p className="text-sm font-medium">
        {filter === "unread"
          ? "No unread notifications"
          : filter === "mentions"
            ? "No mentions yet"
            : "You're all caught up!"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {filter === "mentions"
          ? "You'll see @mentions here when colleagues tag you in a comment or task."
          : "New HR activity — pending leaves, document approvals, birthdays, and overdue tasks — will appear here."}
      </p>
    </div>
  );
}

// ----- Loading State -----

function LoadingState() {
  return (
    <ul className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border/50 p-3"
        >
          <div className="size-9 rounded-lg bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-full bg-muted rounded animate-pulse" />
            <div className="h-2 w-1/3 bg-muted rounded animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ----- Preferences Dialog -----

function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<PreferencesResponse>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const r = await fetch("/api/notifications/preferences");
      if (!r.ok) throw new Error("Failed to load preferences");
      return r.json();
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Local state mirrors server so users can toggle multiple before saving.
  const [local, setLocal] = useState<Record<NotificationType, boolean> | null>(
    null
  );

  // Sync local state when server data arrives.
  // Using the React-documented "adjust state during render" pattern
  // avoids the react-hooks/set-state-in-effect lint rule.
  const serverTypes = data?.types;
  const [syncedSig, setSyncedSig] = useState<string | null>(null);
  if (serverTypes && JSON.stringify(serverTypes) !== syncedSig) {
    setSyncedSig(JSON.stringify(serverTypes));
    setLocal({ ...serverTypes });
  }

  function toggle(t: NotificationType) {
    setLocal((prev) => {
      if (!prev) return prev;
      return { ...prev, [t]: !prev[t] };
    });
  }

  function enableAll() {
    setLocal(
      ALL_TYPES.reduce(
        (acc, t) => {
          acc[t] = true;
          return acc;
        },
        {} as Record<NotificationType, boolean>
      )
    );
  }

  function disableAll() {
    setLocal(
      ALL_TYPES.reduce(
        (acc, t) => {
          acc[t] = false;
          return acc;
        },
        {} as Record<NotificationType, boolean>
      )
    );
  }

  async function save() {
    if (!local) return;
    setSaving(true);
    try {
      const r = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: local }),
      });
      if (!r.ok) throw new Error("Failed to save preferences");
      await qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification preferences saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
          <DialogDescription>
            Choose which types of HR events should appear in your notification
            feed. Disabled types are hidden entirely.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !local ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-end gap-2 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={enableAll}
              >
                Enable all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={disableAll}
              >
                Disable all
              </Button>
            </div>
            <ul className="space-y-1.5">
              {ALL_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                const enabled = !!local[t];
                return (
                  <li
                    key={t}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      enabled
                        ? "border-border bg-card"
                        : "border-border/50 bg-muted/30 opacity-70"
                    )}
                  >
                    <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        {meta.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {meta.description}
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggle(t)}
                      aria-label={`Toggle ${meta.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
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
              "Save preferences"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
