"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

export function LoginScreen() {
  const setAuthed = useApp((s) => s.setAuthed);
  const [email, setEmail] = useState("hr@beyondheadlines.io");
  const [password, setPassword] = useState("demo1234");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setAuthed(true, data);
      toast.success(`Welcome back, ${data.name.split(" ")[0]}!`);
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left hero panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground w-full">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
              <img src="/bh-logo.png" alt="BH HR — Beyond Headlines" className="h-12 w-auto object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              BH HR
            </span>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" /> HR Operations Console
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Manage your workforce,
              <br />
              generate HR documents,
              <br />
              deliver to employees — fast.
            </h1>
            <p className="text-primary-foreground/80 max-w-md">
              One unified workspace for employees, attendance, payroll, document
              generation, and direct email delivery. Built for HR teams that
              move fast.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { k: "20+", v: "Employees" },
              { k: "5", v: "Templates" },
              { k: "100%", v: "Audit-traced" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-xl bg-primary-foreground/10 backdrop-blur px-4 py-3"
              >
                <div className="text-2xl font-bold">{s.k}</div>
                <div className="text-xs text-primary-foreground/80">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-soft border-border/60">
          <CardHeader className="space-y-1">
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <img src="/bh-logo.png" alt="BH HR" className="h-8 w-auto object-contain" />
              </div>
              <span className="font-semibold text-lg">BH HR</span>
            </div>
            <CardTitle className="text-2xl">Sign in to your workspace</CardTitle>
            <CardDescription>
              Enter your HR credentials to access the operations console.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hr@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => toast.info("Contact your administrator.")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Demo credentials</div>
                Email: <code className="font-mono">hr@beyondheadlines.io</code>
                <br />
                Password: <code className="font-mono">demo1234</code>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full bg-primary text-primary-foreground neu-raised-sm rounded-xl text-base font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By signing in, you agree to the HR data handling policy.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
