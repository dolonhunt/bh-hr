"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  TrendingDown,
  Coins,
  LineChart as LineChartIcon,
  Info,
  Wrench,
  CalendarClock,
  Building2,
  ClipboardList,
  CircleDot,
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
import { cn, formatDate, formatCurrency } from "@/lib/utils";

// =========================================================
// Constants & types
// =========================================================

const ASSET_TYPES = [
  { value: "LAPTOP", label: "Laptop", icon: Laptop, color: "text-sky-600 bg-sky-500/10" },
  { value: "MONITOR", label: "Monitor", icon: Monitor, color: "text-violet-600 bg-violet-500/10" },
  { value: "PHONE", label: "Phone", icon: Smartphone, color: "text-primary text-emerald-500/10" },
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

const MAINTENANCE_TYPES = [
  { value: "REPAIR", label: "Repair" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "UPGRADE", label: "Upgrade" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "REPLACEMENT", label: "Replacement" },
] as const;

const MAINTENANCE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type MaintenanceTypeValue = (typeof MAINTENANCE_TYPES)[number]["value"];
type MaintenanceStatusValue = (typeof MAINTENANCE_STATUSES)[number];

const MAINTENANCE_TYPE_COLOR: Record<MaintenanceTypeValue, string> = {
  REPAIR: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  MAINTENANCE:
    "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
  UPGRADE: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  INSPECTION:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  REPLACEMENT:
    "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
};

const MAINTENANCE_STATUS_COLOR: Record<MaintenanceStatusValue, string> = {
  SCHEDULED:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  IN_PROGRESS:
    "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  COMPLETED:
    "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
  CANCELLED:
    "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const MAINTENANCE_STATUS_NEXT: Record<MaintenanceStatusValue, MaintenanceStatusValue> = {
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

type AssetType = (typeof ASSET_TYPES)[number]["value"];
type AssetCondition = (typeof CONDITIONS)[number];
type AssetStatus = (typeof STATUSES)[number];

const CONDITION_COLOR: Record<AssetCondition, string> = {
  NEW: "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
  GOOD: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  FAIR: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  DAMAGED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const STATUS_COLOR: Record<AssetStatus, string> = {
  AVAILABLE: "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20",
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
  purchaseValue?: number;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDate: string | null;
  returnDate: string | null;
  expectedReturnDate: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
}

interface DepreciationRow {
  id: string;
  name: string;
  type: AssetType;
  serialNumber: string;
  purchaseValue: number;
  depreciationRate: number;
  age: number;
  annualDepreciation: number;
  totalDepreciation: number;
  currentValue: number;
  purchaseDate: string;
  condition: AssetCondition;
  status: AssetStatus;
}

interface DepreciationSummary {
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  avgDepreciationPct: number;
}

interface DepreciationDetailYear {
  year: number;
  label: string;
  startValue: number;
  endValue: number;
  depreciationThisYear: number;
  cumulativeDepreciation: number;
  remainingValue: number;
  isPast: boolean;
  isCurrent: boolean;
  isProjection: boolean;
}

interface DepreciationDetail {
  asset: {
    id: string;
    name: string;
    type: AssetType;
    serialNumber: string;
    purchaseValue: number;
    depreciationRate: number;
    age: number;
    annualDepreciation: number;
    totalDepreciation: number;
    currentValue: number;
    purchaseDate: string;
    condition: AssetCondition;
    status: AssetStatus;
  };
  history: DepreciationDetailYear[];
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  fullName: string;
  photo?: string | null;
  department?: { name: string; color?: string | null } | null;
  designation?: { name: string } | null;
}

interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: MaintenanceTypeValue;
  description: string;
  cost: number;
  vendor: string | null;
  startDate: string;
  endDate: string | null;
  status: MaintenanceStatusValue;
  notes: string | null;
  createdAt: string;
}

interface MaintenanceSummary {
  totalCost: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
}

interface AssetMaintenanceResponse {
  items: MaintenanceRecord[];
  total: number;
  summary: MaintenanceSummary;
}

interface GlobalMaintenanceSummary extends MaintenanceSummary {
  assetsWithMaintenanceCount: number;
  damagedAssetCount: number;
  typeDistribution: Record<string, number>;
  topAssets: { assetId: string; cost: number }[];
}

interface GlobalMaintenanceResponse {
  items: MaintenanceRecord[];
  total: number;
  summary: GlobalMaintenanceSummary;
}

// =========================================================
// Main module
// =========================================================

export function AssetsModule() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"table" | "grid" | "depreciation">("table");

  const [formOpen, setFormOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [returnAsset, setReturnAsset] = useState<Asset | null>(null);
  const [depreciationAsset, setDepreciationAsset] = useState<DepreciationRow | null>(null);
  const [maintenanceAsset, setMaintenanceAsset] = useState<Asset | null>(null);

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

  // Global maintenance summary for the Maintenance KPI card (table + grid views only).
  const maintenanceSummaryQ = useQuery({
    queryKey: ["assets", "maintenance", "summary"],
    queryFn: async () => {
      const r = await fetch("/api/assets/maintenance");
      if (!r.ok) throw new Error("Failed to load maintenance summary");
      return r.json();
    },
    enabled: view !== "depreciation",
  });
  const maintenanceSummary: GlobalMaintenanceSummary | undefined =
    maintenanceSummaryQ.data?.summary;

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
              <Button
                variant={view === "depreciation" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setView("depreciation")}
                aria-label="Depreciation view"
              >
                <TrendingDown className="size-4" />
                <span className="hidden sm:inline">Depreciation</span>
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
          iconClass="text-emerald-500/15 text-primary"
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

      {/* Maintenance summary card (hidden in depreciation view) */}
      {view !== "depreciation" && (
        <MaintenanceSummaryCard
          summary={maintenanceSummary}
          isLoading={maintenanceSummaryQ.isLoading}
          isError={maintenanceSummaryQ.isError}
          onRetry={() =>
            qc.invalidateQueries({ queryKey: ["assets", "maintenance", "summary"] })
          }
        />
      )}

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
      {view === "depreciation" ? (
        <DepreciationView
          search={search}
          type={type}
          status={status}
          onInspect={(row) => setDepreciationAsset(row)}
        />
      ) : isLoading ? (
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
          onMaintenance={(a) => setMaintenanceAsset(a)}
        />
      ) : (
        <AssetsGrid
          assets={assets}
          onEdit={openEdit}
          onDelete={deleteAsset}
          onAssign={(a) => setAssignAsset(a)}
          onReturn={(a) => setReturnAsset(a)}
          onRetire={retireAsset}
          onMaintenance={(a) => setMaintenanceAsset(a)}
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

      {/* Depreciation detail dialog */}
      <DepreciationDetailDialog
        asset={depreciationAsset}
        onClose={() => setDepreciationAsset(null)}
      />

      {/* Maintenance history dialog */}
      <MaintenanceHistoryDialog
        asset={maintenanceAsset}
        onClose={() => setMaintenanceAsset(null)}
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
  onMaintenance,
}: {
  assets: Asset[];
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onAssign: (a: Asset) => void;
  onReturn: (a: Asset) => void;
  onRetire: (a: Asset) => void;
  onMaintenance: (a: Asset) => void;
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => onMaintenance(a)}
                        title="View maintenance history"
                      >
                        <Wrench className="size-3.5" />
                        <span className="hidden xl:inline">Maintenance</span>
                      </Button>
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
                          <DropdownMenuItem onClick={() => onMaintenance(a)}>
                            <Wrench className="size-4 mr-2" /> Maintenance History
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
  onMaintenance,
}: {
  assets: Asset[];
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onAssign: (a: Asset) => void;
  onReturn: (a: Asset) => void;
  onRetire: (a: Asset) => void;
  onMaintenance: (a: Asset) => void;
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
              <div className="text-xs text-primary dark:text-emerald-400 italic pt-1 border-t border-border/60">
                Available for assignment
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-auto pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => onMaintenance(a)}
                title="Maintenance history"
              >
                <Wrench className="size-3.5" />
                <span className="hidden sm:inline">Maint.</span>
              </Button>
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
                  <DropdownMenuItem onClick={() => onMaintenance(a)}>
                    <Wrench className="size-4 mr-2" /> Maintenance History
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
  const [purchaseValue, setPurchaseValue] = useState<string>(
    asset?.purchaseValue !== undefined && asset.purchaseValue !== null
      ? String(asset.purchaseValue)
      : "1000"
  );
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [saving, setSaving] = savingState;

  async function submit() {
    if (!name.trim()) {
      toast.error("Asset name is required.");
      return;
    }
    const pvNum = Number(purchaseValue);
    const pv =
      purchaseValue.trim() !== "" && !isNaN(pvNum) && pvNum >= 0
        ? pvNum
        : 1000;
    setSaving(true);
    try {
      const body = { name, type, serialNumber, condition, purchaseValue: pv, notes };
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <Label htmlFor="asset-purchase-value">
            Purchase value (৳)
          </Label>
          <Input
            id="asset-purchase-value"
            type="number"
            min="0"
            step="100"
            placeholder="1000"
            value={purchaseValue}
            onChange={(e) => setPurchaseValue(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Used to compute depreciation. Defaults to ৳1,000 if left blank.
          </p>
        </div>
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

// =========================================================
// Depreciation View — KPIs + table + color-coded bars
// =========================================================

function depreciationColor(pct: number) {
  if (pct < 30) return "text-emerald-500";
  if (pct <= 70) return "bg-amber-500";
  return "bg-rose-500";
}

function depreciationTone(pct: number) {
  if (pct < 30)
    return "text-emerald-500/15 text-primary dark:text-primary/80 border-primary/20";
  if (pct <= 70)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20";
}

function DepreciationView({
  search,
  type,
  status,
  onInspect,
}: {
  search: string;
  type: string;
  status: string;
  onInspect: (row: DepreciationRow) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assets", "depreciation"],
    queryFn: async () => {
      const r = await fetch("/api/assets/depreciation");
      if (!r.ok) throw new Error("Failed to load depreciation");
      return r.json();
    },
  });

  const summary: DepreciationSummary | undefined = data?.summary;
  const items: DepreciationRow[] = data?.items ?? [];

  const filtered = useMemo(() => {
    let list = items;
    if (type) list = list.filter((a) => a.type === type);
    if (status) list = list.filter((a) => a.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, type, status, search]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load depreciation data"
        description="Please try again. If the problem persists, check the dev server."
        actionLabel="Retry"
        onAction={() => qc.invalidateQueries({ queryKey: ["assets", "depreciation"] })}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={TrendingDown}
        title="No assets to depreciate"
        description="Once you add assets, depreciation will be tracked here automatically."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Purchase Value"
          value={summary ? formatCurrency(summary.totalPurchaseValue) : "—"}
          icon={Coins}
          iconClass="bg-primary/10 text-primary"
          footer={<span className="text-muted-foreground">{items.length} asset{items.length === 1 ? "" : "s"}</span>}
        />
        <KpiCard
          label="Total Current Value"
          value={summary ? formatCurrency(summary.totalCurrentValue) : "—"}
          icon={Package}
          iconClass="text-emerald-500/15 text-primary"
          footer={<span className="text-muted-foreground">After depreciation</span>}
        />
        <KpiCard
          label="Total Depreciated"
          value={summary ? formatCurrency(summary.totalDepreciation) : "—"}
          icon={TrendingDown}
          iconClass="bg-rose-500/15 text-rose-600"
          footer={<span className="text-muted-foreground">All-time loss</span>}
        />
        <KpiCard
          label="Avg Depreciation"
          value={summary ? `${summary.avgDepreciationPct}%` : "—"}
          icon={LineChartIcon}
          iconClass="bg-amber-500/15 text-amber-600"
          footer={<span className="text-muted-foreground">Across portfolio</span>}
        />
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden border-border/60">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="hidden lg:table-cell">Purchased</TableHead>
                <TableHead className="text-right">Age (yrs)</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Rate</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="min-w-[160px]">Depreciation</TableHead>
                <TableHead className="text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No assets match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => {
                  const pct =
                    a.purchaseValue > 0
                      ? Math.min(100, Math.round((a.totalDepreciation / a.purchaseValue) * 100))
                      : 0;
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
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {a.serialNumber || "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="gap-1 font-medium">
                          <TIcon className="size-3" />
                          {tm.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatCurrency(a.purchaseValue)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDate(a.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {a.age.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell tabular-nums">
                        {Math.round(a.depreciationRate * 100)}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(a.currentValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full transition-all", depreciationColor(pct))}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 tabular-nums w-12 justify-center",
                              depreciationTone(pct)
                            )}
                          >
                            {pct}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => onInspect(a)}
                        >
                          <LineChartIcon className="size-3.5" />
                          <span className="hidden xl:inline">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// =========================================================
// Depreciation Detail Dialog — AreaChart of value decline
// =========================================================

function DepreciationDetailDialog({
  asset,
  onClose,
}: {
  asset: DepreciationRow | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assets", "depreciation", "detail", asset?.id],
    queryFn: async () => {
      if (!asset) return null;
      const r = await fetch(`/api/assets/${asset.id}/depreciation`);
      if (!r.ok) throw new Error("Failed to load depreciation history");
      return r.json();
    },
    enabled: !!asset,
  });

  const detail: DepreciationDetail | null = data ?? null;

  // Reset when asset changes — no-op state, just to satisfy lint/useEffect import.
  useEffect(() => {
    // no-op: query is keyed on asset id; nothing local to reset.
  }, [asset?.id]);

  const chartData = (detail?.history ?? []).map((h) => ({
    label: `Yr ${h.year}`,
    endValue: h.endValue,
    depreciation: h.cumulativeDepreciation,
    isProjection: h.isProjection,
  }));

  return (
    <Dialog
      open={!!asset}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="size-5 text-primary" />
            Depreciation Timeline
          </DialogTitle>
          <DialogDescription>
            {asset
              ? `Per-year value decline for "${asset.name}".`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {!asset ? null : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load depreciation history"
            description="Please close and try again."
          />
        ) : detail ? (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile
                label="Purchase"
                value={formatCurrency(detail.asset.purchaseValue)}
                tone="primary"
              />
              <SummaryTile
                label="Current"
                value={formatCurrency(detail.asset.currentValue)}
                tone="emerald"
              />
              <SummaryTile
                label="Depreciated"
                value={formatCurrency(detail.asset.totalDepreciation)}
                tone="rose"
              />
              <SummaryTile
                label="Rate / yr"
                value={`${Math.round(detail.asset.depreciationRate * 100)}%`}
                tone="amber"
              />
            </div>

            {/* Asset meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <MetaTile label="Age" value={`${detail.asset.age.toFixed(1)} yrs`} />
              <MetaTile
                label="Purchased"
                value={formatDate(detail.asset.purchaseDate)}
              />
              <MetaTile
                label="Annual Loss"
                value={formatCurrency(detail.asset.annualDepreciation)}
              />
              <MetaTile
                label="Type"
                value={getTypeMeta(detail.asset.type).label}
              />
            </div>

            {/* Area chart */}
            <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Value decline over time
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm text-emerald-500" />
                    Remaining value
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-rose-400" />
                    Cumulative depreciation
                  </span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      width={56}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid hsl(var(--border))",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "endValue" ? "Remaining" : "Depreciated",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="endValue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#valueGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="depreciation"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fill="url(#depGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Yearly breakdown */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Start</TableHead>
                      <TableHead className="text-right">Dep. (yr)</TableHead>
                      <TableHead className="text-right">Cumulative</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.history.map((h) => (
                      <TableRow key={h.year}>
                        <TableCell className="text-sm font-medium">{h.label}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatCurrency(h.startValue)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatCurrency(h.depreciationThisYear)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatCurrency(h.cumulativeDepreciation)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          {formatCurrency(h.remainingValue)}
                        </TableCell>
                        <TableCell>
                          {h.isCurrent ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px] px-1.5 py-0">
                              Current
                            </Badge>
                          ) : h.isProjection ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Projected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Past
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
              <Info className="size-4 flex-shrink-0 mt-0.5" />
              <div>
                Depreciation is computed as{" "}
                <span className="font-mono">
                  currentValue = purchaseValue × (1 − rate)
                  <sup>years</sup>
                </span>{" "}
                using the asset type&rsquo;s annual rate. Year 0 represents the
                purchase date; projection years (next 5) are estimates only.
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
        ? "text-emerald-500/15 text-primary dark:text-primary/80"
        : tone === "rose"
          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <Card className="p-3 gap-0 border-border/60">
      <div className={cn("inline-flex size-7 rounded-lg items-center justify-center mb-1.5", toneClass)}>
        <Coins className="size-4" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-bold text-base mt-0.5 tabular-nums">{value}</div>
    </Card>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}

// =========================================================
// Maintenance summary card (global, shown above the table/grid)
// =========================================================

function MaintenanceSummaryCard({
  summary,
  isLoading,
  isError,
  onRetry,
}: {
  summary: GlobalMaintenanceSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <Card className="p-4 border-border/60 bg-muted/10">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 text-rose-500" />
          <span>Failed to load maintenance summary.</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const totalCost = summary?.totalCost ?? 0;
  const activeCount = summary?.activeCount ?? 0;
  const damagedCount = summary?.damagedAssetCount ?? 0;
  const topSpenders = summary?.topAssets ?? [];

  return (
    <Card className="p-4 sm:p-5 border-border/60 shadow-soft">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Wrench className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-bold tracking-tight">
              Maintenance &amp; Repair Summary
            </div>
            <div className="text-xs text-muted-foreground">
              Portfolio-wide service history across all assets.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/60 p-3 text-emerald-500/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Coins className="size-3.5 text-primary" />
            Total Maintenance Cost
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-24 mt-2" />
          ) : (
            <div className="text-lg sm:text-xl font-bold mt-1 tabular-nums text-primary dark:text-primary/80">
              {formatCurrency(totalCost)}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Sum of completed work
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-3 bg-amber-500/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <CircleDot className="size-3.5 text-amber-600" />
            Active Maintenance
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-12 mt-2" />
          ) : (
            <div className="text-lg sm:text-xl font-bold mt-1 tabular-nums text-amber-700 dark:text-amber-300">
              {activeCount}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Scheduled + in progress
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-3 bg-rose-500/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="size-3.5 text-rose-600" />
            Assets Needing Maintenance
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-12 mt-2" />
          ) : (
            <div className="text-lg sm:text-xl font-bold mt-1 tabular-nums text-rose-700 dark:text-rose-300">
              {damagedCount}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Damaged condition
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-3 bg-primary/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="size-3.5 text-primary" />
            Total Records
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-12 mt-2" />
          ) : (
            <div className="text-lg sm:text-xl font-bold mt-1 tabular-nums text-primary">
              {summary?.completedCount ?? 0}
              <span className="text-xs text-muted-foreground font-normal">
                {" "}
                / {summary ? summary.completedCount + summary.activeCount + summary.cancelledCount : 0}
              </span>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Completed / all records
          </div>
        </div>
      </div>

      {/* Top spenders mini list */}
      {!isLoading && topSpenders.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Top maintenance spenders
          </div>
          <div className="flex flex-wrap gap-2">
            {topSpenders.map((t) => (
              <div
                key={t.assetId}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-2.5 py-1 text-xs"
                title={t.assetId}
              >
                <span className="font-mono text-muted-foreground">
                  #{t.assetId.slice(-6)}
                </span>
                <span className="font-semibold text-primary dark:text-primary/80 tabular-nums">
                  {formatCurrency(t.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// =========================================================
// Maintenance History Dialog
// =========================================================

function useAssetMaintenance(assetId: string | null) {
  return useQuery({
    queryKey: ["assets", "maintenance", "list", assetId],
    queryFn: async () => {
      if (!assetId) return null;
      const r = await fetch(`/api/assets/${assetId}/maintenance`);
      if (!r.ok) throw new Error("Failed to load maintenance records");
      return r.json();
    },
    enabled: !!assetId,
  });
}

function MaintenanceHistoryDialog({
  asset,
  onClose,
}: {
  asset: Asset | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAssetMaintenance(asset?.id ?? null);
  const records: MaintenanceRecord[] = data?.items ?? [];
  const summary: MaintenanceSummary | undefined = data?.summary;

  useEffect(() => {
    if (!asset) setShowAdd(false);
  }, [asset]);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["assets", "maintenance", "list", asset?.id] });
    qc.invalidateQueries({ queryKey: ["assets", "maintenance", "summary"] });
  }

  async function cycleStatus(rec: MaintenanceRecord) {
    if (rec.status === "CANCELLED") return;
    const next = MAINTENANCE_STATUS_NEXT[rec.status];
    setSavingId(rec.id);
    try {
      const body: any = { status: next };
      if (next === "COMPLETED" && !rec.endDate) {
        body.endDate = new Date().toISOString().slice(0, 10);
      }
      const r = await fetch(
        `/api/assets/${asset?.id}/maintenance/${rec.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to update status");
      }
      toast.success(
        `Status updated to ${next.replace(/_/g, " ").toLowerCase()}.`
      );
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setSavingId(null);
    }
  }

  async function cancelRecord(rec: MaintenanceRecord) {
    if (!confirm("Cancel this maintenance record?")) return;
    setSavingId(rec.id);
    try {
      const r = await fetch(
        `/api/assets/${asset?.id}/maintenance/${rec.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to cancel record");
      }
      toast.success("Maintenance record cancelled.");
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel record.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRecord(rec: MaintenanceRecord) {
    if (!confirm("Permanently delete this maintenance record?")) return;
    setSavingId(rec.id);
    try {
      const r = await fetch(
        `/api/assets/${asset?.id}/maintenance/${rec.id}`,
        { method: "DELETE" }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to delete record");
      }
      toast.success("Maintenance record deleted.");
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete record.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Dialog
      open={!!asset}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            Maintenance History
          </DialogTitle>
          <DialogDescription>
            {asset
              ? `Service and repair records for "${asset.name}" (${asset.serialNumber || "—"}).`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {!asset ? null : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load maintenance records"
            description="Please close and try again."
          />
        ) : (
          <div className="space-y-4">
            {/* Inline summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MaintenanceSummaryTile
                label="Total Cost"
                value={formatCurrency(summary?.totalCost ?? 0)}
                tone="emerald"
              />
              <MaintenanceSummaryTile
                label="Active"
                value={String(summary?.activeCount ?? 0)}
                tone="amber"
              />
              <MaintenanceSummaryTile
                label="Completed"
                value={String(summary?.completedCount ?? 0)}
                tone="primary"
              />
              <MaintenanceSummaryTile
                label="Cancelled"
                value={String(summary?.cancelledCount ?? 0)}
                tone="rose"
              />
            </div>

            {/* Add Maintenance button */}
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="size-4" />
                Add Maintenance
              </Button>
            </div>

            {/* List */}
            {records.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No maintenance records yet"
                description="Log repairs, upgrades, inspections, and routine maintenance to track the asset's service history."
                actionLabel="Add First Record"
                onAction={() => setShowAdd(true)}
              />
            ) : (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 -mr-1">
                {records.map((rec) => {
                  const next = MAINTENANCE_STATUS_NEXT[rec.status];
                  const canAdvance =
                    rec.status !== "CANCELLED" && next !== rec.status;
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-border/60 p-3 sm:p-4 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-medium border text-[11px] px-2 py-0.5",
                              MAINTENANCE_TYPE_COLOR[rec.type]
                            )}
                          >
                            {rec.type.charAt(0) +
                              rec.type.slice(1).toLowerCase()}
                          </Badge>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate max-w-[260px]">
                              {rec.description}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="size-3" />
                                {formatDate(rec.startDate)}
                                {rec.endDate
                                  ? ` → ${formatDate(rec.endDate)}`
                                  : " → ongoing"}
                              </span>
                              {rec.vendor && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="size-3" />
                                  {rec.vendor}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums">
                              {formatCurrency(rec.cost)}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-medium border text-[11px] px-2 py-0.5",
                              MAINTENANCE_STATUS_COLOR[rec.status]
                            )}
                          >
                            {rec.status
                              .charAt(0)
                              .concat(rec.status.slice(1).toLowerCase().replace(/_/g, " "))}
                          </Badge>
                        </div>
                      </div>

                      {rec.notes && (
                        <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
                          <span className="font-medium text-foreground">Notes:</span>{" "}
                          {rec.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 mt-2.5">
                        {canAdvance && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            disabled={savingId === rec.id}
                            onClick={() => cycleStatus(rec)}
                          >
                            {savingId === rec.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CircleDot className="size-3" />
                            )}
                            {next === "IN_PROGRESS"
                              ? "Start"
                              : next === "COMPLETED"
                                ? "Complete"
                                : "Advance"}
                          </Button>
                        )}
                        {rec.status !== "CANCELLED" &&
                          rec.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              disabled={savingId === rec.id}
                              onClick={() => cancelRecord(rec)}
                            >
                              Cancel
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                          disabled={savingId === rec.id}
                          onClick={() => deleteRecord(rec)}
                        >
                          <Trash2 className="size-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showAdd && (
              <AddMaintenanceDialog
                asset={asset}
                onClose={() => setShowAdd(false)}
                onSaved={() => {
                  setShowAdd(false);
                  invalidateAll();
                }}
              />
            )}
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

function MaintenanceSummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
        ? "text-emerald-500/15 text-primary dark:text-primary/80"
        : tone === "rose"
          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-base font-bold mt-1 tabular-nums", toneClass)}>
        {value}
      </div>
    </div>
  );
}

// =========================================================
// Add Maintenance Dialog
// =========================================================

function AddMaintenanceDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<MaintenanceTypeValue>("MAINTENANCE");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [vendor, setVendor] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }
    const costNum = Number(cost);
    if (cost.trim() !== "" && (isNaN(costNum) || costNum < 0)) {
      toast.error("Cost must be a non-negative number.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        type,
        description: description.trim(),
        cost: cost.trim() === "" ? 0 : costNum,
        vendor: vendor.trim() || null,
        startDate,
      };
      if (endDate) body.endDate = endDate;
      if (notes.trim()) body.notes = notes.trim();

      const r = await fetch(`/api/assets/${asset.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to create maintenance record");
      }
      toast.success("Maintenance record created.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create maintenance record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!saving && !o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            Add Maintenance Record
          </DialogTitle>
          <DialogDescription>
            Log a repair, inspection, upgrade, or routine service for &quot;{asset.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as MaintenanceTypeValue)}>
                <SelectTrigger id="m-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-cost">Cost (৳)</Label>
              <Input
                id="m-cost"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description *</Label>
            <Textarea
              id="m-desc"
              placeholder="What work was performed?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-vendor">Vendor / Service provider</Label>
            <Input
              id="m-vendor"
              placeholder="e.g. TechFix BD, Apple Service Center"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-start">Start date *</Label>
              <Input
                id="m-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-end">Expected end date</Label>
              <Input
                id="m-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea
              id="m-notes"
              placeholder="Optional notes, symptoms, warranty info, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}