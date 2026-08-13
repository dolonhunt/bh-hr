"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  icon: LucideIcon;
  iconClass?: string;
  footer?: ReactNode;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  iconClass,
  footer,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "relative p-5 gap-0 overflow-hidden border-border/60 shadow-soft transition-all",
        onClick && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {delta && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  delta.trend === "up" && "text-emerald-600",
                  delta.trend === "down" && "text-rose-600",
                  delta.trend === "flat" && "text-muted-foreground"
                )}
              >
                {delta.trend === "up" && "▲"}
                {delta.trend === "down" && "▼"}
                {delta.trend === "flat" && "→"}
                {delta.value}
              </span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          )}
          {footer && <div className="mt-2 text-xs">{footer}</div>}
        </div>
        <div
          className={cn(
            "flex-shrink-0 size-11 rounded-xl flex items-center justify-center",
            iconClass ?? "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
