"use client";

import { useApp } from "@/lib/store";
import { NAV_ITEMS } from "./nav-config";
import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Menu,
  Plus,
  Search,
  Settings,
  LogOut,
  User as UserIcon,
  Command,
  ChevronDown,
  Keyboard,
  Layers,
  Wallet,
  FileStack,
  FileText,
  CalendarPlus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { NotificationCenter } from "./notification-center";

export function Topbar() {
  const authUser = useApp((s) => s.authUser);
  const logout = useApp((s) => s.logout);
  const activeModule = useApp((s) => s.activeModule);
  const setMobileSidebarOpen = useApp((s) => s.setMobileSidebarOpen);
  const setCommandOpen = useApp((s) => s.setCommandOpen);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const setModule = useApp((s) => s.setModule);
  const setShortcutsHelpOpen = useApp((s) => s.setShortcutsHelpOpen);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const current = NAV_ITEMS.find((n) => n.key === activeModule);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setPendingCount(d?.kpis?.pendingLeave ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/notifications?unreadOnly=true");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUnreadNotifs(d?.unreadCount ?? 0);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [notifOpen]);

  const badgeCount = unreadNotifs > 0 ? unreadNotifs : pendingCount;

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-border/30 bg-background/80 backdrop-blur-md px-6 md:px-8 flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shadow-soft"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb / page title */}
      <div className="flex items-center gap-3 min-w-0">
        {current && (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-soft hidden sm:flex">
                <current.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold leading-tight truncate tracking-tight">
                {current.label}
              </div>
              <div className="text-xs font-medium text-muted-foreground truncate hidden sm:block">
                {current.description}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl mx-auto hidden md:block">
        <button
          onClick={() => setCommandOpen(true)}
          className="group w-full flex items-center gap-3 rounded-[16px] border border-border/40 neu-inset px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 transition-colors"
        >
          <Search className="size-[18px]" />
          <span className="flex-1 text-left">Search employees, documents…</span>
          <kbd className="hidden md:inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
            <Command className="size-3" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Mobile search */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden shadow-soft border-border/30"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
        >
          <Search className="size-5" />
        </Button>

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="default" className="gap-2 px-5 rounded-[14px] bg-primary text-white shadow-soft glow-coral hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="size-[18px]" />
              <span className="hidden sm:inline font-bold">Quick Add</span>
              <ChevronDown className="size-4 opacity-70 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[16px] border-border/30 shadow-card p-2">
            <DropdownMenuLabel className="font-bold px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/30 my-1" />
            <DropdownMenuItem onClick={() => setQuickAction("add-employee")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <UserIcon className="size-[18px] mr-2.5 text-primary" /> Add Employee
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("generate-document")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <FileText className="size-[18px] mr-2.5 text-purple" /> Generate Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("bulk-generate")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <FileStack className="size-[18px] mr-2.5 text-purple" /> Bulk Generate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("create-payslip")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <Wallet className="size-[18px] mr-2.5 text-info" /> Create Payslip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("payroll-batch-create")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <Layers className="size-[18px] mr-2.5 text-info" /> Batch Payroll
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-attendance")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <CalendarPlus className="size-[18px] mr-2.5 text-success" /> Add Attendance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-leave")} className="font-medium rounded-lg focus:bg-muted/60 p-2.5">
              <Plus className="size-[18px] mr-2.5 text-warning" /> Add Leave
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <div className="hidden sm:block">
            <ThemeToggle />
        </div>

        {/* Notifications */}
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-[14px] shadow-soft border-border/30 hover:bg-muted/60"
          aria-label="Notifications"
          onClick={() => setNotifOpen(true)}
        >
          <Bell className="size-5 text-secondary-foreground" />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-soft">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Button>

        <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />

        <div className="w-[1px] h-8 bg-border/40 mx-1 hidden md:block" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-[16px] p-1.5 pr-3 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/40 hover:shadow-soft">
              <Avatar className="size-9 rounded-[12px] shadow-soft border-2 border-background">
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple text-white text-xs font-bold">
                  {initials(authUser?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold leading-tight">
                  {authUser?.name}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">HR Admin</div>
              </div>
              <ChevronDown className="size-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-[16px] border-border/30 shadow-card p-2">
            <DropdownMenuLabel className="p-3">
              <div className="font-bold text-base">{authUser?.name}</div>
              <div className="text-xs font-medium text-muted-foreground">
                {authUser?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/30" />
            <DropdownMenuItem onClick={() => setModule("settings")} className="font-medium rounded-lg p-2.5">
              <Settings className="size-[18px] mr-2.5 text-muted-foreground" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModule("audit")} className="font-medium rounded-lg p-2.5">
              <UserIcon className="size-[18px] mr-2.5 text-muted-foreground" /> Activity Log
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/30" />
            <DropdownMenuItem
              className="font-bold text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg p-2.5"
              onClick={logout}
            >
              <LogOut className="size-[18px] mr-2.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
