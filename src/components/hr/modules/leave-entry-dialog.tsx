"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record?: { id: string } | null;
  presetEmployeeId?: string | null;
  onSaved?: () => void;
}

export function LeaveEntryDialog({
  open,
  onOpenChange,
  record,
  presetEmployeeId,
  onSaved,
}: Props) {
  const isEdit = !!record;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    employeeId: "",
    leaveTypeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
    attachment: "",
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-leave"],
    queryFn: () => fetch(`/api/employees?pageSize=200`).then((r) => r.json()),
    enabled: open,
  });
  const employees = employeesData?.items ?? [];

  const { data: leaveTypesData } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => fetch("/api/leave-types").then((r) => r.json()),
    enabled: open,
  });
  const leaveTypes = leaveTypesData?.items ?? [];

  useEffect(() => {
    if (!open) return;
    if (record) {
      fetch(`/api/leave/${record.id}`)
        .then((r) => r.json())
        .then((l) => {
          if (l?.id) {
            setForm({
              employeeId: l.employeeId,
              leaveTypeId: l.leaveTypeId,
              startDate: l.startDate
                ? new Date(l.startDate).toISOString().slice(0, 10)
                : "",
              endDate: l.endDate
                ? new Date(l.endDate).toISOString().slice(0, 10)
                : "",
              reason: l.reason || "",
              attachment: l.attachment || "",
            });
          }
        });
    } else {
      setForm({
        employeeId: presetEmployeeId || "",
        leaveTypeId: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        reason: "",
        attachment: "",
      });
    }
  }, [open, record, presetEmployeeId]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  // Auto-calc days inclusive
  let daysPreview = "";
  if (form.startDate && form.endDate) {
    const s = new Date(form.startDate);
    const e = new Date(form.endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    if (diff > 0) daysPreview = `${diff} day(s)`;
  }

  async function handleSubmit() {
    if (!form.employeeId || !form.leaveTypeId || !form.reason) {
      toast.error("Employee, leave type, and reason are required.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date cannot be before start date.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/leave/${record!.id}` : "/api/leave";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          attachment: form.attachment || null,
          status: isEdit ? undefined : "PENDING",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save leave request");
      }
      toast.success(
        isEdit ? "Leave request updated." : "Leave request submitted."
      );
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            {isEdit ? "Edit Leave Request" : "Apply for Leave"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update leave request details."
              : "Submit a new leave request on behalf of an employee."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Employee *
            </Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => set("employeeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} · {emp.employeeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Leave Type *
            </Label>
            <Select
              value={form.leaveTypeId}
              onValueChange={(v) => set("leaveTypeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt: any) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: lt.color ?? "#10b981" }}
                      />
                      {lt.name}
                      <span className="text-xs text-muted-foreground">
                        ({lt.defaultDays}d)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Start Date *
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                End Date *
              </Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>

          {daysPreview && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Duration:{" "}
              <span className="font-semibold text-foreground">
                {daysPreview}
              </span>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Reason *
            </Label>
            <Textarea
              rows={3}
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="e.g. Medical appointment, family event, etc."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Attachment URL
            </Label>
            <Input
              value={form.attachment}
              onChange={(e) => set("attachment", e.target.value)}
              placeholder="https://… (optional, e.g. medical certificate)"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
