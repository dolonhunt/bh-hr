"use client";

import { Badge } from "@/components/ui/badge";
import { cn, statusColor } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  label,
  dot = true,
}: {
  status: string;
  className?: string;
  label?: string;
  dot?: boolean;
}) {
  const dotColor: Record<string, string> = {
    ACTIVE: "bg-primary",
    PRESENT: "bg-primary",
    APPROVED: "bg-primary",
    PAID: "bg-primary",
    SENT: "bg-primary",
    DELIVERED: "bg-primary",
    HIRED: "bg-primary",
    ISSUED: "bg-primary",
    GENERATED: "bg-sky-500",
    OPEN: "bg-primary",
    PENDING: "bg-amber-500",
    DRAFT: "bg-amber-500",
    QUEUED: "bg-amber-500",
    ON_HOLD: "bg-amber-500",
    SCREENING: "bg-amber-500",
    APPLIED: "bg-amber-500",
    PROBATION: "bg-amber-500",
    PENDING_APPROVAL: "bg-amber-500",
    SUBMITTED: "bg-sky-500",
    SHORTLISTED: "bg-sky-500",
    INTERVIEW: "bg-sky-500",
    SELECTED: "bg-sky-500",
    OFFER: "bg-sky-500",
    REMOTE: "bg-sky-500",
    HALF_DAY: "bg-sky-500",
    REVIEWED: "bg-sky-500",
    LATE: "bg-rose-500",
    REJECTED: "bg-rose-500",
    FAILED: "bg-rose-500",
    BOUNCED: "bg-rose-500",
    TERMINATED: "bg-rose-500",
    CANCELLED: "bg-rose-500",
    ARCHIVED: "bg-rose-500",
    ABSENT: "bg-rose-500",
    CLOSED: "bg-rose-500",
    RESIGNED: "bg-rose-500",
    ON_LEAVE: "bg-amber-500",
  };
  const dotCls = dotColor[status.toUpperCase()] ?? "bg-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border text-[11px] px-2 py-0.5 rounded-full capitalize inline-flex items-center gap-1.5",
        statusColor(status),
        className
      )}
    >
      {dot && (
        <span className={cn("size-1.5 rounded-full", dotCls)} />
      )}
      {label ?? status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

