"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useApp } from "@/lib/store";
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
import { CommandPalette } from "./command-palette";
import { QuickActions } from "./quick-actions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelp } from "./shortcuts-help";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

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
};

export function AppShell() {
  const activeModule = useApp((s) => s.activeModule);
  const helpOpen = useApp((s) => s.shortcutsHelpOpen);
  const setHelpOpen = useApp((s) => s.setShortcutsHelpOpen);
  useKeyboardShortcuts();

  const ModuleComponent = useMemo(
    () => MODULE_COMPONENTS[activeModule] ?? DashboardModule,
    [activeModule]
  );

  return (
    <div className="min-h-screen flex bg-background bg-dots">
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
        <footer className="mt-auto border-t border-border/60 bg-card/60 backdrop-blur-sm px-6 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">BH HR</span>
            <span className="opacity-50">·</span>
            <span>HR Operations Console v1.0</span>
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
