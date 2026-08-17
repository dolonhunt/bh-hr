"use client";

import { useApp } from "@/lib/store";
import { NAV_SECTIONS } from "./nav-config";
import { cn } from "@/lib/utils";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo, BrandMark } from "@/components/brand/brand-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          "z-50 flex flex-col bg-sidebar transition-all duration-300",
          "hidden lg:flex m-3 rounded-2xl border border-sidebar-border/50 neu-raised overflow-hidden",
          sidebarCollapsed ? "w-[76px]" : "w-[260px]",
          "lg:sticky lg:top-0 lg:h-[calc(100vh-1.5rem)]",
          "fixed inset-y-0 left-0 lg:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {sidebarCollapsed ? (
              <BrandMark size="md" />
            ) : (
              <BrandLogo />
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-sidebar-foreground leading-tight truncate tracking-tight">
                  BH HR
                </div>
                <div className="text-[10px] text-muted-foreground/80 truncate uppercase tracking-wider">
                  Beyond Headlines
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

        {/* Nav — sectioned */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <TooltipProvider delayDuration={200}>
            <div className="space-y-4">
              {NAV_SECTIONS.map((section) => {
                // When collapsed, only show section divider line (not label)
                const hasActive = section.items.some((item) => item.key === activeModule);

                return (
                  <div key={section.label} className="space-y-1">
                    {!sidebarCollapsed ? (
                      <div
                        className={cn(
                          "px-3 pb-1 text-[10px] font-bold uppercase tracking-wider",
                          hasActive ? "text-primary" : "text-muted-foreground/70"
                        )}
                      >
                        {section.label}
                      </div>
                    ) : (
                      // Collapsed: show a thin divider
                      <div className="mx-2 border-t border-sidebar-border/40" />
                    )}

                    {section.items.map((item) => {
                      const active = activeModule === item.key;
                      const Icon = item.icon;

                      const navButton = (
                        <button
                          key={item.key}
                          onClick={() => {
                            setModule(item.key);
                            setMobileSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full group/nav flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative",
                            active
                              ? "bg-primary text-primary-foreground neu-raised-sm glow-teal"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            sidebarCollapsed && "justify-center px-2"
                          )}
                        >
                          {active && !sidebarCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-foreground/50" />
                          )}
                          <Icon
                            className={cn(
                              "size-[18px] flex-shrink-0 transition-transform group-hover/nav:scale-110",
                              active
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover/nav:text-sidebar-foreground"
                            )}
                          />
                          {!sidebarCollapsed && (
                            <div className="flex-1 text-left min-w-0">
                              <div className="truncate flex items-center gap-2">
                                {item.label}
                                {item.badge === "live" && (
                                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                              </div>
                            </div>
                          )}
                          {!sidebarCollapsed && active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
                          )}
                        </button>
                      );

                      // When collapsed, wrap in tooltip
                      if (sidebarCollapsed) {
                        return (
                          <Tooltip key={item.key}>
                            <TooltipTrigger asChild>
                              {navButton}
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {section.label}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return navButton;
                    })}
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-sidebar-border/60 p-3">
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
