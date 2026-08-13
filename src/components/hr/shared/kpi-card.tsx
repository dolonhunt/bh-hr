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
        "relative p-5 gap-0 overflow-hidden border-border/60 shadow-soft transition-all group",
        onClick && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 hover:border-border"
      )}
      onClick={onClick}
    >
      {/* Subtle accent bar on top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
          iconClass?.includes("emerald") && "bg-emerald-500",
          iconClass?.includes("amber") && "bg-amber-500",
          iconClass?.includes("rose") && "bg-rose-500",
          iconClass?.includes("violet") && "bg-violet-500",
          iconClass?.includes("teal") && "bg-teal-500",
          iconClass?.includes("primary") && "bg-primary",
          !iconClass && "bg-primary"
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
            {label}
          </div>
          <div className="mt-2.5 text-[26px] leading-none font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {delta && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-md",
                  delta.trend === "up" && "text-emerald-700 bg-emerald-500/10",
                  delta.trend === "down" && "text-rose-700 bg-rose-500/10",
                  delta.trend === "flat" && "text-muted-foreground bg-muted"
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
            "flex-shrink-0 size-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            iconClass ?? "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
