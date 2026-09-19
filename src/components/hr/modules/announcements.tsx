"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Search,
  Pencil,
  Trash2,
  Pin,
  AlertTriangle,
  Info,
  ChevronUp,
  Building2,
  Users,
  CalendarDays,
  Loader2,
  Download,
  Mail,
  MailCheck,
  MailX,
  MessageSquare,
  Smartphone,
  Send,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";
import { KpiCard } from "../shared/kpi-card";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate, relativeTime } from "@/lib/utils";
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

// =========================================================
// Types & constants
// =========================================================

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  audience: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  pinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

const PRIORITY_META: Record<
  Priority,
  { label: string; badge: string; dot: string }
> = {
  LOW: {
    label: "Low",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-slate-400",
  },
  NORMAL: {
    label: "Normal",
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  HIGH: {
    label: "High",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  URGENT: {
    label: "Urgent",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

// =========================================================
// Data hooks
// =========================================================

function useAnnouncements(filters: {
  includeExpired?: boolean;
  priority?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["announcements", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.includeExpired) params.set("includeExpired", "true");
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search) params.set("search", filters.search);
      const r = await fetch(`/api/announcements?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load announcements");
      return r.json();
    },
  });
}

function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const r = await fetch("/api/departments");
      if (!r.ok) throw new Error("Failed to load departments");
      return r.json();
    },
  });
}

// =========================================================
// Module
// =========================================================

export function AnnouncementsModule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "urgent" | "pinned" | "expired">("all");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  // ----- Comms blast (announcement → employees via email / SMS / WhatsApp) -----
  const [blasting, setBlasting] = useState<Announcement | null>(null);
  const [blastChannel, setBlastChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">(
    "EMAIL"
  );
  const [blastRunning, setBlastRunning] = useState(false);
  const [blastResult, setBlastResult] = useState<{
    mode: "smtp" | "simulated" | "gateway";
    channel: "EMAIL" | "SMS" | "WHATSAPP";
    recipients: number;
    noPhone?: number;
    sent: number;
    failed: number;
    failures: { employeeName: string; recipientTo?: string; error?: string }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Delivery modes from the shared settings cache (email SMTP vs simulated,
  // SMS gateway vs simulated) — surfaced honestly inside the blast dialog.
  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    enabled: !!blasting,
    staleTime: 120_000,
  });
  const emailMode = settingsQ.data?.emailMode?.mode ?? "simulated";
  const smsMode = settingsQ.data?.smsMode?.mode ?? "simulated";

  const includeExpired = tab === "expired";

  const { data, isLoading, isError } = useAnnouncements({
    includeExpired: true,
    search,
  });

  const departmentsQ = useDepartments();
  const departments = departmentsQ.data?.items ?? [];

  const all: Announcement[] = data?.items ?? [];
  const active = all.filter(
    (a) => !a.expiresAt || new Date(a.expiresAt).getTime() >= Date.now()
  );
  const expired = all.filter(
    (a) => a.expiresAt && new Date(a.expiresAt).getTime() < Date.now()
  );

  const visible =
    tab === "expired"
      ? expired
      : tab === "urgent"
        ? active.filter((a) => a.priority === "URGENT" || a.priority === "HIGH")
        : tab === "pinned"
          ? active.filter((a) => a.pinned)
          : active;

  const urgentCount = active.filter(
    (a) => a.priority === "URGENT" || a.priority === "HIGH"
  ).length;
  const pinnedCount = active.filter((a) => a.pinned).length;
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).getTime();
  const thisMonth = active.filter(
    (a) => new Date(a.publishedAt).getTime() >= monthStart
  ).length;

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [departmentId, setDepartmentId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  function openCreate() {
    setEditing(null);
    setTitle("");
    setBody("");
    setPriority("NORMAL");
    setDepartmentId("");
    setPinned(false);
    setExpiresAt("");
    setFormOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setTitle(a.title);
    setBody(a.body);
    setPriority(a.priority);
    setDepartmentId(a.departmentId || "");
    setPinned(a.pinned);
    setExpiresAt(
      a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 10) : ""
    );
    setFormOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        body,
        priority,
        departmentId: departmentId || null,
        pinned,
        expiresAt: expiresAt || null,
      };
      const res = editing
        ? await fetch(`/api/announcements/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(editing ? "Announcement updated." : "Announcement published.");
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/announcements/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Announcement deleted.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  async function runBlast() {
    if (!blasting) return;
    setBlastRunning(true);
    setBlastResult(null);
    try {
      const isEmail = blastChannel === "EMAIL";
      const res = await fetch(
        isEmail
          ? `/api/announcements/${blasting.id}/email-blast`
          : `/api/announcements/${blasting.id}/sms-blast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEmail ? {} : { channel: blastChannel }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Send failed");
      setBlastResult({
        mode: data.mode,
        channel: blastChannel,
        recipients: data.recipients,
        noPhone: data.noPhone,
        sent: data.sent,
        failed: data.failed,
        failures: (data.results ?? [])
          .filter((r: any) => !r.ok)
          .map((r: any) => ({
            employeeName: r.employeeName,
            recipientTo: r.recipientTo,
            error: r.error,
          })),
      });
      if (isEmail) {
        toast.success(
          data.mode === "smtp"
            ? `Announcement delivered to ${data.sent} recipient(s), ${data.failed} failed.`
            : `Announcement emails logged (simulated) for ${data.sent} recipient(s).`
        );
        qc.invalidateQueries({ queryKey: ["email-logs"] });
      } else {
        toast.success(
          data.mode === "gateway"
            ? `Announcement ${blastChannel === "WHATSAPP" ? "WhatsApp" : "SMS"} delivered to ${data.sent} recipient(s), ${data.failed} failed.`
            : `Announcement ${blastChannel === "WHATSAPP" ? "WhatsApp" : "SMS"} logged (simulated) for ${data.sent} recipient(s).`
        );
        qc.invalidateQueries({ queryKey: ["message-logs"] });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBlastRunning(false);
    }
  }

  async function togglePin(a: Announcement) {
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.pinned }),
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(a.pinned ? "Unpinned." : "Pinned to top.");
    } catch {
      toast.error("Failed to update pin");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Company notice board — keep everyone informed"
        icon={<Megaphone className="size-5" />}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4 mr-1.5" />
            <span className="hidden sm:inline">New Announcement</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active"
          value={active.length}
          icon={Megaphone}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">Visible to staff</span>}
        />
        <KpiCard
          label="Urgent / High"
          value={urgentCount}
          icon={AlertTriangle}
          iconClass="bg-rose-500/10 text-rose-600"
          footer={<span className="text-muted-foreground">Needs attention</span>}
        />
        <KpiCard
          label="Pinned"
          value={pinnedCount}
          icon={Pin}
          iconClass="bg-amber-500/10 text-amber-600"
          footer={<span className="text-muted-foreground">Top of the board</span>}
        />
        <KpiCard
          label="This Month"
          value={thisMonth}
          icon={CalendarDays}
          iconClass="bg-sky-500/10 text-sky-600"
          footer={<span className="text-muted-foreground">Published recently</span>}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1 w-fit">
            {(
              [
                ["all", "All"],
                ["urgent", "Urgent"],
                ["pinned", "Pinned"],
                ["expired", "Expired"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                  tab === k
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState
            icon={Megaphone}
            title="Failed to load announcements"
            description="Something went wrong. Please try again."
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Megaphone className="size-6" />
            </div>
            <h3 className="font-semibold mb-1">
              {tab === "expired" ? "No expired announcements" : "No announcements yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Share company news, policy updates, and events with your team.
            </p>
            {tab !== "expired" && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4 mr-1.5" /> New Announcement
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {
            const meta = PRIORITY_META[a.priority];
            const isExpired =
              a.expiresAt && new Date(a.expiresAt).getTime() < Date.now();
            return (
              <Card
                key={a.id}
                className={cn(
                  "group p-4 md:p-5 transition-all hover:shadow-card-hover",
                  a.pinned && "border-amber-500/30",
                  isExpired && "opacity-70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      a.priority === "URGENT"
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : a.priority === "HIGH"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-primary/10 text-primary border-primary/20"
                    )}
                  >
                    {a.priority === "URGENT" ? (
                      <AlertTriangle className="size-5" />
                    ) : a.priority === "LOW" ? (
                      <Info className="size-5" />
                    ) : (
                      <Megaphone className="size-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold leading-snug">{a.title}</h3>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-4.5", meta.badge)}
                      >
                        {meta.label}
                      </Badge>
                      {a.pinned && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        >
                          <Pin className="size-2.5 mr-0.5" /> Pinned
                        </Badge>
                      )}
                      {a.department && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-muted text-muted-foreground border-border"
                        >
                          <Building2 className="size-2.5 mr-0.5" />
                          {a.department.name}
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-muted text-muted-foreground border-border"
                        >
                          Expired
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                      {a.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                      <span>Published {relativeTime(a.publishedAt)}</span>
                      {a.expiresAt && (
                        <>
                          <span>·</span>
                          <span>Expires {formatDate(a.expiresAt)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => {
                        setBlastResult(null);
                        setBlastChannel("EMAIL");
                        setBlasting(a);
                      }}
                      aria-label={`Email this announcement to ${a.audience === "DEPARTMENT" && a.department ? a.department.name : "all employees"}`}
                      title={`Email to ${a.audience === "DEPARTMENT" && a.department ? a.department.name : "all employees"}`}
                    >
                      <Mail className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => {
                        setBlastResult(null);
                        setBlastChannel("SMS");
                        setBlasting(a);
                      }}
                      aria-label={`Send SMS or WhatsApp for this announcement`}
                      title={`SMS / WhatsApp to employees with a phone on file`}
                    >
                      <MessageSquare className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => togglePin(a)}
                      aria-label={a.pinned ? "Unpin" : "Pin to top"}
                    >
                      <Pin
                        className={cn(
                          "size-4",
                          a.pinned && "text-amber-600 fill-amber-500/30"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => openEdit(a)}
                      aria-label="Edit announcement"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => setDeleting(a)}
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Compose / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the notice details."
                : "Publish a notice to the company board."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                placeholder="e.g. Office closed for Eid holidays"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-body">Message *</Label>
              <Textarea
                id="ann-body"
                placeholder="Write the announcement details…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-28"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Department</Label>
                <Select
                  value={departmentId || "ALL"}
                  onValueChange={(v) => setDepartmentId(v === "ALL" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" /> All staff
                      </span>
                    </SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="ann-expiry">Expires on (optional)</Label>
                <Input
                  id="ann-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Pin className="size-4 text-amber-600" />
                  <Label htmlFor="ann-pin" className="cursor-pointer text-sm">
                    Pin to top
                  </Label>
                </div>
                <Switch
                  id="ann-pin"
                  checked={pinned}
                  onCheckedChange={setPinned}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Saving…
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                "Publish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              "{deleting?.title}" will be removed from the notice board. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comms blast dialog (Email / SMS / WhatsApp) */}
      <Dialog
        open={!!blasting}
        onOpenChange={(o) => {
          if (!o) {
            setBlasting(null);
            setTimeout(() => setBlastResult(null), 200);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {blastChannel === "EMAIL" ? (
                <Mail className="size-5 text-primary" />
              ) : blastChannel === "WHATSAPP" ? (
                <MessageSquare className="size-5 text-emerald-600" />
              ) : (
                <Smartphone className="size-5 text-primary" />
              )}
              Send Announcement
            </DialogTitle>
            <DialogDescription>
              Sends "{blasting?.title}" to every active employee
              {blasting?.audience === "DEPARTMENT" && blasting?.department
                ? ` in ${blasting.department.name}`
                : " (company-wide)"}{" "}
              with{" "}
              {blastChannel === "EMAIL"
                ? "an email address on file"
                : "a phone number on file"}
              . Each send is recorded in{" "}
              {blastChannel === "EMAIL"
                ? "the Email History"
                : "the Messages history"}
              .
            </DialogDescription>
          </DialogHeader>

          {!blastResult ? (
            <>
              {/* Channel picker */}
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted/60 p-1">
                {(
                  [
                    ["EMAIL", "Email", Mail],
                    ["SMS", "SMS", Smartphone],
                    ["WHATSAPP", "WhatsApp", MessageSquare],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setBlastChannel(key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all cursor-pointer",
                      blastChannel === key
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              {/* Channel-specific delivery mode + copy */}
              {blastChannel === "EMAIL" ? (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 mb-1 font-medium">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        emailMode === "smtp"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {emailMode === "smtp" ? "Live SMTP" : "Simulated"}
                    </span>
                    one email per recipient
                  </div>
                  Real delivery requires SMTP credentials in Settings → Email
                  Settings; otherwise the sends are recorded as simulated.
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 mb-1 font-medium">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        smsMode === "gateway"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {smsMode === "gateway" ? "Live gateway" : "Simulated"}
                    </span>
                    {blastChannel === "WHATSAPP"
                      ? "full message text"
                      : "SMS is capped at ~480 characters"}
                  </div>
                  Phone numbers are normalized to +880 format. Real delivery
                  requires an SMS gateway in Settings → SMS & WhatsApp;
                  otherwise the sends are recorded as simulated.
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBlasting(null);
                    setTimeout(() => setBlastResult(null), 200);
                  }}
                  disabled={blastRunning}
                >
                  Cancel
                </Button>
                <Button onClick={runBlast} disabled={blastRunning}>
                  {blastRunning ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Send now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  {blastResult.channel === "EMAIL" ? (
                    <MailCheck className="size-4 text-primary" />
                  ) : (
                    <MessageSquare className="size-4 text-primary" />
                  )}
                  {blastResult.mode === "simulated"
                    ? "Logged (simulated)"
                    : "Delivered"}
                  :{" "}
                  <span className="text-primary font-semibold">
                    {blastResult.sent}
                  </span>
                </span>
                {blastResult.failed > 0 && (
                  <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                    <MailX className="size-4" />
                    Failed: {blastResult.failed}
                  </span>
                )}
                <span className="text-muted-foreground">
                  of {blastResult.recipients} recipient(s)
                </span>
                {blastResult.noPhone ? (
                  <span className="text-muted-foreground">
                    · {blastResult.noPhone} employee(s) had no usable phone
                    number
                  </span>
                ) : null}
              </div>
              {blastResult.failures.length > 0 && (
                <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-3.5 py-2.5 text-xs space-y-1 max-h-40 overflow-y-auto">
                  {blastResult.failures.map((f, i) => (
                    <div key={i} className="min-w-0">
                      <span className="font-medium text-foreground">{f.employeeName}</span>
                      <span
                        className="text-rose-600 dark:text-rose-400 truncate max-w-full inline-block cursor-help"
                        title={f.error}
                      >
                        {" "}
                        — {f.error}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button
                  onClick={() => {
                    setBlasting(null);
                    setTimeout(() => setBlastResult(null), 200);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
