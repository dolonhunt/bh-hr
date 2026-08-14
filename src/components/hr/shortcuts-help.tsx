"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: ["g", "d"], label: "Go to Dashboard" },
  { keys: ["g", "e"], label: "Go to Employees" },
  { keys: ["g", "a"], label: "Go to Attendance" },
  { keys: ["g", "l"], label: "Go to Leave" },
  { keys: ["g", "p"], label: "Go to Payroll" },
  { keys: ["g", "f"], label: "Go to Performance" },
  { keys: ["g", "r"], label: "Go to Recruitment" },
  { keys: ["g", "t"], label: "Go to Documents" },
  { keys: ["g", "o"], label: "Go to Reports" },
  { keys: ["g", "u"], label: "Go to Audit Log" },
  { keys: ["g", "s"], label: "Go to Settings" },
  { keys: ["n"], label: "Add Employee" },
  { keys: ["d"], label: "Generate Document" },
  { keys: ["b"], label: "Bulk Generate" },
  { keys: ["⌘", "K"], label: "Open Command Palette" },
  { keys: ["?"], label: "Show this help" },
];

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" /> Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press these keys anywhere outside of input fields to navigate or
            trigger actions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm text-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && (
                      <span className="text-muted-foreground text-xs">+</span>
                    )}
                    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold text-foreground">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Tip: Two-key sequences (like <kbd className="font-mono">g</kbd> then{" "}
          <kbd className="font-mono">d</kbd>) must be pressed within 800ms.
        </div>
      </DialogContent>
    </Dialog>
  );
}
