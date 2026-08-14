"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <Card
      className={`flex flex-col items-center justify-center text-center p-10 border-dashed border-border/60 bg-muted/20 ${className ?? ""}`}
    >
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div className="font-semibold text-foreground mb-1">{title}</div>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </Card>
  );
}
