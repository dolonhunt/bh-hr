"use client";

import {
  useState,
  useRef,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  Network,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgNode {
  id: string;
  employeeId: string;
  fullName: string;
  photo: string | null;
  designation: string | null;
  department: string | null;
  departmentColor: string | null;
  role: string | null;
  employmentStatus: string;
  subordinateCount: number;
  subordinates: OrgNode[];
  _depth: number;
}

interface DepartmentInfo {
  name: string;
  color: string | null;
  count: number;
}

interface OrgChartResponse {
  tree: OrgNode[];
  departments: DepartmentInfo[];
  totalEmployees: number;
  totalRoots: number;
  maxDepth: number;
}

const DEFAULT_COLOR = "#18A98F";

// Collect every node id in the tree (used for "collapse all").
function collectIds(nodes: OrgNode[]): Set<string> {
  const ids = new Set<string>();
  function walk(list: OrgNode[]) {
    for (const n of list) {
      ids.add(n.id);
      if (n.subordinates?.length) walk(n.subordinates);
    }
  }
  walk(nodes);
  return ids;
}

function matchesQuery(node: OrgNode, q: string): boolean {
  if (!q) return false;
  const needle = q.toLowerCase();
  return (
    node.fullName.toLowerCase().includes(needle) ||
    node.employeeId.toLowerCase().includes(needle) ||
    (node.designation ?? "").toLowerCase().includes(needle) ||
    (node.department ?? "").toLowerCase().includes(needle) ||
    (node.role ?? "").toLowerCase().includes(needle)
  );
}

function subtreeMatches(node: OrgNode, q: string): boolean {
  if (matchesQuery(node, q)) return true;
  return (node.subordinates ?? []).some((c) => subtreeMatches(c, q));
}

// Collect ids of all nodes that are ancestors of any matching node — these
// need to be expanded so the matching node becomes visible.
function ancestorsOfMatches(nodes: OrgNode[], q: string): Set<string> {
  const expand = new Set<string>();
  function walk(node: OrgNode): boolean {
    let anyMatch = matchesQuery(node, q);
    for (const c of node.subordinates ?? []) {
      if (walk(c)) {
        anyMatch = true;
      }
    }
    if (anyMatch && node.subordinates?.length) {
      expand.add(node.id);
    }
    return anyMatch;
  }
  for (const n of nodes) walk(n);
  return expand;
}

export function OrgChart() {
  const openEmployee = useApp((s) => s.openEmployee);
  const [zoom, setZoom] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [treeSig, setTreeSig] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<OrgChartResponse>({
    queryKey: ["org-chart"],
    queryFn: async () => {
      const r = await fetch("/api/org-chart");
      if (!r.ok) throw new Error("Failed to load org chart");
      return r.json();
    },
    staleTime: 30_000,
  });

  const tree = data?.tree ?? [];
  const departments = data?.departments ?? [];

  // When the tree first loads (or its root ids change), default-collapse
  // every node at depth >= 1 so the chart isn't overwhelming for large orgs.
  // Uses the React-documented "adjust state during render" pattern instead of
  // a useEffect with setState (which triggers cascading renders + lint error).
  const currentSig = tree.map((n) => n.id).join("|");
  if (currentSig !== treeSig) {
    setTreeSig(currentSig);
    if (tree.length > 0) {
      const set = new Set<string>();
      function walk(nodes: OrgNode[], depth: number) {
        for (const n of nodes) {
          if (depth >= 1) set.add(n.id);
          if (n.subordinates?.length) walk(n.subordinates, depth + 1);
        }
      }
      walk(tree, 0);
      // Start fresh — reset any prior user toggles when the tree itself changes.
      setCollapsed(set);
    }
  }

  // When searching, expand any ancestor of a matching node so the match is
  // actually visible. We compute the effective collapsed set with useMemo so
  // user-initiated collapses are preserved when search is cleared.
  const effectiveCollapsed = useMemo(() => {
    if (!search || tree.length === 0) return collapsed;
    const expand = ancestorsOfMatches(tree, search);
    const next = new Set(collapsed);
    for (const id of expand) next.delete(id);
    return next;
  }, [collapsed, search, tree]);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    if (tree.length) setCollapsed(collectIds(tree));
  };

  function toggleNode(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function adjustZoom(delta: number) {
    setZoom((z) => Math.min(2, Math.max(0.4, +(z + delta).toFixed(2))));
  }

  function resetZoom() {
    setZoom(1);
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [data-no-pan]")) return;
    setIsPanning(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const { scrollLeft, scrollTop } = containerRef.current;
    panStart.current = { x: e.clientX, y: e.clientY, scrollLeft, scrollTop };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    containerRef.current.scrollLeft = panStart.current.scrollLeft - dx;
    containerRef.current.scrollTop = panStart.current.scrollTop - dy;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    setIsPanning(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  if (isLoading) {
    return (
      <Card className="border-border/30 shadow-soft">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Building reporting hierarchy…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Network}
        title="Couldn't load org chart"
        description="Please try again in a moment."
      />
    );
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No employees to chart"
        description="Add employees and set their reporting managers to build the org chart."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, role…"
              className="pl-8 w-64 max-w-full"
            />
          </div>
          {search && (
            <span className="text-xs text-muted-foreground">
              Highlighting matches
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={expandAll} className="gap-1.5">
            <ChevronDown className="size-3.5" /> Expand all
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll} className="gap-1.5">
            <ChevronRight className="size-3.5" /> Collapse all
          </Button>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => adjustZoom(-0.1)}
              className="p-2 hover:bg-muted text-muted-foreground"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="px-2 text-xs tabular-nums text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => adjustZoom(0.1)}
              className="p-2 hover:bg-muted text-muted-foreground"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 hover:bg-muted text-muted-foreground border-l border-border"
              aria-label="Reset zoom"
              title="Reset"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Department legend */}
      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Departments:</span>
          {departments.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: d.color ?? DEFAULT_COLOR }}
              />
              <span className="text-foreground">{d.name}</span>
              <span className="text-muted-foreground">{d.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Canvas — pannable / zoomable */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className={cn(
          "relative w-full overflow-auto rounded-xl border border-border/60 bg-muted/20 select-none",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ minHeight: "60vh", maxHeight: "70vh" }}
      >
        <div
          className="origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, padding: "2rem" }}
        >
          <div className="flex flex-col items-center gap-0">
            {tree.map((root) => (
              <OrgNodeView
                key={root.id}
                node={root}
                collapsed={effectiveCollapsed}
                onToggle={toggleNode}
                onOpenProfile={openEmployee}
                search={search}
                isRoot
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Users className="size-3.5" />
        Showing {data.totalEmployees} employees across {data.totalRoots} top-level reporting line
        {data.totalRoots === 1 ? "" : "s"} · max depth {data.maxDepth} levels.
        <span className="hidden sm:inline">
          {" "}Drag to pan · scroll to navigate.
        </span>
      </div>
    </div>
  );
}

function OrgNodeView({
  node,
  collapsed,
  onToggle,
  onOpenProfile,
  search,
  isRoot,
}: {
  node: OrgNode;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onOpenProfile: (id: string) => void;
  search: string;
  isRoot?: boolean;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = (node.subordinates?.length ?? 0) > 0;
  const isMatch = matchesQuery(node, search);
  const accent = node.departmentColor ?? DEFAULT_COLOR;
  const children = node.subordinates ?? [];

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => onOpenProfile(node.id)}
        data-no-pan
        className={cn(
          "group relative w-56 rounded-xl border bg-card text-left shadow-soft transition-all hover:shadow-card-hover hover:-translate-y-0.5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isMatch
            ? "border-primary ring-2 ring-primary/40"
            : "border-border/60"
        )}
      >
        {/* Department color stripe */}
        <div className="h-1.5 rounded-t-xl" style={{ background: accent }} />
        <div className="p-3">
          <div className="flex items-start gap-3">
            <AvatarBadge
              name={node.fullName}
              photo={node.photo}
              size="md"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {node.fullName}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {node.employeeId}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {node.designation ?? "—"}
              </div>
              {node.department && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="truncate">{node.department}</span>
                </div>
              )}
            </div>
            {node.employmentStatus !== "ACTIVE" && (
              <StatusBadge
                status={node.employmentStatus}
                dot={false}
                className="flex-shrink-0"
              />
            )}
          </div>
          {node.subordinateCount > 0 && (
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {node.subordinateCount} direct + indirect report
                {node.subordinateCount === 1 ? "" : "s"}
              </span>
              {hasChildren && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggle(node.id);
                    }
                  }}
                  className="inline-flex items-center gap-0.5 hover:text-foreground cursor-pointer rounded px-1 py-0.5 hover:bg-muted"
                  data-no-pan
                >
                  {isCollapsed ? (
                    <>
                      <ChevronRight className="size-3" /> Expand
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3" /> Collapse
                    </>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Children + connectors */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center">
          {/* Vertical line from parent down to trunk */}
          <div className="w-px h-6 bg-border" />
          {children.length === 1 ? (
            <div className="flex flex-col items-center">
              <div className="w-px h-6 bg-border" />
              <OrgNodeView
                node={children[0]}
                collapsed={collapsed}
                onToggle={onToggle}
                onOpenProfile={onOpenProfile}
                search={search}
              />
            </div>
          ) : (
            <div className="flex items-start">
              {children.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === children.length - 1;
                return (
                  <div
                    key={child.id}
                    className="relative px-3 pt-0 flex flex-col items-center"
                  >
                    {/* Horizontal trunk segment — full width except clipped
                        at the first/last child so it only spans between
                        the centers of the outermost children. */}
                    <div
                      className={cn(
                        "absolute top-0 h-px bg-border",
                        isFirst && "left-1/2 right-0",
                        isLast && "left-0 right-1/2",
                        !isFirst && !isLast && "left-0 right-0"
                      )}
                    />
                    {/* Vertical line going down from trunk to this child */}
                    <div className="w-px h-6 bg-border" />
                    <OrgNodeView
                      node={child}
                      collapsed={collapsed}
                      onToggle={onToggle}
                      onOpenProfile={onOpenProfile}
                      search={search}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
