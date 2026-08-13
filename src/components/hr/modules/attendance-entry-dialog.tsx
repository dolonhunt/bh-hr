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
import { Loader2, CalendarCheck, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record?: { id: string } | null;
  presetEmployeeId?: string | null;
  presetDate?: string | null;
  onSaved?: () => void;
}

export function AttendanceEntryDialog({
  open,
  onOpenChange,
  record,
  presetEmployeeId,
  presetDate,
  onSaved,
}: Props) {
  const isEdit = !!record;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
    note: "",
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-attendance"],
    queryFn: () =>
      fetch(`/api/employees?pageSize=200`).then((r) => r.json()),
    enabled: open,
  });
  const employees = employeesData?.items ?? [];

  useEffect(() => {
    if (!open) return;
    if (record) {
      fetch(`/api/attendance/${record.id}`)
        .then((r) => r.json())
        .then((a) => {
          if (a?.id) {
            setForm({
              employeeId: a.employeeId,
              date: a.date ? new Date(a.date).toISOString().slice(0, 10) : "",
              checkIn: a.checkIn
                ? new Date(a.checkIn).toISOString().slice(0, 16)
                : "",
              checkOut: a.checkOut
                ? new Date(a.checkOut).toISOString().slice(0, 16)
                : "",
              status: a.status || "PRESENT",
              note: a.note || "",
            });
          }
        });
    } else {
      setForm({
        employeeId: presetEmployeeId || "",
        date: presetDate || new Date().toISOString().slice(0, 10),
        checkIn: "",
        checkOut: "",
        status: "PRESENT",
        note: "",
      });
    }
  }, [open, record, presetEmployeeId, presetDate]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  // Auto-calc working hours
  let workingHoursPreview = "";
  if (form.checkIn && form.checkOut) {
    const inT = new Date(form.checkIn);
    const outT = new Date(form.checkOut);
    const diff = outT.getTime() - inT.getTime();
    if (diff > 0) {
      workingHoursPreview = `${(diff / 3600000).toFixed(2)}h`;
    }
  }

  async function handleSubmit() {
    if (!form.employeeId || !form.date) {
      toast.error("Employee and date are required.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/attendance/${record!.id}` : "/api/attendance";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          date: form.date,
          checkIn: form.checkIn || null,
          checkOut: form.checkOut || null,
          status: form.status,
          note: form.note || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save attendance");
      }
      toast.success(isEdit ? "Attendance updated." : "Attendance recorded.");
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
            <CalendarCheck className="size-5 text-primary" />
            {isEdit ? "Edit Attendance" : "Add Attendance"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update check-in / check-out times and status."
              : "Mark attendance for an employee."}
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
              Date *
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Check In
              </Label>
              <Input
                type="datetime-local"
                value={form.checkIn}
                onChange={(e) => set("checkIn", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Check Out
              </Label>
              <Input
                type="datetime-local"
                value={form.checkOut}
                onChange={(e) => set("checkOut", e.target.value)}
              />
            </div>
          </div>

          {workingHoursPreview && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Working hours:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {workingHoursPreview}
              </span>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="LEAVE">On Leave</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Note
            </Label>
            <Textarea
              rows={2}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Optional note (e.g. WFH approved by manager)"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Record Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
