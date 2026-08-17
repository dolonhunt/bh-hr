"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { AvatarBadge } from "../shared/avatar-badge";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Mail,
  Upload,
  Phone,
  Mail as MailIcon,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Wallet,
  Banknote,
  Activity,
  TrendingUp,
  CalendarCheck,
  CalendarDays,
  User as UserIcon,
  DoorOpen,
  Loader2,
} from "lucide-react";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { SalaryHistory } from "./salary-history";
import { Onboarding } from "./onboarding";
import { Offboarding } from "./offboarding";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatCurrency, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

export function EmployeeProfile({ id }: { id: string }) {
  const setEmployeeView = useApp((s) => s.setEmployeeView);
  const setQuickAction = useApp((s) => s.setQuickAction);
  const setModule = useApp((s) => s.setModule);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [startingOffboarding, setStartingOffboarding] = useState(false);

  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => fetch(`/api/employees/${id}`).then((r) => r.json()),
  });

  // Employee is in offboarding mode if their status is RESIGNED or TERMINATED.
  const isOffboarding =
    emp?.employmentStatus === "RESIGNED" ||
    emp?.employmentStatus === "TERMINATED";

  async function startOffboarding() {
    setStartingOffboarding(true);
    try {
      const r = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentStatus: "RESIGNED" }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start offboarding");
      }
      await qc.invalidateQueries({ queryKey: ["employee", id] });
      toast.success("Offboarding started — status set to RESIGNED.");
      setActiveTab("offboarding");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start offboarding");
    } finally {
      setStartingOffboarding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (!emp) {
    return (
      <EmptyState
        icon={UserIcon}
        title="Employee not found"
        description="This employee may have been deleted."
        actionLabel="Back to list"
        onAction={() => setEmployeeView("list")}
      />
    );
  }

  const netSalary =
    (emp.basicSalary || 0) +
    (emp.allowances || 0) -
    (emp.deductions || 0) -
    (emp.tax || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEmployeeView("list")}
          className="self-start"
        >
          <ArrowLeft className="size-4 mr-1.5" /> Back to Employees
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-1.5" /> <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickAction("generate-document")}
          >
            <FileText className="size-4 mr-1.5" /> <span className="hidden sm:inline">Generate Document</span>
            <span className="sm:hidden">Document</span>
          </Button>
          <Button size="sm" onClick={() => setQuickAction("create-payslip")}>
            <Wallet className="size-4 mr-1.5" /> <span className="hidden sm:inline">Create Payslip</span>
            <span className="sm:hidden">Payslip</span>
          </Button>
        </div>
      </div>

      {/* Profile header card */}
      <Card className="border-border/60 shadow-soft overflow-hidden">
        <div
          className="h-24"
          style={{
            background: `linear-gradient(135deg, ${emp.department?.color ?? "#10b981"}, ${emp.department?.color ?? "#10b981"}80)`,
          }}
        />
        <CardContent className="p-4 sm:p-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <AvatarBadge
              name={emp.fullName}
              photo={emp.photo}
              size="xl"
              className="ring-4 ring-card"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">
                  {emp.fullName}
                </h1>
                <StatusBadge status={emp.employmentStatus} />
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                <span className="font-mono">{emp.employeeId}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3.5" />
                  {emp.designation?.name ?? "—"}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {emp.department?.name ?? "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:items-end text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MailIcon className="size-4" />
                <span className="text-foreground">{emp.officialEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                <span className="text-foreground">{emp.phone ?? "—"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="flex w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            {isOffboarding && (
              <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={CalendarCheck}
              label="Attendance Rate"
              value="94%"
              tone="primary"
            />
            <StatCard
              icon={CalendarDays}
              label="Leave Taken"
              value={`${emp.leaveRequests?.length ?? 0} days`}
              tone="amber"
            />
            <StatCard
              icon={Wallet}
              label="Net Salary"
              value={formatCurrency(netSalary)}
              tone="teal"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={emp.documents?.length ?? 0}
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/60 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <InfoRow
                  icon={Calendar}
                  label="Joining Date"
                  value={formatDate(emp.joiningDate)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Confirmation Date"
                  value={formatDate(emp.confirmationDate)}
                />
                <InfoRow
                  icon={Building2}
                  label="Department"
                  value={emp.department?.name ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Role"
                  value={emp.role?.name ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Employment Type"
                  value={(emp.employmentType || "").replace(/_/g, " ")}
                />
                <InfoRow
                  icon={MapPin}
                  label="Work Location"
                  value={emp.workLocation ?? "—"}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(emp.activities ?? []).slice(0, 6).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 text-sm py-1.5 border-b border-border/40 last:border-0"
                  >
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Activity className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{a.title}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {a.description}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relativeTime(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {(emp.activities ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No recent activity.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Personal */}
        <TabsContent value="personal" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow icon={UserIcon} label="Full Name" value={emp.fullName} />
                <InfoRow icon={UserIcon} label="Gender" value={emp.gender} />
                <InfoRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDate(emp.dateOfBirth)}
                />
                <InfoRow icon={Phone} label="Phone" value={emp.phone ?? "—"} />
                <InfoRow
                  icon={MailIcon}
                  label="Personal Email"
                  value={emp.personalEmail ?? "—"}
                />
                <InfoRow
                  icon={MailIcon}
                  label="Official Email"
                  value={emp.officialEmail ?? "—"}
                />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={emp.address ?? "—"}
                />
                <InfoRow
                  icon={MapPin}
                  label="City / Country"
                  value={[emp.city, emp.country].filter(Boolean).join(", ") || "—"}
                />
                <InfoRow
                  icon={Phone}
                  label="Emergency Contact"
                  value={
                    emp.emergencyContactName
                      ? `${emp.emergencyContactName} (${emp.emergencyRelation ?? "—"}): ${emp.emergencyContactPhone ?? ""}`
                      : "—"
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment */}
        <TabsContent value="employment" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Employment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  icon={Building2}
                  label="Department"
                  value={emp.department?.name ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Role"
                  value={emp.role?.name ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Designation"
                  value={emp.designation?.name ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Employment Type"
                  value={(emp.employmentType || "").replace(/_/g, " ")}
                />
                <InfoRow
                  icon={Calendar}
                  label="Joining Date"
                  value={formatDate(emp.joiningDate)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Confirmation Date"
                  value={formatDate(emp.confirmationDate)}
                />
                <InfoRow
                  icon={UserIcon}
                  label="Reporting Manager"
                  value={emp.manager?.fullName ?? "—"}
                />
                <InfoRow
                  icon={MapPin}
                  label="Work Location"
                  value={emp.workLocation ?? "—"}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Status"
                  value={<StatusBadge status={emp.employmentStatus} />}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(emp.attendance ?? []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">
                          {formatDate(a.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.checkIn
                            ? new Date(a.checkIn).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.checkOut
                            ? new Date(a.checkOut).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {a.workingHours?.toFixed(1) ?? "0"}h
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave */}
        <TabsContent value="leave" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(emp.leaveRequests ?? []).map((lr: any) => (
                      <TableRow key={lr.id}>
                        <TableCell className="text-sm">
                          {lr.leaveType?.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(lr.startDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(lr.endDate)}
                        </TableCell>
                        <TableCell className="text-sm">{lr.days}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {lr.reason}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lr.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(emp.leaveRequests ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No leave records.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Salary Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SalaryRow label="Basic Salary" value={emp.basicSalary} />
                <SalaryRow label="Allowances" value={emp.allowances} />
                <SalaryRow label="Deductions" value={-emp.deductions} />
                <SalaryRow label="Tax" value={-emp.tax} />
                <div className="border-t border-border pt-3">
                  <SalaryRow
                    label="Net Salary"
                    value={netSalary}
                    highlight
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Bank Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow
                    icon={Banknote}
                    label="Bank Name"
                    value={emp.bankName ?? "—"}
                  />
                  <InfoRow
                    icon={Banknote}
                    label="Account Number"
                    value={emp.bankAccount ?? "—"}
                  />
                  <InfoRow
                    icon={Banknote}
                    label="IFSC"
                    value={emp.bankIfsc ?? "—"}
                  />
                  <InfoRow
                    icon={Wallet}
                    label="Payment Method"
                    value={(emp.paymentMethod || "").replace(/_/g, " ")}
                  />
                </div>
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">
                    Recent Payroll Records
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Month</TableHead>
                          <TableHead>Net</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Paid On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(emp.payrolls ?? []).map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">
                              {p.payrollMonth}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {formatCurrency(p.netSalary)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={p.status} />
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(p.paymentDate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary revision history */}
          <SalaryHistory
            employeeId={emp.id}
            currentNetSalary={netSalary}
            joiningDate={emp.joiningDate}
          />
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Employee Documents</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuickAction("generate-document")}
              >
                <FileText className="size-4 mr-1.5" /> Generate
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Document No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(emp.documents ?? []).map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">
                          {d.documentNumber}
                        </TableCell>
                        <TableCell className="text-sm">{d.type}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(d.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setModule("documents")}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(emp.documents ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No documents yet. Generate one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(emp.activities ?? []).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Activity className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{a.title}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground">
                          {a.description}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relativeTime(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {(emp.activities ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No activity yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding */}
        <TabsContent value="onboarding" className="mt-4 space-y-4">
          {!isOffboarding && (
            <Card className="border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      Initiating an exit?
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start the offboarding workflow to track the exit
                      checklist (resignation letter, asset recovery, final
                      settlement, relieving letter, and more).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                  onClick={startOffboarding}
                  disabled={startingOffboarding}
                >
                  {startingOffboarding ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <DoorOpen className="size-4 mr-1.5" />
                  )}
                  Start Offboarding
                </Button>
              </CardContent>
            </Card>
          )}
          <Onboarding employeeId={id} />
        </TabsContent>

        {/* Offboarding */}
        {isOffboarding && (
          <TabsContent value="offboarding" className="mt-4">
            <Offboarding employeeId={id} />
          </TabsContent>
        )}
      </Tabs>

      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={{ id }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["employee", id] });
          qc.invalidateQueries({ queryKey: ["salary-revisions", id] });
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: any;
  tone: "primary" | "amber" | "teal" | "violet";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    teal: "bg-teal-500/10 text-teal-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  return (
    <Card className="border-border/60 shadow-soft p-4">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-xl flex items-center justify-center ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

function SalaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${highlight ? "font-semibold" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${highlight ? "text-lg font-bold text-primary" : value < 0 ? "text-rose-600" : ""}`}
      >
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}
