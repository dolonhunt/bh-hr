"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Sun,
  Sparkles,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";

// =========================================================
// Company Holidays — Settings tab
// =========================================================

type HolidayType = "PUBLIC" | "OPTIONAL" | "COMPANY";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  description: string | null;
}

const TYPE_META: Record<HolidayType, { label: string; cls: string }> = {
  PUBLIC: {
    label: "Public",
    cls: "bg-primary/10 text-primary border-primary/20",
  },
  OPTIONAL: {
    label: "Optional",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  COMPANY: {
    label: "Company",
    cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function HolidaysTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<HolidayType>("PUBLIC");
  const [description, setDescription] = useState("");

  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1];

  const { data, isLoading } = useQuery({
    queryKey: ["holidays", year],
    queryFn: async () => {
      const r = await fetch(`/api/holidays?year=${year}`);
      if (!r.ok) throw new Error("Failed to load holidays");
      return r.json();
    },
  });

  const holidays: Holiday[] = useMemo(() => {
    const items: Holiday[] = data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  const upcomingCount = holidays.filter(
    (h) => new Date(h.date).getTime() >= now.getTime()
  ).length;
  const byType = (t: HolidayType) => holidays.filter((h) => h.type === t).length;

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    for (const h of holidays) {
      const m = new Date(h.date).getMonth();
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(h);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [holidays]);

  async function handleAdd() {
    if (!name.trim() || !date) {
      toast.error("Holiday name and date are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, type, description: description || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add holiday");
      toast.success(`Holiday "${name}" added.`);
      setName("");
      setDate("");
      setType("PUBLIC");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["holidays"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add holiday");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, holidayName: string) {
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Removed "${holidayName}".`);
      qc.invalidateQueries({ queryKey: ["holidays"] });
    } catch {
      toast.error("Failed to delete holiday");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header row: year select + stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-36">
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="size-4 text-primary" />
              {holidays.length} total
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarRange className="size-4 text-amber-600" />
              {upcomingCount} remaining
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["PUBLIC", "OPTIONAL", "COMPANY"] as HolidayType[]).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className={cn("text-[10px]", TYPE_META[t].cls)}
            >
              {TYPE_META[t].label}: {byType(t)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Add form */}
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Plus className="size-4" />
          </div>
          <h3 className="font-semibold">Add Holiday</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="holiday-name">Name *</Label>
            <Input
              id="holiday-name"
              placeholder="e.g. Independence Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holiday-date">Date *</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as HolidayType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="OPTIONAL">Optional</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Plus className="size-4 mr-1.5" /> Add Holiday
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Holiday list grouped by month */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <Card className="p-10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Sun className="size-6" />
            </div>
            <h3 className="font-semibold mb-1">No holidays for {year}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add public and company holidays so they appear on the dashboard
              and can be excluded from working days.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-3.5 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {MONTHS[month]} {year}
                </h4>
              </div>
              <div className="space-y-2">
                {items.map((h) => {
                  const isPast = new Date(h.date).getTime() < now.getTime();
                  return (
                    <div
                      key={h.id}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-all hover:shadow-card-hover",
                        isPast && "opacity-60"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border",
                          h.type === "PUBLIC"
                            ? "bg-primary/10 border-primary/20"
                            : h.type === "OPTIONAL"
                              ? "bg-amber-500/10 border-amber-500/20"
                              : "bg-sky-500/10 border-sky-500/20"
                        )}
                      >
                        <span className="text-sm font-bold leading-none">
                          {new Date(h.date).getDate()}
                        </span>
                        <span className="text-[9px] uppercase text-muted-foreground leading-none mt-0.5">
                          {MONTHS[new Date(h.date).getMonth()].slice(0, 3)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{h.name}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-4.5", TYPE_META[h.type].cls)}
                          >
                            {TYPE_META[h.type].label}
                          </Badge>
                          {new Date(h.date).getDay() === 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4.5 bg-muted text-muted-foreground border-border"
                            >
                              Sunday
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(h.date, "long")}
                          {h.description ? ` · ${h.description}` : ""}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                        onClick={() => handleDelete(h.id, h.name)}
                        aria-label={`Delete ${h.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
