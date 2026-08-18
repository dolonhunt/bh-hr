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
          "hidden lg:flex m-4 rounded-[24px] border border-sidebar-border/30 neu-raised overflow-hidden",
          sidebarCollapsed ? "w-[80px]" : "w-[280px]",
          "lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]",
          "fixed inset-y-0 left-0 lg:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3 min-w-0">
            {sidebarCollapsed ? (
              <BrandMark size="md" />
            ) : (
              <BrandLogo className="h-7" />
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

        {/* Nav — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <TooltipProvider delayDuration={200}>
            <div className="space-y-6">
              {NAV_SECTIONS.map((section) => {
                const hasActive = section.items.some((item) => item.key === activeModule);

                return (
                  <div key={section.label} className="space-y-1.5">
                    {!sidebarCollapsed ? (
                      <div
                        className={cn(
                          "px-3 pb-1 text-[11px] font-bold uppercase tracking-wider",
                          hasActive ? "text-primary" : "text-muted-foreground/70"
                        )}
                      >
                        {section.label}
                      </div>
                    ) : (
                      <div className="mx-3 border-t border-sidebar-border/40 my-3" />
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
                            "w-full group/nav flex items-center gap-3.5 rounded-xl px-3 py-3 text-[14px] font-semibold transition-all relative",
                            active
                              ? "bg-primary text-primary-foreground shadow-soft glow-coral"
                              : "text-sidebar-foreground/80 hover:bg-muted/60 hover:text-sidebar-foreground hover:shadow-soft",
                            sidebarCollapsed && "justify-center px-2 py-3"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5 flex-shrink-0 transition-transform group-hover/nav:scale-110",
                              active
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover/nav:text-primary"
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
                        </button>
                      );

                      if (sidebarCollapsed) {
                        return (
                          <Tooltip key={item.key}>
                            <TooltipTrigger asChild>
                              {navButton}
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={12}>
                              <p className="font-semibold">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground">
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

        {/* Collapse toggle */}
        <div className="hidden lg:block border-t border-sidebar-border/30 p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground font-semibold py-5"
            onClick={toggleSidebar}
          >
            <ChevronLeft
              className={cn(
                "size-5 transition-transform",
                sidebarCollapsed && "rotate-180"
              )}
            />
            {!sidebarCollapsed && <span className="ml-3">Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
