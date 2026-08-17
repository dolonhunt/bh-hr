"use client";

import { cn } from "@/lib/utils";

/**
 * BH HR Brand Logo — full logo for expanded sidebar, login, documents, settings
 * Uses the official BH full logo from /bh-logo.png
 */
export function BrandLogo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <img
      src="/bh-logo.png"
      alt="BH HR — Beyond Headlines"
      className={cn("h-8 w-auto object-contain", inverted && "brightness-0 invert", className)}
    />
  );
}

/**
 * BH Brand Mark — the "B" mark for collapsed sidebar, mobile header, favicon, compact placements
 * Uses the official BH B mark from /bh-mark.png
 */
export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-12 w-auto",
  };
  return (
    <img
      src="/bh-mark.png"
      alt="BH"
      className={cn(sizes[size], "object-contain", className)}
    />
  );
}
