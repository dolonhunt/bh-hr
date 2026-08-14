"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  PackageCheck,
  PackageOpen,
  AlertTriangle,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Keyboard,
  Mouse,
  Headset,
  LampDesk,
  Armchair,
  Printer,
  Camera,
  Box,
  LayoutGrid,
  List,
  UserPlus,
  Undo2,
  Loader2,
  ChevronDown,
  ChevronsUpDown,
  Check,
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

const ASSET_TYPES = [
  { value: "LAPTOP", label: "Laptop", icon: Laptop, color: "text-sky-600 bg-sky-500/10" },
  { value: "MONITOR", label: "Monitor", icon: Monitor, color: "text-violet-600 bg-violet-500/10" },
  { value: "PHONE", label: "Phone", icon: Smartphone, color: "text-emerald-600 bg-emerald-500/10" },
  { value: "TABLET", label: "Tablet", icon: Tablet, color: "text-amber-600 bg-amber-500/10" },
  { value: "KEYBOARD", label: "Keyboard", icon: Keyboard, color: "text-teal-600 bg-teal-500/10" },
  { value: "MOUSE", label: "Mouse", icon: Mouse, color: "text-fuchsia-600 bg-fuchsia-500/10" },
  { value: "HEADSET", label: "Headset", icon: Headset, color: "text-rose-600 bg-rose-500/10" },
  { value: "DESK", label: "Desk", icon: LampDesk, color: "text-orange-600 bg-orange-500/10" },
  { value: "CHAIR", label: "Chair", icon: Armchair, color: "text-lime-600 bg-lime-500/10" },
  { value: "PRINTER", label: "Printer", icon: Printer, color: "text-cyan-600 bg-cyan-500/10" },
  { value: "CAMERA", label: "Camera", icon: Camera, color: "text-pink-600 bg-pink-500/10" },
  { value: "OTHER", label: "Other", icon: Box, color: "text-muted-foreground bg-muted" },
] as const;

const CONDITIONS = ["NEW", "GOOD", "FAIR", "DAMAGED"] as const;
const STATUSES = ["AVAILABLE", "ASSIGNED", "RETURNED", "RETIRED"] as const;

type AssetType = (typeof ASSET_TYPES)[number]["value"];
type AssetCondition = (typeof CONDITIONS)[number];
type AssetStatus = (typeof STATUSES)[number];

const CONDITION_COLOR: Record<AssetCondition, string> = {
  NEW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  GOOD: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  FAIR: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  DAMAGED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const STATUS_COLOR: Record<AssetStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  ASSIGNED: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  RETURNED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  RETIRED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

function getTypeMeta(t: string) {
  return (
    ASSET_TYPES.find((x) => x.value === t) ?? ASSET_TYPES[ASSET_TYPES.length - 1]
  );
}

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  serialNumber: string;
  condition: AssetCondition;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDate: string | null;
  returnDate: string | null;
  expectedReturnDate: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
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

export function AssetsModule() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");

  const [formOpen, setFormOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [returnAsset, setReturnAsset] = useState<Asset | null>(null);

  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assets", search, type, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      const r = await fetch(`/api/assets?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load assets");
      return r.json();
    },
  });

  const assets: Asset[] = data?.items ?? [];
  const total = assets.length;
  const assigned = assets.filter((a) => a.status === "ASSIGNED").length;
  const available = assets.filter((a) => a.status === "AVAILABLE").length;
  const damaged = assets.filter((a) => a.condition === "DAMAGED").length;

  function openCreate() {
    setEditAsset(null);
    setFormOpen(true);
  }
  function openEdit(a: Asset) {
    setEditAsset(a);
    setFormOpen(true);
  }
  async function deleteAsset(a: Asset) {
    if (!confirm(`Permanently delete asset "${a.name}"?`)) return;
    try {
      const r = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete asset");
      toast.success(`Asset "${a.name}" deleted.`);
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete asset.");
    }
  }
  async function retireAsset(a: Asset) {
    if (!confirm(`Retire asset "${a.name}"? It will be marked RETIRED.`))
      return;
    try {
      const r = await fetch(`/api/assets/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RETIRED" }),
      });
      if (!r.ok) throw new Error("Failed to retire asset");
      toast.success(`Asset "${a.name}" retired.`);
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to retire asset.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Management"
        description="Track company assets and equipment assignments"
        icon={<Package className="size-5" />}
        actions={
          <>
            <ExportButton
              module="assets"
              filters={{ search, status, type }}
            />
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setView("table")}
                aria-label="Table view"
              >
                <List className="size-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Asset</span>
              <span className="sm:hidden">New</span>
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Assets"
          value={total}
          icon={Package}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">All equipment</span>}
        />
        <KpiCard
          label="Assigned"
          value={assigned}
          icon={PackageCheck}
          iconClass="bg-sky-500/15 text-sky-600"
          footer={<span className="text-muted-foreground">In use</span>}
        />
        <KpiCard
          label="Available"
          value={available}
          icon={PackageOpen}
          iconClass="bg-emerald-500/15 text-emerald-600"
          footer={<span className="text-muted-foreground">Free to assign</span>}
        />
        <KpiCard
          label="Damaged"
          value={damaged}
          icon={AlertTriangle}
          iconClass="bg-rose-500/15 text-rose-600"
          footer={<span className="text-muted-foreground">Needs repair</span>}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, serial, or assignee…"
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
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span>
              Showing <span className="font-semibold text-foreground">{assets.length}</span>{" "}
              asset{assets.length === 1 ? "" : "s"}
              {(type || status || search) && " (filtered)"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <AssetsSkeleton view={view} />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load assets"
          description="Please try again. If the problem persists, check the dev server."
          actionLabel="Retry"
          onAction={() => qc.invalidateQueries({ queryKey: ["assets"] })}
        />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search || type || status ? "No matching assets" : "No assets yet"}
          description={
            search || type || status
              ? "Try adjusting your filters."
              : "Start by adding your first company asset."
          }
          actionLabel="Add Asset"
          onAction={openCreate}
        />
      ) : view === "table" ? (
        <AssetsTable
          assets={assets}
          onEdit={openEdit}
          onDelete={deleteAsset}
          onAssign={(a) => setAssignAsset(a)}
          onReturn={(a) => setReturnAsset(a)}
          onRetire={retireAsset}
        />
      ) : (
        <AssetsGrid
          assets={assets}
          onEdit={openEdit}
          onDelete={deleteAsset}
          onAssign={(a) => setAssignAsset(a)}
          onReturn={(a) => setReturnAsset(a)}
          onRetire={retireAsset}
        />
      )}

      {/* Create / Edit dialog */}
      <AssetFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditAsset(null);
        }}
        asset={editAsset}
        onSaved={() => qc.invalidateQueries({ queryKey: ["assets"] })}
      />

      {/* Assign dialog */}
      <AssignDialog
        asset={assignAsset}
        onClose={() => setAssignAsset(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["assets"] });
          setAssignAsset(null);
        }}
      />

      {/* Return dialog */}
      <ReturnDialog
        asset={returnAsset}
        onClose={() => setReturnAsset(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["assets"] });
          setReturnAsset(null);
        }}
      />
    </div>
  );
}

// =========================================================
// Table view
// =========================================================

function AssetsTable({
  assets,
  onEdit,
  onDelete,
  onAssign,
  onReturn,
  onRetire,
}: {
  assets: Asset[];
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onAssign: (a: Asset) => void;
  onReturn: (a: Asset) => void;
  onRetire: (a: Asset) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden border-border/60">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Serial</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="hidden lg:table-cell">Assigned Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => {
              const tm = getTypeMeta(a.type);
              const TIcon = tm.icon;
              return (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "size-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          tm.color
                        )}
                      >
                        <TIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{a.name}</div>
                        {a.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {a.notes.split("\n")[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-medium">
                      <TIcon className="size-3" />
                      {tm.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {a.serialNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium border text-[11px]",
                        CONDITION_COLOR[a.condition]
                      )}
                    >
                      {a.condition.charAt(0) + a.condition.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.assignedToName ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarBadge name={a.assignedToName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[140px]">
                            {a.assignedToName}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Available
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {a.assignedDate ? formatDate(a.assignedDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium border text-[11px]",
                        STATUS_COLOR[a.status]
                      )}
                    >
                      {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === "AVAILABLE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => onAssign(a)}
                        >
                          <UserPlus className="size-3.5" />
                          <span className="hidden xl:inline">Assign</span>
                        </Button>
                      )}
                      {a.status === "ASSIGNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => onReturn(a)}
                        >
                          <Undo2 className="size-3.5" />
                          <span className="hidden xl:inline">Return</span>
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
                          <DropdownMenuItem onClick={() => onEdit(a)}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {a.status !== "RETIRED" && (
                            <DropdownMenuItem onClick={() => onRetire(a)}>
                              <Box className="size-4 mr-2" /> Retire
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700"
                            onClick={() => onDelete(a)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// =========================================================
// Grid view
// =========================================================

function AssetsGrid({
  assets,
  onEdit,
  onDelete,
  onAssign,
  onReturn,
  onRetire,
}: {
  assets: Asset[];
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onAssign: (a: Asset) => void;
  onReturn: (a: Asset) => void;
  onRetire: (a: Asset) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {assets.map((a) => {
        const tm = getTypeMeta(a.type);
        const TIcon = tm.icon;
        return (
          <Card
            key={a.id}
            className="p-4 border-border/60 hover:border-border hover:shadow-card-hover transition-all flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  "size-12 rounded-xl flex items-center justify-center",
                  tm.color
                )}
              >
                <TIcon className="size-6" />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-medium border text-[10px]",
                  STATUS_COLOR[a.status]
                )}
              >
                {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
              </Badge>
            </div>

            <div>
              <div className="font-semibold leading-tight truncate" title={a.name}>
                {a.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {tm.label}
                {a.serialNumber && (
                  <span className="font-mono"> · {a.serialNumber}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-medium border text-[10px]",
                  CONDITION_COLOR[a.condition]
                )}
              >
                {a.condition.charAt(0) + a.condition.slice(1).toLowerCase()}
              </Badge>
            </div>

            {a.assignedToName ? (
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                <AvatarBadge name={a.assignedToName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">
                    {a.assignedToName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {a.assignedDate ? formatDate(a.assignedDate) : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 italic pt-1 border-t border-border/60">
                Available for assignment
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-auto pt-2">
              {a.status === "AVAILABLE" && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 flex-1 gap-1.5"
                  onClick={() => onAssign(a)}
                >
                  <UserPlus className="size-3.5" /> Assign
                </Button>
              )}
              {a.status === "ASSIGNED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5"
                  onClick={() => onReturn(a)}
                >
                  <Undo2 className="size-3.5" /> Return
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="More actions"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEdit(a)}>
                    <Pencil className="size-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {a.status !== "RETIRED" && (
                    <DropdownMenuItem onClick={() => onRetire(a)}>
                      <Box className="size-4 mr-2" /> Retire
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-rose-600 focus:text-rose-700"
                    onClick={() => onDelete(a)}
                  >
                    <Trash2 className="size-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// =========================================================
// Skeleton + dialog components
// =========================================================

function AssetsSkeleton({ view }: { view: "table" | "grid" }) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-4 h-48">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-4 w-2/3 mt-3" />
            <Skeleton className="h-3 w-1/2 mt-2" />
            <Skeleton className="h-8 w-full mt-4" />
          </Card>
        ))}
      </div>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-border/40">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </Card>
  );
}

// =========================================================
// Create / Edit form dialog
// =========================================================

function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asset: Asset | null;
  onSaved: () => void;
}) {
  const formKey = `${open ? "open" : "closed"}-${asset?.id ?? "new"}`;
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {asset ? "Edit Asset" : "Add New Asset"}
          </DialogTitle>
          <DialogDescription>
            {asset
              ? "Update asset details. Status changes are handled via Assign/Return actions."
              : "Register a new company asset for tracking and assignment."}
          </DialogDescription>
        </DialogHeader>
        <AssetFormBody
          key={formKey}
          asset={asset}
          savingState={[saving, setSaving]}
          onSaved={() => {
            onSaved();
            onOpenChange(false);
            toast.success(asset ? "Asset updated." : "Asset created.");
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssetFormBody({
  asset,
  savingState,
  onSaved,
  onCancel,
}: {
  asset: Asset | null;
  savingState: [boolean, (b: boolean) => void];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState<AssetType>(asset?.type ?? "LAPTOP");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? "");
  const [condition, setCondition] = useState<AssetCondition>(
    asset?.condition ?? "GOOD"
  );
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [saving, setSaving] = savingState;

  async function submit() {
    if (!name.trim()) {
      toast.error("Asset name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = { name, type, serialNumber, condition, notes };
      const r = asset
        ? await fetch(`/api/assets/${asset.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to save asset");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="asset-name">Asset name *</Label>
        <Input
          id="asset-name"
          placeholder="e.g. MacBook Pro 16&quot; M3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="asset-type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
            <SelectTrigger id="asset-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <t.icon className="size-3.5" />
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-condition">Condition</Label>
          <Select
            value={condition}
            onValueChange={(v) => setCondition(v as AssetCondition)}
          >
            <SelectTrigger id="asset-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="asset-serial">Serial number</Label>
        <Input
          id="asset-serial"
          placeholder="e.g. SN-2024-001234"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="asset-notes">Notes</Label>
        <Textarea
          id="asset-notes"
          placeholder="Optional notes (specs, warranty, purchase date, etc.)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {asset ? "Save Changes" : "Create Asset"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// =========================================================
// Employee searchable multi-select (used by Assign dialog)
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

function EmployeeSearchSelect({
  value,
  onChange,
  employees,
}: {
  value: string;
  onChange: (id: string) => void;
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <AvatarBadge
                name={selected.fullName}
                photo={selected.photo}
                size="sm"
              />
              <span className="truncate">{selected.fullName}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {selected.employeeId}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select employee…</span>
          )}
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search employee name or ID…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`${e.fullName} ${e.employeeId} ${e.department?.name ?? ""}`}
                  onSelect={() => {
                    onChange(e.id);
                    setOpen(false);
                  }}
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
                  {value === e.id && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// =========================================================
// Assign dialog
// =========================================================

function AssignDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: employeesData } = useEmployees(!!asset);
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

  const [employeeId, setEmployeeId] = useState("");
  const [assignedDate, setAssignedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when a new asset opens
  const resetKey = asset?.id ?? "none";
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setEmployeeId("");
    setAssignedDate(new Date().toISOString().slice(0, 10));
    setExpectedReturnDate("");
  }

  async function submit() {
    if (!asset) return;
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    setSaving(true);
    try {
      const body: any = { employeeId, assignedDate };
      if (expectedReturnDate) body.expectedReturnDate = expectedReturnDate;
      const r = await fetch(`/api/assets/${asset.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to assign asset");
      }
      toast.success(`Asset "${asset.name}" assigned.`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!asset}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Assign Asset
          </DialogTitle>
          <DialogDescription>
            {asset
              ? `Assign "${asset.name}" to an employee. The asset status will change to ASSIGNED.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            {employeesData ? (
              <EmployeeSearchSelect
                value={employeeId}
                onChange={setEmployeeId}
                employees={employees}
              />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-date">Assigned date</Label>
            <Input
              id="assign-date"
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expected-return">Expected return date (optional)</Label>
            <Input
              id="expected-return"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Assign Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Return dialog
// =========================================================

function ReturnDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [condition, setCondition] = useState<AssetCondition>("GOOD");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetKey = asset?.id ?? "none";
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setCondition(asset?.condition ?? "GOOD");
    setNotes("");
  }

  async function submit() {
    if (!asset) return;
    setSaving(true);
    try {
      const body: any = { condition };
      if (notes.trim()) body.notes = notes.trim();
      const r = await fetch(`/api/assets/${asset.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to return asset");
      }
      toast.success(`Asset "${asset.name}" returned.`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to return asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!asset}
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-5 text-primary" />
            Return Asset
          </DialogTitle>
          <DialogDescription>
            {asset
              ? `Mark "${asset.name}" as returned by ${asset.assignedToName ?? "the assigned employee"}. The asset will become available again.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="return-condition">Condition on return</Label>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as AssetCondition)}
            >
              <SelectTrigger id="return-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="return-notes">Return notes (optional)</Label>
            <Textarea
              id="return-notes"
              placeholder="Note any damage, missing accessories, or remarks…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
