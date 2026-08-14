"use client";

import { useApp } from "@/lib/store";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";
import { ChevronLeft, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const activeModule = useApp((s) => s.activeModule);
  const setModule = useApp((s) => s.setModule);
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const mobileSidebarOpen = useApp((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useApp((s) => s.setMobileSidebarOpen);

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          // Desktop behavior
          "hidden lg:flex",
          sidebarCollapsed ? "w-[76px]" : "w-[260px]",
          // Mobile behavior: off-canvas
          "lg:sticky lg:top-0 lg:h-screen",
          "fixed inset-y-0 left-0 lg:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-soft">
              <ShieldCheck className="size-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-semibold text-sidebar-foreground leading-tight truncate">
                  TeamHub HR
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Operations Console
                </div>
              </div>
            )}
          </div>
          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden size-8"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Main
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const active = activeModule === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setModule(item.key);
                    setMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full group/nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {/* Active indicator bar on the left */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary" />
                  )}
                  <Icon
                    className={cn(
                      "size-[18px] flex-shrink-0 transition-transform group-hover/nav:scale-110",
                      active
                        ? "text-sidebar-primary"
                        : "text-muted-foreground group-hover/nav:text-sidebar-foreground"
                    )}
                  />
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="truncate flex items-center gap-2">
                        {item.label}
                        {item.badge === "live" && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}
                  {!sidebarCollapsed && active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform",
                sidebarCollapsed && "rotate-180"
              )}
            />
            {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
