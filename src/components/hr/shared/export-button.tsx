"use client";

import { useState } from "react";
import { Download, ChevronDown, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ExportFormat = "csv" | "excel";

interface ExportButtonProps {
  module: string;
  filters?: Record<string, any>;
  className?: string;
  /** Optional label override. Defaults to "Export". */
  label?: string;
}

/**
 * Reusable dropdown export button. Renders a small outline button with a
 * Download icon and a dropdown offering CSV + Excel options. The button
 * constructs a query string from the supplied `filters`, hits the generic
 * `/api/export` endpoint, and triggers a browser download via a temporary
 * anchor element.
 */
export function ExportButton({
  module,
  filters = {},
  className,
  label = "Export",
}: ExportButtonProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  function triggerDownload(format: ExportFormat) {
    const params = new URLSearchParams();
    params.set("module", module);
    params.set("format", format);
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    const url = `/api/export?${params.toString()}`;

    setLoading(format);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      // The server sets Content-Disposition with the filename, so we don't
      // strictly need to set `download` here, but setting it improves
      // browser compatibility.
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Exported ${module} as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed");
    } finally {
      // Reset the loading state shortly after to let the spinner show.
      window.setTimeout(() => setLoading(null), 500);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
          disabled={loading !== null}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">{loading ? "Exporting…" : label}</span>
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => triggerDownload("csv")}
          className="cursor-pointer"
        >
          <FileText className="size-4 mr-2 text-primary" />
          <span>CSV</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            .csv
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => triggerDownload("excel")}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="size-4 mr-2 text-primary" />
          <span>Excel</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            .xls
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
