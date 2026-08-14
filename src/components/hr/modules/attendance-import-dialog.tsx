"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn, downloadBlob } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

type Step = "upload" | "preview" | "importing" | "results";

type PreviewRow = {
  row: number;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  error?: string;
};

type ImportResult = {
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
};

const REQUIRED_HEADERS = [
  "employee id",
  "date",
  "check in",
  "check out",
  "status",
] as const;

const SAMPLE_CSV = `Employee ID,Date,Check In,Check Out,Status
EMP001,2026-08-13,09:05,18:15,PRESENT
EMP002,2026-08-13,09:30,18:00,LATE
EMP003,2026-08-13,,,ABSENT
EMP004,2026-08-13,08:55,17:30,PRESENT
EMP005,2026-08-13,09:00,13:00,HALF_DAY
`;

export function AttendanceImportDialog({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when the dialog closes
  function handleOpenChange(v: boolean) {
    if (!v) {
      // small delay so the closing transition doesn't show stale state
      setTimeout(() => resetAll(), 200);
    }
    onOpenChange(v);
  }

  function resetAll() {
    setStep("upload");
    setFile(null);
    setPreviewRows([]);
    setPreviewErrors([]);
    setImportProgress(0);
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ----- File selection + parsing -----

  const onSelectFile = useCallback(async (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv") && f.type !== "text/csv") {
      toast.error("Please select a .csv file.");
      return;
    }
    setFile(f);
    setErrorMsg("");
    try {
      const text = await f.text();
      const parsed = parseCsvClient(text);
      if (parsed.errors.length > 0) {
        setPreviewErrors(parsed.errors);
        setPreviewRows([]);
        setStep("preview");
        return;
      }
      setPreviewErrors([]);
      setPreviewRows(parsed.rows.slice(0, 10));
      setStep("preview");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to read the file.");
      setPreviewRows([]);
      setPreviewErrors([]);
      setStep("preview");
    }
  }, []);

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    onSelectFile(e.target.files?.[0] ?? null);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onSelectFile(f);
  }

  function downloadTemplate() {
    downloadBlob(
      new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" }),
      "attendance-import-template.csv"
    );
    toast.success("Template downloaded.");
  }

  // ----- Import (server POST) -----

  async function runImport() {
    if (!file) return;
    setStep("importing");
    setImportProgress(5);
    // Fake progress to give visual feedback while the server is busy.
    const tick = setInterval(() => {
      setImportProgress((p) => (p >= 90 ? p : p + Math.max(1, (90 - p) / 6)));
    }, 250);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/attendance/import", {
        method: "POST",
        body: fd,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data?.error || "Import failed.");
      }
      setImportProgress(100);
      setResult(data as ImportResult);
      setStep("results");
      const total = (data.imported ?? 0) + (data.updated ?? 0);
      if (total > 0) {
        toast.success(
          `Imported ${data.imported} new · ${data.updated} updated` +
            (data.failed ? ` · ${data.failed} failed` : "")
        );
      } else {
        toast.error("No rows imported.");
      }
      onImported?.();
    } catch (err: any) {
      setErrorMsg(err?.message || "Import failed.");
      setStep("preview");
      toast.error(err?.message || "Import failed.");
    } finally {
      clearInterval(tick);
    }
  }

  // ----- Derived values -----

  const totalParsedRows = useMemo(() => {
    // we only kept first 10 for preview; total is in the file — re-derive
    // from previewErrors' last "X rows" message? Instead we count from the
    // file lazily when needed. For the preview UI we just show previewRows.
    return previewRows.length;
  }, [previewRows.length]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            Import Attendance from CSV
          </DialogTitle>
          <DialogDescription>
            Bulk import attendance records (check-in/out + status) for one or
            more employees. Existing records for the same employee + date are
            updated.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {(["upload", "preview", "importing", "results"] as Step[]).map(
            (s, idx) => {
              const stepIdx = (["upload", "preview", "importing", "results"] as Step[]).indexOf(step);
              const isDone = idx < stepIdx;
              const isCurrent = idx === stepIdx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors",
                      isCurrent && "bg-primary text-primary-foreground",
                      isDone && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      !isCurrent && !isDone && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <span className="size-3.5 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span className="capitalize">{labelForStep(s)}</span>
                  </div>
                  {idx < 3 && <ArrowRight className="size-3 text-muted-foreground/60" />}
                </div>
              );
            }
          )}
        </div>

        {/* Step 1 — Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="size-7" />
              </div>
              <div>
                <div className="font-semibold">
                  Drag &amp; drop a CSV file here
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  or click to browse — accepts <code>.csv</code> only
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileInput}
              />
            </label>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
              <FileText className="size-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground mb-1">
                  Expected columns
                </div>
                <code className="text-[11px]">
                  Employee ID, Date, Check In, Check Out, Status
                </code>
                <div className="mt-1">
                  Date format: <code>YYYY-MM-DD</code>. Times:{" "}
                  <code>HH:MM</code> (24h). Status: PRESENT, ABSENT, LATE,
                  LEAVE, HALF_DAY, REMOTE, HOLIDAY.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-1.5"
              >
                <Download className="size-4" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-primary" />
                <span className="font-medium truncate max-w-[200px]">
                  {file?.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({(file?.size ?? 0) / 1024 < 1024
                    ? `${Math.max(1, Math.round((file?.size ?? 0) / 1024))} KB`
                    : `${(file?.size ?? 0) / 1024 / 1024} MB`})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                Choose another file
              </Button>
            </div>

            {previewErrors.length > 0 ? (
              <Card className="p-4 border-rose-500/30 bg-rose-500/5">
                <div className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">
                      Cannot import — file format errors
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs">
                      {previewErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Showing first{" "}
                  <span className="font-medium text-foreground">
                    {previewRows.length}
                  </span>{" "}
                  rows from the file. Review the data, then click{" "}
                  <span className="font-medium text-foreground">Import</span>{" "}
                  to process all rows.
                </div>
                <Card className="border-border/60 shadow-soft overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="w-12 text-right">#</TableHead>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((r) => (
                          <TableRow key={r.row} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground text-right tabular-nums">
                              {r.row}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {r.employeeId || (
                                <span className="text-rose-600">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {r.checkIn || "—"}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {r.checkOut || "—"}
                            </TableCell>
                            <TableCell className="text-xs">{r.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
                {errorMsg && (
                  <div className="text-xs text-rose-600">{errorMsg}</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3 — Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center text-center gap-2">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="font-semibold">Importing attendance records…</div>
              <div className="text-sm text-muted-foreground">
                Please wait while we process your file.
              </div>
            </div>
            <Progress value={importProgress} className="h-2" />
            <div className="text-center text-xs text-muted-foreground tabular-nums">
              {Math.round(importProgress)}%
            </div>
          </div>
        )}

        {/* Step 4 — Results */}
        {step === "results" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat
                icon={CheckCircle2}
                label="Imported"
                value={result.imported}
                color="emerald"
              />
              <ResultStat
                icon={RotateCcw}
                label="Updated"
                value={result.updated}
                color="amber"
              />
              <ResultStat
                icon={XCircle}
                label="Failed"
                value={result.failed}
                color="rose"
              />
            </div>

            {result.errors.length > 0 && (
              <Card className="border-border/60 shadow-soft overflow-hidden">
                <div className="px-3 py-2 bg-rose-500/5 border-b border-border/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Error details ({result.errors.length})
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-16 text-right">Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-right tabular-nums font-mono">
                            {e.row}
                          </TableCell>
                          <TableCell className="text-xs text-rose-700 dark:text-rose-300">
                            {e.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {result.errors.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-md p-3">
                <CheckCircle2 className="size-4 flex-shrink-0" />
                All rows imported successfully — no errors.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetAll}>
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={previewErrors.length > 0 || previewRows.length === 0}
                className="gap-1.5"
              >
                <UploadCloud className="size-4" />
                Import {totalParsedRows > 0 ? "all rows" : ""}
              </Button>
            </>
          )}
          {step === "importing" && (
            <Button disabled>
              <Loader2 className="size-4 mr-1.5 animate-spin" /> Importing…
            </Button>
          )}
          {step === "results" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Sub-components
// =========================================================

function ResultStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose";
}) {
  return (
    <Card className="p-3 sm:p-4 border-border/60 shadow-soft text-center">
      <div
        className={cn(
          "mx-auto size-9 rounded-xl flex items-center justify-center mb-2",
          color === "emerald" && "bg-emerald-500/10 text-emerald-600",
          color === "amber" && "bg-amber-500/10 text-amber-600",
          color === "rose" && "bg-rose-500/10 text-rose-600"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </div>
    </Card>
  );
}

function labelForStep(step: Step) {
  switch (step) {
    case "upload":
      return "Upload";
    case "preview":
      return "Preview";
    case "importing":
      return "Import";
    case "results":
      return "Results";
  }
}

// =========================================================
// Client-side CSV parser (mirrors server logic for preview)
// =========================================================

function parseCsvClient(text: string): {
  rows: PreviewRow[];
  errors: string[];
} {
  const normalized = text.replace(/\r\n?/g, "\n");
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        records.push(row);
        row = [];
        field = "";
      } else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  const cleaned = records.filter(
    (r) => r.length > 0 && r.some((c) => c.trim() !== "")
  );
  if (cleaned.length === 0) {
    return { rows: [], errors: ["The file is empty."] };
  }
  const headers = cleaned[0].map((h) => h.toLowerCase().trim());
  const errors: string[] = [];
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`Missing required column "${required}".`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const colEmpId = headers.indexOf("employee id");
  const colDate = headers.indexOf("date");
  const colIn = headers.indexOf("check in");
  const colOut = headers.indexOf("check out");
  const colStatus = headers.indexOf("status");

  const rows: PreviewRow[] = cleaned.slice(1).map((r, idx) => {
    const get = (i: number) => (r[i] ?? "").trim();
    return {
      row: idx + 2,
      employeeId: get(colEmpId),
      date: get(colDate),
      checkIn: get(colIn),
      checkOut: get(colOut),
      status: get(colStatus).toUpperCase(),
    };
  });
  return { rows, errors };
}
