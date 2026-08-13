"use client";

import { useApp } from "@/lib/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./nav-config";
import {
  Users,
  FileText,
  Wallet,
  CalendarDays,
  CalendarCheck,
  Plus,
  Search as SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const open = useApp((s) => s.commandOpen);
  const setOpen = useApp((s) => s.setCommandOpen);
  const setModule = useApp((s) => s.setModule);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const openEmployee = useApp((s) => s.openEmployee);
  const [employees, setEmployees] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    if (!q) {
      // Preload
      fetch("/api/search?q=&limit=10")
        .then((r) => r.json())
        .then((d) => {
          setEmployees(d.employees ?? []);
          setDocuments(d.documents ?? []);
        })
        .catch(() => {});
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`)
        .then((r) => r.json())
        .then((d) => {
          setEmployees(d.employees ?? []);
          setDocuments(d.documents ?? []);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [open, q]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search employees, documents, or jump to a module…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              setQuickAction("add-employee");
              setOpen(false);
            }}
          >
            <Plus className="mr-2 size-4" /> Add Employee
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setQuickAction("generate-document");
              setOpen(false);
            }}
          >
            <FileText className="mr-2 size-4" /> Generate Document
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setQuickAction("create-payslip");
              setOpen(false);
            }}
          >
            <Wallet className="mr-2 size-4" /> Create Payslip
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setQuickAction("add-leave");
              setOpen(false);
            }}
          >
            <CalendarDays className="mr-2 size-4" /> Add Leave
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.key}
                onSelect={() => {
                  setModule(item.key);
                  setOpen(false);
                }}
              >
                <Icon className="mr-2 size-4" /> {item.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.description}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {employees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Employees">
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  onSelect={() => {
                    openEmployee(emp.id);
                    setOpen(false);
                  }}
                >
                  <Users className="mr-2 size-4" />
                  <span>{emp.fullName}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {emp.employeeId} · {emp.departmentName ?? emp.department?.name ?? ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {documents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {documents.map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => {
                    setModule("documents");
                    setOpen(false);
                  }}
                >
                  <FileText className="mr-2 size-4" />
                  <span>{doc.documentNumber}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {doc.type} · {doc.employeeName ?? doc.employee?.fullName ?? ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
