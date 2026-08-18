"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-8", className)}>
      <div>
        <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm md:text-[15px] font-medium text-muted-foreground mt-1.5">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
