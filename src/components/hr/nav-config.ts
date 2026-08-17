import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  TrendingUp,
  Briefcase,
  FileText,
  BarChart3,
  History,
  Settings,
  Package,
  GraduationCap,
  CalendarClock,
  MessageSquare,
  Receipt,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/store";

export interface NavItem {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: "live";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "HR overview & KPIs",
      },
      {
        key: "employees",
        label: "Employees",
        icon: Users,
        description: "Directory & profiles",
      },
      {
        key: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        description: "Daily check-in/out",
      },
      {
        key: "leave",
        label: "Leave",
        icon: CalendarDays,
        description: "Requests & approvals",
      },
      {
        key: "payroll",
        label: "Payroll",
        icon: Wallet,
        description: "Salaries & payslips",
      },
      {
        key: "performance",
        label: "Performance",
        icon: TrendingUp,
        description: "Reviews & analytics",
      },
      {
        key: "recruitment",
        label: "Recruitment",
        icon: Briefcase,
        description: "Jobs & candidates",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        key: "interviews",
        label: "Interviews",
        icon: CalendarClock,
        description: "Schedule & track",
      },
      {
        key: "feedback",
        label: "Feedback",
        icon: MessageSquare,
        description: "Surveys & feedback",
      },
      {
        key: "documents",
        label: "Documents",
        icon: FileText,
        description: "Templates & generation",
        badge: "live",
      },
      {
        key: "training",
        label: "Training",
        icon: GraduationCap,
        description: "Courses & development",
      },
      {
        key: "expenses",
        label: "Expenses",
        icon: Receipt,
        description: "Track & approve",
      },
      {
        key: "timesheets",
        label: "Timesheets",
        icon: Clock,
        description: "Time tracking",
      },
      {
        key: "assets",
        label: "Assets",
        icon: Package,
        description: "Equipment & assets",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        key: "reports",
        label: "Reports",
        icon: BarChart3,
        description: "Export & analytics",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        key: "audit",
        label: "Audit Log",
        icon: History,
        description: "Activity tracking",
      },
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        description: "Organization & config",
      },
    ],
  },
];

// Flat list for backward compatibility (command palette, topbar lookup, etc.)
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
