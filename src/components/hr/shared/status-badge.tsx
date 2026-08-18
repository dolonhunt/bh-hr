"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const normStatus = status.toUpperCase();

  // Map to the new badge variants
  let variant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "purple" | "outline" = "outline";

  if (["ACTIVE", "PRESENT", "APPROVED", "PAID", "SENT", "DELIVERED", "HIRED", "ISSUED", "OPEN"].includes(normStatus)) {
    variant = "success";
  } else if (["PENDING", "DRAFT", "QUEUED", "ON_HOLD", "SCREENING", "APPLIED", "PROBATION", "PENDING_APPROVAL"].includes(normStatus)) {
    variant = "warning";
  } else if (["LATE", "REJECTED", "FAILED", "BOUNCED", "TERMINATED", "CANCELLED", "ARCHIVED", "ABSENT", "CLOSED", "RESIGNED"].includes(normStatus)) {
    variant = "destructive";
  } else if (["GENERATED", "SUBMITTED", "SHORTLISTED", "INTERVIEW", "SELECTED", "OFFER", "REMOTE", "HALF_DAY", "REVIEWED"].includes(normStatus)) {
    variant = "info";
  } else if (["ON_LEAVE", "SPECIAL"].includes(normStatus)) {
    variant = "purple";
  }

  // Set dot color based on variant
  const dotColor: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
    purple: "bg-purple",
    outline: "bg-muted-foreground",
    default: "bg-primary",
    secondary: "bg-secondary-foreground"
  };

  return (
    <Badge
      variant={variant}
      className={cn("px-2.5 py-1 inline-flex items-center gap-2", className)}
    >
      {dot && (
        <span className={cn("size-[6px] rounded-full", dotColor[variant])} />
      )}
      {label ?? status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}
