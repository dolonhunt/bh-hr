"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo, BrandMark } from "@/components/brand/brand-logo";
import { StatusBadge } from "@/components/hr/shared/status-badge";
import { EmptyState } from "@/components/hr/shared/empty-state";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Plus,
  Search,
  Star,
  Users,
} from "lucide-react";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10 lg:p-14">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <BrandLogo className="h-10" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">BH HR Design System</h1>
          <p className="text-muted-foreground">Visual source of truth for the BH HR application.</p>
        </div>

        {/* Foundations */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Foundations</h2>

          {/* Colors */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Background", value: "#EFEDE6", class: "bg-background" },
                { name: "Primary (Teal)", value: "#0D5C5A", class: "bg-primary text-primary-foreground" },
                { name: "Accent", value: "#D4E8E7", class: "bg-accent text-accent-foreground" },
                { name: "Muted", value: "#E5E2D8", class: "bg-muted" },
                { name: "Success", value: "#4A8B6F", class: "bg-success text-success-foreground" },
                { name: "Warning", value: "#C49450", class: "bg-warning text-warning-foreground" },
                { name: "Destructive", value: "#C75450", class: "bg-destructive text-destructive-foreground" },
                { name: "Info", value: "#5A8AAF", class: "bg-info text-info-foreground" },
              ].map((c) => (
                <div key={c.name} className={`rounded-xl p-4 ${c.class}`}>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs opacity-70 font-mono">{c.value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold tracking-tight">Page Title</div>
              </div>
              <div>
                <div className="text-lg font-semibold">Section Title</div>
              </div>
              <div>
                <div className="text-base font-medium">Card Title</div>
              </div>
              <div>
                <div className="text-sm">Body text — readable and clean.</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Secondary / Caption text</div>
              </div>
            </CardContent>
          </Card>

          {/* Radius & Shadows */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Radius &amp; Surfaces</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neu-raised rounded-lg p-4 text-center text-sm">Raised<br/><span className="text-xs text-muted-foreground">Cards, KPIs</span></div>
              <div className="neu-inset rounded-lg p-4 text-center text-sm">Inset<br/><span className="text-xs text-muted-foreground">Inputs, Search</span></div>
              <div className="neu-pressed rounded-lg p-4 text-center text-sm">Pressed<br/><span className="text-xs text-muted-foreground">Active, Toggle</span></div>
              <div className="neu-flat rounded-lg p-4 text-center text-sm border border-border">Flat<br/><span className="text-xs text-muted-foreground">Tables, BG</span></div>
            </CardContent>
          </Card>
        </section>

        {/* Components */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Components</h2>

          {/* Buttons */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Buttons</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
              <Button><Plus className="size-4 mr-1" />With Icon</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button className="gap-1.5">
                <Loader2 className="size-4 animate-spin" /> Loading
              </Button>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label>Default Input</Label>
                <Input placeholder="Enter text..." />
              </div>
              <div className="space-y-1.5">
                <Label>With Value</Label>
                <Input defaultValue="Beyond Headlines" />
              </div>
              <div className="space-y-1.5">
                <Label>Search Input</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" defaultValue="password" />
              </div>
              <div className="space-y-1.5">
                <Label>Disabled</Label>
                <Input placeholder="Disabled" disabled />
              </div>
            </CardContent>
          </Card>

          {/* Badges & Status */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Badges &amp; Status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="PENDING" />
              <StatusBadge status="APPROVED" />
              <StatusBadge status="REJECTED" />
              <StatusBadge status="SENT" />
              <StatusBadge status="GENERATED" />
              <StatusBadge status="LATE" />
              <StatusBadge status="ON_LEAVE" />
              <StatusBadge status="PAID" />
              <StatusBadge status="DRAFT" />
              <StatusBadge status="HIRED" />
              <StatusBadge status="FAILED" />
            </CardContent>
          </Card>

          {/* Switches & Progress */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Switches &amp; Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="flex items-center justify-between">
                <Label>Toggle Switch</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Toggle Off</Label>
                <Switch />
              </div>
              <div className="space-y-1.5">
                <Label>Progress (75%)</Label>
                <Progress value={75} className="h-2" />
              </div>
              <div className="space-y-1.5">
                <Label>Progress (30%)</Label>
                <Progress value={30} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Tabs</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="tab1">
                <TabsList>
                  <TabsTrigger value="tab1">Active Tab</TabsTrigger>
                  <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
                  <TabsTrigger value="tab3">Third Tab</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Avatars */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Avatars</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-8"><AvatarFallback className="bg-accent text-accent-foreground text-xs">AH</AvatarFallback></Avatar>
              <Avatar className="size-10"><AvatarFallback className="bg-accent text-accent-foreground text-sm">NK</AvatarFallback></Avatar>
              <Avatar className="size-12"><AvatarFallback className="bg-accent text-accent-foreground">PS</AvatarFallback></Avatar>
              <Avatar className="size-16"><AvatarFallback className="bg-accent text-accent-foreground text-lg">TA</AvatarFallback></Avatar>
            </CardContent>
          </Card>

          {/* Brand */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Brand Assets</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="space-y-2">
                <Label>Full Logo</Label>
                <BrandLogo />
              </div>
              <div className="space-y-2">
                <Label>B Mark</Label>
                <BrandMark size="lg" />
              </div>
              <div className="space-y-2">
                <Label>B Mark (small)</Label>
                <BrandMark size="sm" />
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card className="shadow-soft">
            <CardHeader><CardTitle>Empty State</CardTitle></CardHeader>
            <CardContent>
              <EmptyState
                icon={Users}
                title="No employees found"
                description="Add your first employee to start managing HR records."
                actionLabel="Add Employee"
                onAction={() => {}}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
