"use client";

import { useEffect, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, UserPlus, Upload, X } from "lucide-react";
import { AvatarBadge } from "../shared/avatar-badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee?: { id: string } | null;
  onSaved?: (emp: any) => void;
}

const MAX_PHOTO_BYTES = 500 * 1024; // 500 KB

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: Props) {
  const isEdit = !!employee;
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    fullName: "",
    gender: "MALE",
    dateOfBirth: "",
    phone: "",
    personalEmail: "",
    officialEmail: "",
    address: "",
    city: "",
    state: "",
    country: "Bangladesh",
    zipCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyRelation: "",
    departmentId: "",
    roleId: "",
    designationId: "",
    employmentType: "FULL_TIME",
    joiningDate: new Date().toISOString().slice(0, 10),
    confirmationDate: "",
    employmentStatus: "ACTIVE",
    workLocation: "HQ - Dhaka",
    basicSalary: 35000,
    allowances: 10000,
    deductions: 1000,
    tax: 2000,
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    paymentMethod: "BANK_TRANSFER",
    photo: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/designations").then((r) => r.json()),
    ]).then(([d, r, des]) => {
      setDepartments(d.items ?? d ?? []);
      setRoles(r.items ?? r ?? []);
      setDesignations(des.items ?? des ?? []);
    });
  }, [open]);

  useEffect(() => {
    if (open && employee) {
      fetch(`/api/employees/${employee.id}`)
        .then((r) => r.json())
        .then((emp) => {
          setForm({
            ...emp,
            dateOfBirth: emp.dateOfBirth
              ? new Date(emp.dateOfBirth).toISOString().slice(0, 10)
              : "",
            joiningDate: emp.joiningDate
              ? new Date(emp.joiningDate).toISOString().slice(0, 10)
              : "",
            confirmationDate: emp.confirmationDate
              ? new Date(emp.confirmationDate).toISOString().slice(0, 10)
              : "",
          });
        });
    } else if (open && !employee) {
      // reset
      setForm({
        fullName: "",
        gender: "MALE",
        dateOfBirth: "",
        phone: "",
        personalEmail: "",
        officialEmail: "",
        address: "",
        city: "",
        state: "",
        country: "Bangladesh",
        zipCode: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyRelation: "",
        departmentId: "",
        roleId: "",
        designationId: "",
        employmentType: "FULL_TIME",
        joiningDate: new Date().toISOString().slice(0, 10),
        confirmationDate: "",
        employmentStatus: "ACTIVE",
        workLocation: "HQ - Dhaka",
        basicSalary: 35000,
        allowances: 10000,
        deductions: 1000,
        tax: 2000,
        bankName: "",
        bankAccount: "",
        bankIfsc: "",
        paymentMethod: "BANK_TRANSFER",
        photo: "",
      });
    }
  }, [open, employee]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function handlePhotoSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(
        `Image is too large (${(file.size / 1024).toFixed(0)} KB). Max allowed is 500 KB.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        set("photo", dataUrl);
      }
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    set("photo", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!form.fullName || !form.officialEmail) {
      toast.error("Full name and official email are required.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/employees/${employee!.id}` : "/api/employees";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save employee");
      }
      const saved = await res.json();
      toast.success(isEdit ? "Employee updated." : "Employee added.");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update employee personal, employment, and payroll details."
              : "Fill in the new employee's details. Fields marked * are required."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-4 sm:px-6 py-4">
            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                {/* Photo upload */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <AvatarBadge
                      name={form.fullName || "New Employee"}
                      photo={form.photo}
                      size="xl"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Profile Photo</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        JPG, PNG, or GIF. Max 500 KB.
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handlePhotoSelect(e.target.files?.[0])
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="size-4 mr-1.5" />
                          {form.photo ? "Change Photo" : "Upload Photo"}
                        </Button>
                        {form.photo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearPhoto}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                          >
                            <X className="size-4 mr-1.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name *">
                    <Input
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      placeholder="e.g. Arif Hossain"
                    />
                  </Field>
                  <Field label="Gender">
                    <Select
                      value={form.gender}
                      onValueChange={(v) => set("gender", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of Birth">
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+880 17xx-xxxxxx"
                    />
                  </Field>
                  <Field label="Personal Email">
                    <Input
                      type="email"
                      value={form.personalEmail}
                      onChange={(e) => set("personalEmail", e.target.value)}
                      placeholder="name@gmail.com"
                    />
                  </Field>
                  <Field label="Official Email *">
                    <Input
                      type="email"
                      value={form.officialEmail}
                      onChange={(e) => set("officialEmail", e.target.value)}
                      placeholder="name@company.com"
                    />
                  </Field>
                  <Field label="Address" className="md:col-span-2">
                    <Textarea
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="House, road, block"
                      rows={2}
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={form.country}
                      onChange={(e) => set("country", e.target.value)}
                    />
                  </Field>
                  <Field label="ZIP Code">
                    <Input
                      value={form.zipCode}
                      onChange={(e) => set("zipCode", e.target.value)}
                    />
                  </Field>
                  <Field label="Emergency Contact Name">
                    <Input
                      value={form.emergencyContactName}
                      onChange={(e) =>
                        set("emergencyContactName", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Emergency Contact Phone">
                    <Input
                      value={form.emergencyContactPhone}
                      onChange={(e) =>
                        set("emergencyContactPhone", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Relation">
                    <Input
                      value={form.emergencyRelation}
                      onChange={(e) =>
                        set("emergencyRelation", e.target.value)
                      }
                      placeholder="Parent / Spouse / Sibling"
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Department">
                    <Select
                      value={form.departmentId}
                      onValueChange={(v) => set("departmentId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Role">
                    <Select
                      value={form.roleId}
                      onValueChange={(v) => set("roleId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Designation">
                    <Select
                      value={form.designationId}
                      onValueChange={(v) => set("designationId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {designations.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Employment Type">
                    <Select
                      value={form.employmentType}
                      onValueChange={(v) => set("employmentType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                        <SelectItem value="PROBATION">Probation</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Joining Date">
                    <Input
                      type="date"
                      value={form.joiningDate}
                      onChange={(e) => set("joiningDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Confirmation Date">
                    <Input
                      type="date"
                      value={form.confirmationDate}
                      onChange={(e) => set("confirmationDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Employment Status">
                    <Select
                      value={form.employmentStatus}
                      onValueChange={(v) => set("employmentStatus", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="PROBATION">Probation</SelectItem>
                        <SelectItem value="RESIGNED">Resigned</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Work Location">
                    <Input
                      value={form.workLocation}
                      onChange={(e) => set("workLocation", e.target.value)}
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="payroll" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Basic Salary (BDT)">
                    <Input
                      type="number"
                      value={form.basicSalary}
                      onChange={(e) =>
                        set("basicSalary", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Allowances">
                    <Input
                      type="number"
                      value={form.allowances}
                      onChange={(e) =>
                        set("allowances", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Deductions">
                    <Input
                      type="number"
                      value={form.deductions}
                      onChange={(e) =>
                        set("deductions", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Tax">
                    <Input
                      type="number"
                      value={form.tax}
                      onChange={(e) => set("tax", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Bank Name">
                    <Input
                      value={form.bankName}
                      onChange={(e) => set("bankName", e.target.value)}
                    />
                  </Field>
                  <Field label="Bank Account No.">
                    <Input
                      value={form.bankAccount}
                      onChange={(e) => set("bankAccount", e.target.value)}
                    />
                  </Field>
                  <Field label="Bank IFSC">
                    <Input
                      value={form.bankIfsc}
                      onChange={(e) => set("bankIfsc", e.target.value)}
                    />
                  </Field>
                  <Field label="Payment Method">
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) => set("paymentMethod", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Net Salary (computed):{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    ৳
                    {(
                      (Number(form.basicSalary) || 0) +
                      (Number(form.allowances) || 0) -
                      (Number(form.deductions) || 0) -
                      (Number(form.tax) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
