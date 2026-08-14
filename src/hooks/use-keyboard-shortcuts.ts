"use client";

import { useEffect } from "react";
import { useApp, type ModuleKey } from "@/lib/store";

const SHORTCUTS: Record<string, { module?: ModuleKey; action?: string; label: string }> = {
  // g + <key> — go to module
  gd: { module: "dashboard", label: "Dashboard" },
  ge: { module: "employees", label: "Employees" },
  ga: { module: "attendance", label: "Attendance" },
  gl: { module: "leave", label: "Leave" },
  gp: { module: "payroll", label: "Payroll" },
  gf: { module: "performance", label: "Performance" },
  gr: { module: "recruitment", label: "Recruitment" },
  gt: { module: "documents", label: "Documents" },
  go: { module: "reports", label: "Reports" },
  gu: { module: "audit", label: "Audit Log" },
  gs: { module: "settings", label: "Settings" },
  // single-key actions (only when not typing in an input)
  n: { action: "add-employee", label: "Add Employee" },
  d: { action: "generate-document", label: "Generate Document" },
  b: { action: "bulk-generate", label: "Bulk Generate" },
};

export function useKeyboardShortcuts() {
  const setModule = useApp((s) => s.setModule);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const setShortcutsHelpOpen = useApp((s) => s.setShortcutsHelpOpen);
  const isAuthed = useApp((s) => s.isAuthed);

  useEffect(() => {
    if (!isAuthed) return;

    let firstKey = "";
    let firstKeyTimer: ReturnType<typeof setTimeout> | null = null;

    function isTyping() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable ||
        el.getAttribute("role") === "combobox" ||
        el.getAttribute("role") === "textbox"
      );
    }

    function handler(e: KeyboardEvent) {
      // Cmd/Ctrl + K → command palette (handled elsewhere, but ensure not blocked)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        return;
      }

      // Don't intercept if typing in a field
      if (isTyping()) return;

      // Don't intercept if modifier keys are pressed (except for cmd+k above)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Escape → reset first key
      if (key === "escape") {
        firstKey = "";
        return;
      }

      // ? → toggle help
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
        return;
      }

      // Two-key sequence: g + <key>
      if (firstKey === "g") {
        const shortcut = SHORTCUTS[`g${key}`];
        if (shortcut?.module) {
          e.preventDefault();
          setModule(shortcut.module);
        }
        firstKey = "";
        if (firstKeyTimer) clearTimeout(firstKeyTimer);
        return;
      }

      // Single-key actions
      const single = SHORTCUTS[key];
      if (single?.action && firstKey === "") {
        e.preventDefault();
        setQuickAction(single.action);
        return;
      }

      // Set first key (only "g" triggers a sequence)
      if (key === "g" && firstKey === "") {
        firstKey = "g";
        if (firstKeyTimer) clearTimeout(firstKeyTimer);
        firstKeyTimer = setTimeout(() => {
          firstKey = "";
        }, 800);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (firstKeyTimer) clearTimeout(firstKeyTimer);
    };
  }, [isAuthed, setModule, setQuickAction, setShortcutsHelpOpen]);
}

