"use client";

import { useApp } from "@/lib/store";
import { NAV_ITEMS } from "./nav-config";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export function Topbar() {
  const authUser = useApp((s) => s.authUser);
  const logout = useApp((s) => s.logout);
  const activeModule = useApp((s) => s.activeModule);
  const setMobileSidebarOpen = useApp((s) => s.setMobileSidebarOpen);
  const setCommandOpen = useApp((s) => s.setCommandOpen);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const setModule = useApp((s) => s.setModule);
  const [pendingCount, setPendingCount] = useState(0);

  const current = NAV_ITEMS.find((n) => n.key === activeModule);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setPendingCount(d?.kpis?.pendingLeave ?? 0))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 flex items-center gap-3">
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
          className="group w-full flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border/80 transition"
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
            <Button size="sm" className="hidden sm:inline-flex gap-1.5">
              <Plus className="size-4" /> Quick Add
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQuickAction("add-employee")}>
              <UserIcon className="size-4 mr-2" /> Add Employee
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("generate-document")}>
              <Search className="size-4 mr-2" /> Generate Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("create-payslip")}>
              <Plus className="size-4 mr-2" /> Create Payslip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-attendance")}>
              <Plus className="size-4 mr-2" /> Add Attendance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickAction("add-leave")}>
              <Plus className="size-4 mr-2" /> Add Leave
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-5" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-[10px]">
                {pendingCount} pending
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex flex-col items-start gap-0.5"
              onClick={() => setModule("leave")}
            >
              <div className="font-medium text-sm">Pending leave requests</div>
              <div className="text-xs text-muted-foreground">
                {pendingCount} request(s) awaiting your approval
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground justify-center">
              View all in Leave module
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
