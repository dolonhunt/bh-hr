"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModuleKey =
  | "dashboard"
  | "employees"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance"
  | "recruitment"
  | "interviews"
  | "feedback"
  | "documents"
  | "reports"
  | "audit"
  | "settings"
  | "assets"
  | "training"
  | "search";

export type EmployeeView = "list" | "grid" | "new" | "profile";

export interface AppState {
  // Auth gate
  isAuthed: boolean;
  authUser: { id: string; name: string; email: string; role: string } | null;
  setAuthed: (v: boolean, user?: AppState["authUser"]) => void;
  logout: () => void;

  // Navigation
  activeModule: ModuleKey;
  setModule: (m: ModuleKey) => void;

  // Employee module state
  employeeView: EmployeeView;
  selectedEmployeeId: string | null;
  setEmployeeView: (v: EmployeeView) => void;
  openEmployee: (id: string) => void;

  // Documents module tab
  documentsTab:
    | "all"
    | "templates"
    | "generated"
    | "email-history"
    | "approval-queue";
  setDocumentsTab: (t: AppState["documentsTab"]) => void;

  // Global command palette
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  // Sidebar collapse (desktop)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Mobile sidebar open
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  // Global quick action dialog
  quickAction: string | null;
  setQuickAction: (action: string | null) => void;

  // Keyboard shortcuts help dialog
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (v: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      authUser: null,
      setAuthed: (v, user) =>
        set({ isAuthed: v, authUser: user ?? null }),
      logout: () =>
        set({
          isAuthed: false,
          authUser: null,
          activeModule: "dashboard",
        }),

      activeModule: "dashboard",
      setModule: (m) => set({ activeModule: m }),

      employeeView: "list",
      selectedEmployeeId: null,
      setEmployeeView: (v) => set({ employeeView: v }),
      openEmployee: (id) =>
        set({
          selectedEmployeeId: id,
          employeeView: "profile",
          activeModule: "employees",
        }),

      documentsTab: "all",
      setDocumentsTab: (t) => set({ documentsTab: t }),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      mobileSidebarOpen: false,
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

      quickAction: null,
      setQuickAction: (action) => set({ quickAction: action }),

      shortcutsHelpOpen: false,
      setShortcutsHelpOpen: (v) => set({ shortcutsHelpOpen: v }),
    }),
    {
      name: "teamhub-hr-store",
      partialize: (state) => ({
        isAuthed: state.isAuthed,
        authUser: state.authUser,
        activeModule: state.activeModule,
        sidebarCollapsed: state.sidebarCollapsed,
        employeeView: state.employeeView,
        documentsTab: state.documentsTab,
      }),
    }
  )
);
