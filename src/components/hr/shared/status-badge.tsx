"use client";

import { Badge } from "@/components/ui/badge";
import { cn, statusColor } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: string;
  className?: string;
  label?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border text-[11px] px-2 py-0.5 rounded-md capitalize",
        statusColor(status),
        className
      )}
    >
      {label ?? status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}
