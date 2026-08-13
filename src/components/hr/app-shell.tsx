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
import { DocumentsModule } from "./modules/documents";
import { ReportsModule } from "./modules/reports";
import { AuditModule } from "./modules/audit";
import { SettingsModule } from "./modules/settings";
import { CommandPalette } from "./command-palette";
import { QuickActions } from "./quick-actions";

export function AppShell() {
  const activeModule = useApp((s) => s.activeModule);

  return (
    <div className="min-h-screen flex bg-background bg-dots">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-0">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
            {activeModule === "dashboard" && <DashboardModule />}
            {activeModule === "employees" && <EmployeesModule />}
            {activeModule === "attendance" && <AttendanceModule />}
            {activeModule === "leave" && <LeaveModule />}
            {activeModule === "payroll" && <PayrollModule />}
            {activeModule === "performance" && <PerformanceModule />}
            {activeModule === "recruitment" && <RecruitmentModule />}
            {activeModule === "documents" && <DocumentsModule />}
            {activeModule === "reports" && <ReportsModule />}
            {activeModule === "audit" && <AuditModule />}
            {activeModule === "settings" && <SettingsModule />}
          </div>
        </main>
        <footer className="mt-auto border-t border-border/60 bg-card/60 backdrop-blur-sm px-6 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">TeamHub HR</span>
            <span className="opacity-50">·</span>
            <span>HR Operations Console v1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Northwind Labs</span>
            <span className="hidden sm:inline opacity-50">·</span>
            <span className="hidden sm:inline">All HR data is encrypted at rest</span>
          </div>
        </footer>
      </div>

      <CommandPalette />
      <QuickActions />
    </div>
  );
}
