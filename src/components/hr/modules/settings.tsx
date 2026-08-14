"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Briefcase,
  Award,
  CalendarDays,
  Mail,
  Hash,
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  Save,
  Send,
  Check,
  Eye,
  EyeOff,
  MapPin,
  FileText,
  Database,
  Download,
  Upload,
  TriangleAlert,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, downloadBlob } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";
import { EmptyState } from "../shared/empty-state";
import { EmailTemplateEditor } from "./email-template-editor";

const TABS = [
  { key: "organization", label: "Organization", icon: Building2 },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "roles", label: "Roles", icon: Briefcase },
  { key: "designations", label: "Designations", icon: Award },
  { key: "leave-types", label: "Leave Types", icon: CalendarDays },
  { key: "email", label: "Email Settings", icon: Mail },
  { key: "email-templates", label: "Email Templates", icon: FileText },
  { key: "numbering", label: "Document Numbering", icon: Hash },
  { key: "backup", label: "Data & Backup", icon: Database },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsModule() {
  const [tab, setTab] = useState<TabKey>("organization");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your organization, master data, email, and document configuration"
        icon={<SettingsIcon className="size-5" />}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Vertical tab nav */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    tab === t.key
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 flex-shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === "organization" && <OrganizationTab />}
          {tab === "departments" && <DepartmentsTab />}
          {tab === "roles" && <RolesTab />}
          {tab === "designations" && <DesignationsTab />}
          {tab === "leave-types" && <LeaveTypesTab />}
          {tab === "email" && <EmailSettingsTab />}
          {tab === "email-templates" && <EmailTemplatesTab />}
          {tab === "numbering" && <DocumentNumberingTab />}
          {tab === "backup" && <DataBackupTab />}
        </div>
      </div>
    </div>
  );
}

// ============================== ORGANIZATION ==============================
function OrganizationTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    legalName: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    email: "",
    phone: "",
    website: "",
    logo: "",
    taxId: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["company"],
    queryFn: () => fetch("/api/company").then((r) => r.json()),
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        legalName: data.legalName ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        country: data.country ?? "",
        zipCode: data.zipCode ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        website: data.website ?? "",
        logo: data.logo ?? "",
        taxId: data.taxId ?? "",
      });
    }
  }, [data]);

  async function save() {
    if (!form.name) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Company profile saved");
      qc.invalidateQueries({ queryKey: ["company"] });
    } catch {
      toast.error("Failed to save company");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6">
          <div className="h-96 rounded-lg bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const fieldGroups = [
    {
      title: "Legal Details",
      icon: Building2,
      fields: [
        { key: "name", label: "Company Name *", full: true },
        { key: "legalName", label: "Legal Name" },
        { key: "taxId", label: "Tax ID / TIN" },
      ],
    },
    {
      title: "Contact Information",
      icon: Mail,
      fields: [
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "website", label: "Website" },
        { key: "logo", label: "Logo URL", full: true },
      ],
    },
    {
      title: "Location",
      icon: MapPin,
      fields: [
        { key: "address", label: "Address", full: true, textarea: true },
        { key: "city", label: "City" },
        { key: "state", label: "State / Province" },
        { key: "country", label: "Country" },
        { key: "zipCode", label: "ZIP / Postal Code" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-5">
          {/* Header with logo preview */}
          <div className="flex items-start justify-between pb-4 border-b border-border/60 gap-4">
            <div>
              <div className="font-semibold text-base">Organization Profile</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                These details appear on documents, emails, and reports.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-xl bg-primary/10 border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logo ? (
                  <img
                    src={form.logo}
                    alt="Logo"
                    className="size-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Building2 className="size-6 text-primary" />
                )}
              </div>
            </div>
          </div>

          {/* Grouped fields */}
          {fieldGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.title} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <GroupIcon className="size-4" />
                  </div>
                  {group.title}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-9">
                  {group.fields.map((f) => (
                    <div
                      key={f.key}
                      className={cn("space-y-1.5", f.full && "sm:col-span-2")}
                    >
                      <Label className="text-xs text-muted-foreground">
                        {f.label}
                      </Label>
                      {f.textarea ? (
                        <Textarea
                          rows={2}
                          value={form[f.key]}
                          onChange={(e) =>
                            setForm({ ...form, [f.key]: e.target.value })
                          }
                        />
                      ) : (
                        <Input
                          value={form[f.key]}
                          onChange={(e) =>
                            setForm({ ...form, [f.key]: e.target.value })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <div className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-card-hover px-4 py-2.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Changes apply to all generated documents
          </span>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Save className="size-4 mr-1.5" /> Update Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================== DEPARTMENTS ==============================
function DepartmentsTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const items = data?.items ?? [];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6">
        <SimpleTableHeader
          title="Departments"
          description="Organize employees into functional units"
          onAdd={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments"
            actionLabel="Add Department"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-4 rounded"
                        style={{ background: d.color ?? "#10b981" }}
                      />
                      <span className="text-xs font-mono">
                        {d.color ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status ?? "ACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowMenu
                      onEdit={() => {
                        setEdit(d);
                        setOpen(true);
                      }}
                      onArchive={async () => {
                        if (!confirm(`Archive department "${d.name}"?`)) return;
                        const res = await fetch(`/api/departments/${d.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          toast.success("Department archived");
                          qc.invalidateQueries({ queryKey: ["departments"] });
                        } else {
                          toast.error("Failed to archive");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {open && (
        <SimpleFormDialog
          title={edit ? "Edit Department" : "Add Department"}
          open={open}
          onOpenChange={setOpen}
          fields={[
            { key: "name", label: "Name *", required: true },
            { key: "description", label: "Description", textarea: true },
            { key: "color", label: "Color (hex)", type: "color" },
          ]}
          initial={edit ?? { name: "", description: "", color: "#10b981" }}
          onSubmit={async (form) => {
            const url = edit ? `/api/departments/${edit.id}` : "/api/departments";
            const method = edit ? "PATCH" : "POST";
            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            qc.invalidateQueries({ queryKey: ["departments"] });
          }}
        />
      )}
    </Card>
  );
}

// ============================== ROLES ==============================
function RolesTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/roles").then((r) => r.json()),
  });

  const items = data?.items ?? [];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6">
        <SimpleTableHeader
          title="Roles"
          description="Define job roles used across the organization"
          onAdd={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        {isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No roles"
            actionLabel="Add Role"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status ?? "ACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowMenu
                      onEdit={() => {
                        setEdit(r);
                        setOpen(true);
                      }}
                      onArchive={async () => {
                        if (!confirm(`Archive role "${r.name}"?`)) return;
                        const res = await fetch(`/api/roles/${r.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          toast.success("Role archived");
                          qc.invalidateQueries({ queryKey: ["roles"] });
                        } else {
                          toast.error("Failed to archive");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {open && (
        <SimpleFormDialog
          title={edit ? "Edit Role" : "Add Role"}
          open={open}
          onOpenChange={setOpen}
          fields={[
            { key: "name", label: "Name *", required: true },
            { key: "description", label: "Description", textarea: true },
          ]}
          initial={edit ?? { name: "", description: "" }}
          onSubmit={async (form) => {
            const url = edit ? `/api/roles/${edit.id}` : "/api/roles";
            const method = edit ? "PATCH" : "POST";
            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            qc.invalidateQueries({ queryKey: ["roles"] });
          }}
        />
      )}
    </Card>
  );
}

// ============================== DESIGNATIONS ==============================
function DesignationsTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data: designations } = useQuery({
    queryKey: ["designations"],
    queryFn: () => fetch("/api/designations").then((r) => r.json()),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetch("/api/departments").then((r) => r.json()),
  });

  const departments = departmentsData?.items ?? [];
  const items = designations?.items ?? [];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6">
        <SimpleTableHeader
          title="Designations"
          description="Job titles employees can hold"
          onAdd={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        {isLoading(designations) ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No designations"
            actionLabel="Add Designation"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.department?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status ?? "ACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowMenu
                      onEdit={() => {
                        setEdit(d);
                        setOpen(true);
                      }}
                      onArchive={async () => {
                        if (!confirm(`Archive designation "${d.name}"?`)) return;
                        const res = await fetch(`/api/designations/${d.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          toast.success("Designation archived");
                          qc.invalidateQueries({ queryKey: ["designations"] });
                        } else {
                          toast.error("Failed to archive");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {open && (
        <SimpleFormDialog
          title={edit ? "Edit Designation" : "Add Designation"}
          open={open}
          onOpenChange={setOpen}
          fields={[
            { key: "name", label: "Name *", required: true },
            {
              key: "departmentId",
              label: "Department",
              type: "select",
              options: departments.map((d: any) => ({
                value: d.id,
                label: d.name,
              })),
              allowNone: true,
            },
            { key: "description", label: "Description", textarea: true },
          ]}
          initial={
            edit ?? { name: "", description: "", departmentId: "" }
          }
          onSubmit={async (form) => {
            const url = edit ? `/api/designations/${edit.id}` : "/api/designations";
            const method = edit ? "PATCH" : "POST";
            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            qc.invalidateQueries({ queryKey: ["designations"] });
          }}
        />
      )}
    </Card>
  );
}

function isLoading(data: any) {
  return data === undefined;
}

// ============================== LEAVE TYPES ==============================
function LeaveTypesTab() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => fetch("/api/leave-types").then((r) => r.json()),
  });

  const items = data?.items ?? [];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6">
        <SimpleTableHeader
          title="Leave Types"
          description="Categories of leave employees can apply for"
          onAdd={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        {loading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave types"
            actionLabel="Add Leave Type"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Default Days</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((lt: any) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell>
                    <span className="px-1.5 py-0.5 rounded font-mono text-xs bg-muted">
                      {lt.code}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{lt.defaultDays}</TableCell>
                  <TableCell>
                    {lt.paid ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="size-3.5" /> Paid
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unpaid</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-4 rounded"
                        style={{ background: lt.color ?? "#10b981" }}
                      />
                      <span className="text-xs font-mono">
                        {lt.color ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lt.status ?? "ACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowMenu
                      onEdit={() => {
                        setEdit(lt);
                        setOpen(true);
                      }}
                      onArchive={async () => {
                        if (!confirm(`Archive leave type "${lt.name}"?`)) return;
                        const res = await fetch(`/api/leave-types/${lt.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          toast.success("Leave type archived");
                          qc.invalidateQueries({ queryKey: ["leave-types"] });
                        } else {
                          toast.error("Failed to archive");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {open && (
        <SimpleFormDialog
          title={edit ? "Edit Leave Type" : "Add Leave Type"}
          open={open}
          onOpenChange={setOpen}
          fields={[
            { key: "name", label: "Name *", required: true },
            { key: "code", label: "Code *", required: true },
            { key: "defaultDays", label: "Default Days", type: "number" },
            { key: "paid", label: "Paid", type: "switch" },
            { key: "color", label: "Color", type: "color" },
          ]}
          initial={
            edit ?? {
              name: "",
              code: "",
              defaultDays: 0,
              paid: true,
              color: "#10b981",
            }
          }
          onSubmit={async (form) => {
            const url = edit ? `/api/leave-types/${edit.id}` : "/api/leave-types";
            const method = edit ? "PATCH" : "POST";
            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                defaultDays: Number(form.defaultDays) || 0,
              }),
            });
            if (!res.ok) throw new Error();
            qc.invalidateQueries({ queryKey: ["leave-types"] });
          }}
        />
      )}
    </Card>
  );
}

// ============================== EMAIL SETTINGS ==============================
function EmailSettingsTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [form, setForm] = useState<any>({
    senderName: "",
    senderEmail: "",
    smtpHost: "",
    smtpPort: 587,
    username: "",
    password: "",
    encryption: "TLS",
  });

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  useEffect(() => {
    if (data?.emailSetting) {
      const es = data.emailSetting;
      setForm({
        senderName: es.senderName ?? "",
        senderEmail: es.senderEmail ?? "",
        smtpHost: es.smtpHost ?? "",
        smtpPort: es.smtpPort ?? 587,
        username: es.username ?? "",
        password: es.password ?? "",
        encryption: es.encryption ?? "TLS",
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSetting: form }),
      });
      if (!res.ok) throw new Error();
      toast.success("Email settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="font-semibold">Email Configuration</div>
            <p className="text-xs text-muted-foreground">
              Configure the SMTP server used to send HR documents.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTestEmailOpen(true)}>
            <Send className="size-4 mr-1.5" /> Send Test Email
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Sender Name</Label>
            <Input
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sender Email</Label>
            <Input
              type="email"
              value={form.senderEmail}
              onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>SMTP Host</Label>
            <Input
              value={form.smtpHost}
              onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>SMTP Port</Label>
            <Input
              type="number"
              value={form.smtpPort}
              onChange={(e) =>
                setForm({ ...form, smtpPort: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Encryption</Label>
            <Select
              value={form.encryption}
              onValueChange={(v) => setForm({ ...form, encryption: v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="SSL">SSL</SelectItem>
                <SelectItem value="TLS">TLS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-border/60">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : <><Save className="size-4 mr-1.5" /> Save Settings</>}
          </Button>
        </div>
      </CardContent>

      {testEmailOpen && (
        <TestEmailDialog
          open={testEmailOpen}
          defaultTo={form.senderEmail}
          sending={sendingTest}
          onOpenChange={setTestEmailOpen}
          onSend={async (to) => {
            setSendingTest(true);
            try {
              const res = await fetch("/api/settings/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to }),
              });
              if (!res.ok) throw new Error();
              toast.success("Test email simulated");
              setTestEmailOpen(false);
            } catch {
              toast.error("Failed to send test email");
            } finally {
              setSendingTest(false);
            }
          }}
        />
      )}
    </Card>
  );
}

// ============================== EMAIL TEMPLATES ==============================
function EmailTemplatesTab() {
  return <EmailTemplateEditor />;
}

function TestEmailDialog({
  open,
  defaultTo,
  sending,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  defaultTo: string;
  sending: boolean;
  onOpenChange: (v: boolean) => void;
  onSend: (to: string) => void;
}) {
  const [to, setTo] = useState(defaultTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            This will simulate sending a test email and create an EmailLog entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Recipient Email</Label>
          <Input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSend(to)} disabled={sending || !to}>
            {sending ? "Sending…" : <><Send className="size-4 mr-1.5" /> Send Test</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================== DOCUMENT NUMBERING ==============================
function DocumentNumberingTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "Default",
    pattern: "{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}",
    prefix: "NWL",
    padding: 4,
    nextSeq: 1,
  });

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  useEffect(() => {
    if (data?.documentNumbering) {
      const dn = data.documentNumbering;
      setForm({
        name: dn.name ?? "Default",
        pattern: dn.pattern ?? "",
        prefix: dn.prefix ?? "",
        padding: dn.padding ?? 4,
        nextSeq: dn.nextSeq ?? 1,
      });
    }
  }, [data]);

  // Live preview of next document number
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const seqStr = String(form.nextSeq ?? 1).padStart(Number(form.padding) || 4, "0");
  const preview = (form.pattern || "")
    .replace(/\{COMPANY\}/g, form.prefix || "NWL")
    .replace(/\{DEPARTMENT\}/g, "ENG")
    .replace(/\{DOCUMENT_TYPE\}/g, "OFFER")
    .replace(/\{DATE\}/g, dateStr)
    .replace(/\{EMPLOYEE_ID\}/g, "EMP001")
    .replace(/\{SEQ\}/g, seqStr);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentNumbering: form }),
      });
      if (!res.ok) throw new Error();
      toast.success("Document numbering saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const tokens = ["{COMPANY}", "{DEPARTMENT}", "{DOCUMENT_TYPE}", "{DATE}", "{EMPLOYEE_ID}", "{SEQ}"];

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-6 space-y-4">
        <div className="pb-3 border-b border-border/60">
          <div className="font-semibold">Document Numbering</div>
          <p className="text-xs text-muted-foreground">
            Define how generated HR documents are numbered.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prefix (Company Code)</Label>
            <Input
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value })}
              placeholder="NWL"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Pattern</Label>
            <Input
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tokens.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setForm({ ...form, pattern: `${form.pattern}${t}` })
                  }
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 text-[11px] font-mono"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Padding (digits)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.padding}
              onChange={(e) =>
                setForm({ ...form, padding: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Next Sequence</Label>
            <Input
              type="number"
              min={1}
              value={form.nextSeq}
              onChange={(e) =>
                setForm({ ...form, nextSeq: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Live Preview — Next Document Number
          </div>
          <div className="font-mono text-base font-semibold text-emerald-700 dark:text-emerald-300 break-all">
            {preview || "—"}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-border/60">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : <><Save className="size-4 mr-1.5" /> Save</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================== DATA & BACKUP ==============================
function DataBackupTab() {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetting, setResetting] = useState(false);

  // Read last backup timestamp from settings (key: lastBackupAt).
  const { data: settingsData } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });
  const lastBackupAt = settingsData?.settings?.lastBackupAt as
    | string
    | undefined;

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `teamhub-backup-${dateStr}.json`);
      toast.success("Backup exported successfully");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function pickFile() {
    setImportResult(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.name.endsWith(".json")) {
        toast.error("Please select a .json backup file");
        return;
      }
      setPendingFile(file);
      setConfirmImportOpen(true);
    };
    input.click();
  }

  async function performImport() {
    if (!pendingFile) {
      setConfirmImportOpen(false);
      return;
    }
    setConfirmImportOpen(false);
    setImporting(true);
    setImportProgress(10);
    setImportResult(null);
    try {
      const text = await pendingFile.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File is not valid JSON");
      }
      if (!parsed || !parsed.tables) {
        throw new Error("Invalid backup file: missing `tables` object");
      }
      setImportProgress(40);
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      setImportProgress(80);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }
      setImportResult(json);
      setImportProgress(100);
      toast.success("Backup imported successfully");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
      setImportProgress(0);
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }

  async function performReset() {
    if (resetText !== "DELETE") {
      toast.error('You must type "DELETE" to confirm');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/backup/reset?confirm=DELETE", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Reset failed");
      }
      toast.success("All data reset (Users and Company preserved)");
      setResetOpen(false);
      setResetText("");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                <Download className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Export Backup</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download all HR data as a JSON file. Keep it somewhere safe —
                  you can restore from it later.
                </p>
              </div>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="flex-shrink-0">
              {exporting ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Exporting…
                </>
              ) : (
                <>
                  <Download className="size-4 mr-1.5" /> Export Backup
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Included in backup
              </div>
              <ul className="text-sm space-y-1.5 text-foreground/80">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> All employees
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Attendance &
                  leave records
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Payroll &
                  payslips
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Documents &
                  templates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Departments,
                  roles, designations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Settings &
                  email config (passwords excluded)
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Last backup
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  {lastBackupAt
                    ? formatDate(lastBackupAt, "datetime")
                    : "Never — exports not yet run"}
                </div>
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="size-3.5 mt-0.5 flex-shrink-0" />
                User passwords are excluded from the export for security.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                <Upload className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Import Backup</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restore data from a previously exported JSON backup file.
                  Existing records will be updated; new ones will be created.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={pickFile}
              disabled={importing}
              className="flex-shrink-0"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1.5" /> Import Backup
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <TriangleAlert className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <div className="font-medium">This will overwrite existing data.</div>
              <p className="text-xs mt-0.5 opacity-90">
                Make sure you have a current backup before importing. The
                operation cannot be undone.
              </p>
            </div>
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">
                Restoring data… {importProgress}%
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <Check className="size-4" />
                Import complete —{" "}
                {Object.entries(importResult.imported || {}).reduce(
                  (sum, [, n]) => sum + (n as number),
                  0
                )}{" "}
                records restored
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(importResult.imported || {})
                  .filter(([, n]) => (n as number) > 0)
                  .map(([key, n]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded bg-background/60 px-2 py-1 border border-border/40"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {n as number}
                      </span>
                    </div>
                  ))}
              </div>
              {importResult.errors?.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <div className="font-medium mb-1">
                    {importResult.errors.length} table(s) had partial errors:
                  </div>
                  <ul className="list-disc ml-4 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map(
                      (err: any, i: number) => (
                        <li key={i}>
                          {err.table}
                          {err.count ? ` (${err.count} rows)` : ""}: {err.message}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              <div className="text-[11px] text-muted-foreground">
                Restored from backup exported at{" "}
                {importResult.meta?.exportedAt
                  ? formatDate(importResult.meta.exportedAt, "datetime")
                  : "unknown date"}
                .
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-rose-500/40 shadow-soft">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3 pb-3 border-b border-rose-500/20">
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
              <TriangleAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-rose-700 dark:text-rose-300">
                Danger Zone
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Destructive actions. These cannot be undone — proceed with
                extreme caution.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Reset all data</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deletes every record across all tables except{" "}
                <span className="font-medium text-foreground">Users</span> and{" "}
                <span className="font-medium text-foreground">Company</span>.
                You will need to re-import or re-enter all HR data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setResetOpen(true)}
              disabled={resetting}
              className="flex-shrink-0"
            >
              <TriangleAlert className="size-4 mr-1.5" /> Reset all data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation: Import */}
      <AlertDialog open={confirmImportOpen} onOpenChange={setConfirmImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite existing data with the contents of{" "}
              <span className="font-medium text-foreground">
                {pendingFile?.name}
              </span>
              . The operation cannot be undone. Make sure you have a current
              backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingFile(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={performImport}>
              Yes, import &amp; overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation: Reset */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will permanently delete every record across all tables
                  except Users and Company.{" "}
                  <span className="font-semibold text-rose-600">
                    This cannot be undone.
                  </span>
                </p>
                <p>
                  To confirm, type{" "}
                  <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">
                    DELETE
                  </span>{" "}
                  below:
                </p>
                <Input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setResetText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performReset}
              disabled={resetText !== "DELETE" || resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Resetting…
                </>
              ) : (
                <>
                  <TriangleAlert className="size-4 mr-1.5" /> Reset everything
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================== Shared bits ==============================
function SimpleTableHeader({
  title,
  description,
  onAdd,
}: {
  title: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between pb-4 mb-2 border-b border-border/60">
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="size-4 mr-1.5" /> Add
      </Button>
    </div>
  );
}

function RowMenu({
  onEdit,
  onArchive,
}: {
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-rose-600 focus:text-rose-700"
          onClick={onArchive}
        >
          <Archive className="size-4 mr-2" /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
      ))}
    </div>
  );
}

interface Field {
  key: string;
  label: string;
  required?: boolean;
  textarea?: boolean;
  type?: "text" | "number" | "color" | "switch" | "select";
  options?: { value: string; label: string }[];
  allowNone?: boolean;
}

function SimpleFormDialog({
  title,
  open,
  onOpenChange,
  fields,
  initial,
  onSubmit,
}: {
  title: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: Field[];
  initial: any;
  onSubmit: (form: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  async function submit() {
    for (const f of fields) {
      if (f.required && !form[f.key]) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit(form);
      toast.success("Saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div
              key={f.key}
              className={cn("space-y-1.5", f.textarea && "sm:col-span-2")}
            >
              <Label>{f.label}</Label>
              {f.textarea ? (
                <Textarea
                  rows={2}
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                />
              ) : f.type === "select" ? (
                <Select
                  value={form[f.key] || (f.allowNone ? "NONE" : "")}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      [f.key]: f.allowNone && v === "NONE" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.allowNone && <SelectItem value="NONE">None</SelectItem>}
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={!!form[f.key]}
                    onCheckedChange={(v) => setForm({ ...form, [f.key]: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form[f.key] ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ) : f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[f.key] ?? "#10b981"}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    className="size-9 rounded-md border border-border cursor-pointer"
                  />
                  <Input
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                </div>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.key]:
                        f.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
