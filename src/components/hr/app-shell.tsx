"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useApp, type ModuleKey } from "@/lib/store";
import { DashboardModule } from "./modules/dashboard";
import { EmployeesModule } from "./modules/employees";
import { AttendanceModule } from "./modules/attendance";
import { LeaveModule } from "./modules/leave";
import { PayrollModule } from "./modules/payroll";
import { PerformanceModule } from "./modules/performance";
import { RecruitmentModule } from "./modules/recruitment";
import { InterviewsModule } from "./modules/interviews";
import { SurveysModule } from "./modules/surveys";
import { DocumentsModule } from "./modules/documents";
import { ReportsModule } from "./modules/reports";
import { AuditModule } from "./modules/audit";
import { SettingsModule } from "./modules/settings";
import { AssetsModule } from "./modules/assets";
import { TrainingModule } from "./modules/training";
import { ExpensesModule } from "./modules/expenses";
import { TimesheetsModule } from "./modules/timesheets";
import { AnnouncementsModule } from "./modules/announcements";
import { MyHrModule } from "./modules/my-hr";
import { CommandPalette } from "./command-palette";
import { QuickActions } from "./quick-actions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelp } from "./shortcuts-help";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: DashboardModule,
  employees: EmployeesModule,
  attendance: AttendanceModule,
  leave: LeaveModule,
  payroll: PayrollModule,
  performance: PerformanceModule,
  recruitment: RecruitmentModule,
  interviews: InterviewsModule,
  feedback: SurveysModule,
  documents: DocumentsModule,
  reports: ReportsModule,
  audit: AuditModule,
  settings: SettingsModule,
  assets: AssetsModule,
  training: TrainingModule,
  expenses: ExpensesModule,
  timesheets: TimesheetsModule,
  announcements: AnnouncementsModule,
  myhr: MyHrModule,
};

// ============================================================
// URL sync — makes module navigation deep-linkable:
//   * On first load, consumes ?module= & ?employee= & ?tab=
//     (so links from notifications / bookmarks / pasted URLs land
//     on the right view).
//   * Every subsequent navigation pushState's the equivalent URL,
//     so browser Back/Forward and refresh keep your place.
// ============================================================
function useUrlSync() {
  const activeModule = useApp((s) => s.activeModule);
  const documentsTab = useApp((s) => s.documentsTab);
  const employeeView = useApp((s) => s.employeeView);
  const selectedEmployeeId = useApp((s) => s.selectedEmployeeId);
  const hydrated = useRef(false);

  function consumeParams(sp: URLSearchParams) {
    const employee = sp.get("employee");
    const moduleKey = sp.get("module") as ModuleKey | null;
    const tab = sp.get("tab");
    const st = useApp.getState();
    if (employee) {
      st.openEmployee(employee);
    } else if (moduleKey && moduleKey in MODULE_COMPONENTS) {
      st.setModule(moduleKey);
    }
    if (
      tab &&
      [
        "all",
        "templates",
        "generated",
        "email-history",
        "message-history",
        "approval-queue",
      ].includes(tab)
    ) {
      st.setDocumentsTab(tab as never);
    }
  }

  // --- Initial hydration: apply URL params once ---
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.toString()) consumeParams(sp);
    // Normalize the URL for the current state (replace, no history entry).
    const url = buildUrl(
      useApp.getState().activeModule,
      useApp.getState().employeeView,
      useApp.getState().selectedEmployeeId,
      useApp.getState().documentsTab
    );
    window.history.replaceState(null, "", url);
  }, []);

  // --- Push URL on navigation state changes ---
  useEffect(() => {
    // Read fresh state: the hydration effect may have mutated the store
    // just before this effect ran with stale closure values.
    const st = useApp.getState();
    const url = buildUrl(st.activeModule, st.employeeView, st.selectedEmployeeId, st.documentsTab);
    if (`${window.location.pathname}${window.location.search}` === url) return;
    window.history.pushState(null, "", url);
  }, [activeModule, employeeView, selectedEmployeeId, documentsTab]);

  // --- Back/Forward: consume the popped entry's params ---
  useEffect(() => {
    function onPop() {
      consumeParams(new URLSearchParams(window.location.search));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}

function buildUrl(
  activeModule: string,
  employeeView: string,
  selectedEmployeeId: string | null,
  documentsTab: string
): string {
  const sp = new URLSearchParams();
  if (activeModule && activeModule !== "dashboard") sp.set("module", activeModule);
  if (activeModule === "employees" && employeeView === "profile" && selectedEmployeeId)
    sp.set("employee", selectedEmployeeId);
  if (activeModule === "documents") sp.set("tab", documentsTab);
  const qs = sp.toString();
  return `${window.location.pathname}${qs ? `?${qs}` : ""}`;
}

export function AppShell() {
  useUrlSync();
  const activeModule = useApp((s) => s.activeModule);
  const helpOpen = useApp((s) => s.shortcutsHelpOpen);
  const setHelpOpen = useApp((s) => s.setShortcutsHelpOpen);
  useKeyboardShortcuts();

  const ModuleComponent = useMemo(
    () => MODULE_COMPONENTS[activeModule] ?? DashboardModule,
    [activeModule]
  );

  return (
    <div className="h-screen overflow-hidden flex bg-background bg-dots">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-0">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ModuleComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <footer className="mt-auto border-t border-border/50 bg-card/70 backdrop-blur-sm px-6 py-3 text-xs text-foreground/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-medium text-foreground">BH HR</span>
            <span className="opacity-50">·</span>
            <span>Beyond Headlines · v1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Beyond Headlines</span>
            <span className="hidden sm:inline opacity-50">·</span>
            <span className="hidden sm:inline">All HR data is encrypted at rest</span>
          </div>
        </footer>
      </div>

      <CommandPalette />
      <QuickActions />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
