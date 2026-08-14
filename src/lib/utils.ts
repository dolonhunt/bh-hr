import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = "BDT") {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const symbol = currency === "BDT" ? "৳" : currency === "USD" ? "$" : "";
  return `${symbol}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatDate(
  date: string | Date | null | undefined,
  fmt: "short" | "long" | "datetime" | "month" = "short"
) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  if (fmt === "short") {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (fmt === "long") {
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (fmt === "datetime") {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (fmt === "month") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString();
}

export function relativeTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d, "short");
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar color from string seed (stable per-employee)
export function colorFromString(str: string) {
  const palette = [
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function statusColor(status: string) {
  const s = status.toUpperCase();
  if (["ACTIVE", "PRESENT", "APPROVED", "PAID", "SENT", "DELIVERED", "HIRED", "ISSUED", "APPROVED"].includes(s))
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  if (["PENDING", "DRAFT", "QUEUED", "ON_HOLD", "SCREENING", "APPLIED", "PROBATION"].includes(s))
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20";
  if (["LATE", "REJECTED", "FAILED", "BOUNCED", "TERMINATED", "CANCELLED", "ARCHIVED"].includes(s))
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20";
  if (["SHORTLISTED", "INTERVIEW", "SELECTED", "OFFER", "PENDING_APPROVAL", "REMOTE", "HALF_DAY"].includes(s))
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20";
  return "bg-muted text-muted-foreground border-border";
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
