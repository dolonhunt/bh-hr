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

  // Poll notification unread count every 60s while the app is open.
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

  // Combined badge: unread notifications take precedence (they're
  // higher-signal than the raw pending-leave count). When no
  // unread notifications exist we fall back to the legacy
  // pending-leave count so the bell still surfaces action items.
  const badgeCount = unreadNotifs > 0 ? unreadNotifs : pendingCount;

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/85 backdrop-blur-md px-4 md:px-6 flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb / page title */}
      <div className="flex items-center gap-2 min-w-0">
        {current && (
          <>
            <current.icon className="size-5 text-primary hidden sm:block" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                {current.label}
              </div>
              <div className="text-[11px] text-muted-foreground truncate hidden sm:block">
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
          className="group w-full flex items-center gap-2 rounded-lg border border-border/50 neu-inset px-3 py-2 text-sm text-muted-foreground hover:border-primary/30 transition"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search employees, documents…</span>
          <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command className="size-3" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
        >
          <Search className="size-5" />
        </Button>

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown className="size-3.5 opacity-70 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQuickAction("add-employee")}>
              <UserIcon className="size-4 mr-2" /> Add Employee
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("generate-document")}>
              <FileText className="size-4 mr-2" /> Generate Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("bulk-generate")}>
              <FileStack className="size-4 mr-2" /> Bulk Generate Documents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("create-payslip")}>
              <Wallet className="size-4 mr-2" /> Create Payslip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("payroll-batch-create")}>
              <Layers className="size-4 mr-2" /> Batch Create Payroll
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-attendance")}>
              <CalendarPlus className="size-4 mr-2" /> Add Attendance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-leave")}>
              <Plus className="size-4 mr-2" /> Add Leave
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Keyboard shortcuts help */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 hidden sm:flex"
          aria-label="Keyboard shortcuts"
          onClick={() => setShortcutsHelpOpen(true)}
        >
          <Keyboard className="size-5" />
        </Button>

        {/* Notifications — opens a slide-out panel */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          onClick={() => setNotifOpen(true)}
        >
          <Bell className="size-5" />
          {badgeCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Button>

        <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted/60 transition">
              <Avatar className="size-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials(authUser?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold leading-tight">
                  {authUser?.name}
                </div>
                <div className="text-[10px] text-muted-foreground">HR Admin</div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm">{authUser?.name}</div>
              <div className="text-xs text-muted-foreground font-normal">
                {authUser?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setModule("settings")}>
              <Settings className="size-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModule("audit")}>
              <UserIcon className="size-4 mr-2" /> Activity Log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="size-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
