"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../shared/page-header";
import { AvatarBadge } from "../shared/avatar-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Search, ShieldCheck, FileText, UserCog, Mail, Trash2 } from "lucide-react";
import { cn, relativeTime, formatDate } from "@/lib/utils";

const ACTION_CATEGORIES: { value: string; label: string }[] = [
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "EMPLOYEE_CREATE", label: "Employee Create" },
  { value: "EMPLOYEE_UPDATE", label: "Employee Update" },
  { value: "EMPLOYEE_DELETE", label: "Employee Delete" },
  { value: "DOCUMENT_GENERATE", label: "Document Generate" },
  { value: "DOCUMENT_SEND", label: "Document Send" },
  { value: "PERFORMANCE_CREATE", label: "Performance Create" },
  { value: "PERFORMANCE_UPDATE", label: "Performance Update" },
  { value: "JOB_CREATE", label: "Job Create" },
  { value: "CANDIDATE_UPDATE", label: "Candidate Update" },
  { value: "SETTINGS_UPDATE", label: "Settings Update" },
  { value: "COMPANY_UPDATE", label: "Company Update" },
  { value: "EMAIL_TEST", label: "Email Test" },
  { value: "REPORT_GENERATE", label: "Report Generate" },
];

function categoryStyle(action: string): {
  icon: any;
  className: string;
  badgeClass: string;
} {
  const a = action.toUpperCase();
  if (a.includes("LOGIN") || a.includes("LOGOUT"))
    return {
      icon: ShieldCheck,
      className: "text-sky-600",
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
    };
  if (a.includes("EMPLOYEE"))
    return {
      icon: UserCog,
      className: "text-primary",
      badgeClass: "bg-primary/15 text-primary border-primary/20",
    };
  if (a.includes("DOCUMENT") || a.includes("REPORT"))
    return {
      icon: FileText,
      className: "text-violet-600",
      badgeClass:
        "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
    };
  if (a.includes("EMAIL") || a.includes("SETTINGS") || a.includes("COMPANY"))
    return {
      icon: Mail,
      className: "text-teal-600",
      badgeClass:
        "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
    };
  if (a.includes("DELETE") || a.includes("ARCHIVE"))
    return {
      icon: Trash2,
      className: "text-rose-600",
      badgeClass:
        "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
    };
  return {
    icon: History,
    className: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  };
}

export function AuditModule() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", search, action, entityType, from, to, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const r = await fetch(`/api/audit-logs?${params.toString()}`);
      return r.json();
    },
    placeholderData: (prev) => prev,
  });

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Complete trail of user actions across the HR system"
        icon={<History className="size-5" />}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search description, action, IP…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={action || "ALL"}
          onValueChange={(v) => {
            setAction(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTION_CATEGORIES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={entityType || "ALL"}
          onValueChange={(v) => {
            setEntityType(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entities</SelectItem>
            <SelectItem value="Employee">Employee</SelectItem>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Document">Document</SelectItem>
            <SelectItem value="Performance">Performance</SelectItem>
            <SelectItem value="Job">Job</SelectItem>
            <SelectItem value="Candidate">Candidate</SelectItem>
            <SelectItem value="Department">Department</SelectItem>
            <SelectItem value="Setting">Setting</SelectItem>
            <SelectItem value="Company">Company</SelectItem>
            <SelectItem value="EmailLog">Email Log</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="text-xs"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{logs.length}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> entries
        </div>
        {(search || action || entityType || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setAction("");
              setEntityType("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon={History}
          title="No audit entries found"
          description="Try adjusting your filters or wait for new activity."
        />
      )}

      {!isLoading && logs.length > 0 && (
        <Card className="border-border/60 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[160px]">Timestamp</TableHead>
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="min-w-[280px]">Description</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const cat = categoryStyle(log.action);
                  const Icon = cat.icon;
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatDate(log.createdAt, "datetime")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(log.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarBadge
                            name={log.user?.name}
                            photo={log.user?.avatar}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {log.user?.name ?? "System"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {log.user?.email ?? "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium border capitalize",
                            cat.badgeClass
                          )}
                        >
                          <Icon className="size-3 mr-1" />
                          {log.action.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.entityType ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

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
    </div>
  );
}
