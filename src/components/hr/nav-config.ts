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

export const NAV_ITEMS: NavItem[] = [
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
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    description: "Templates & generation",
    badge: "live",
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    description: "Export & analytics",
  },
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
];
