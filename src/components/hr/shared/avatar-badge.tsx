"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, colorFromString, initials } from "@/lib/utils";

interface AvatarBadgeProps {
  name?: string | null;
  photo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-20 text-2xl",
};

export function AvatarBadge({
  name,
  photo,
  size = "md",
  className,
}: AvatarBadgeProps) {
  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        "border border-border/80 shadow-soft",
        !photo && colorFromString(name ?? "?"),
        className
      )}
    >
      {photo ? (
        <img src={photo} alt={name ?? "avatar"} className="object-cover" />
      ) : (
        <AvatarFallback
          className={cn(
            "font-semibold",
            colorFromString(name ?? "?"),
            "bg-transparent"
          )}
        >
          {initials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
