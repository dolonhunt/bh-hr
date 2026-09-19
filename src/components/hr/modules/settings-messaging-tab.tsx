"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  Send,
  Loader2,
  Info,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// =============================================================
// Settings → SMS & WhatsApp tab
//
// Owns the SMS/WhatsApp gateway configuration used by
// announcement SMS/WhatsApp blasts (POST /api/announcements/[id]/sms-blast)
// and the test send (POST /api/settings/test-sms):
//   * gateway config (Setting KV "smsGatewayConfig" — JSON
//     { endpoint, apiKey, senderId }), env fallback SMS_*
//   * delivery mode readout (live gateway vs simulated)
//   * test send with a channel toggle
// =============================================================

interface StoredSmsConfig {
  endpoint?: string;
  apiKey?: string;
  senderId?: string;
}

export function MessagingTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const settings = data?.settings ?? {};
  const smsMode = data?.smsMode?.mode === "gateway" ? "gateway" : "simulated";
  const smsSource = data?.smsMode?.source ?? null;

  const stored: StoredSmsConfig = (() => {
    try {
      return settings.smsGatewayConfig
        ? JSON.parse(settings.smsGatewayConfig)
        : {};
    } catch {
      return {};
    }
  })();

  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [senderId, setSenderId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const endpointValue = endpoint ?? stored.endpoint ?? "";
  const apiKeyValue = apiKey ?? stored.apiKey ?? "";
  const senderIdValue = senderId ?? stored.senderId ?? "";

  const [testChannel, setTestChannel] = useState<"SMS" | "WHATSAPP">("SMS");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  async function saveConfig() {
    const ep = endpointValue.trim();
    if (ep && !/^https?:\/\//i.test(ep)) {
      toast.error("Endpoint must be a valid http(s) URL.");
      return;
    }
    setSaving(true);
    try {
      const value = JSON.stringify({
        endpoint: ep,
        apiKey: apiKeyValue.trim(),
        senderId: senderIdValue.trim(),
      });
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: [{ key: "smsGatewayConfig", value }] }),
      });
      if (!r.ok) throw new Error("Failed to save gateway config");
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success(
        ep
          ? "SMS gateway saved — announcement blasts will use real delivery."
          : "Gateway config saved — no endpoint set, sends stay simulated."
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to save gateway config");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo.trim()) {
      toast.error("Enter a phone number to send the test to.");
      return;
    }
    setTesting(true);
    try {
      const r = await fetch("/api/settings/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo, channel: testChannel }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Test send failed");
      toast.success(
        body.mode === "gateway"
          ? `Test ${testChannel === "WHATSAPP" ? "WhatsApp" : "SMS"} delivered to ${body.to}.`
          : `Test ${testChannel === "WHATSAPP" ? "WhatsApp" : "SMS"} logged (simulated) for ${body.to}.`
      );
    } catch (e: any) {
      toast.error(e?.message || "Test send failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="size-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">SMS & WhatsApp Gateway</h3>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md cursor-default",
                      smsMode === "gateway"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {smsMode === "gateway" ? "Live gateway" : "Simulated"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  Announcements can be sent as SMS or WhatsApp messages to every
                  active employee with a phone number on file. Configure your
                  provider&apos;s endpoint here — or via the{" "}
                  <span className="font-mono text-[11px]">SMS_ENDPOINT</span> /{" "}
                  <span className="font-mono text-[11px]">SMS_API_KEY</span> /{" "}
                  <span className="font-mono text-[11px]">SMS_SENDER_ID</span>{" "}
                  environment variables.
                </p>
              </div>
            </div>
          </div>

          {/* Delivery-mode banner */}
          <div
            className={cn(
              "rounded-lg border px-3.5 py-3 text-xs",
              smsMode === "gateway"
                ? "border-primary/25 bg-primary/5"
                : "border-amber-500/25 bg-amber-500/5"
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {smsMode === "gateway" ? (
                <>
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span className="text-primary">Live gateway mode</span>
                  <span className="text-muted-foreground font-normal">
                    — via {smsSource === "env" ? "environment variables" : "Settings"}{" "}
                    {data?.smsMode?.senderId ? `· sender "${data.smsMode.senderId}"` : ""}
                  </span>
                </>
              ) : (
                <>
                  <Info className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-700 dark:text-amber-400">
                    Simulated mode
                  </span>
                  <span className="text-muted-foreground font-normal">
                    — no SMS gateway configured
                  </span>
                </>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {smsMode === "gateway"
                ? "Announcement blasts and test messages are delivered through your provider. Failures are logged with the gateway's exact error."
                : "Messages are recorded with status Sent and a \"Simulated send\" note so the flow stays fully auditable without a provider. Add an endpoint below to go live."}
            </p>
          </div>

          {/* Gateway config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sms-endpoint" className="text-xs">
                Gateway endpoint URL *
              </Label>
              <Input
                id="sms-endpoint"
                type="url"
                placeholder="https://sms-provider.com/v1/send"
                value={endpointValue}
                onChange={(e) => setEndpoint(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Messages are POSTed as JSON{" "}
                <span className="font-mono">
                  {`{ to, from, message, channel }`}
                </span>{" "}
                with a Bearer auth header — the common aggregator contract.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sms-api-key" className="text-xs">
                API key
              </Label>
              <div className="relative">
                <Input
                  id="sms-api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="••••••••"
                  value={apiKeyValue}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sms-sender-id" className="text-xs">
                Sender ID (optional)
              </Label>
              <Input
                id="sms-sender-id"
                type="text"
                placeholder="BH-HR"
                value={senderIdValue}
                onChange={(e) => setSenderId(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={saving}
              onClick={saveConfig}
            >
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              Save gateway
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test send */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Test message</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Sends a short test through the configured gateway (or records a
                simulated one). Every test is logged in Documents → Messages.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
                {(
                  [
                    ["SMS", "SMS", Smartphone],
                    ["WHATSAPP", "WhatsApp", MessageSquare],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setTestChannel(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      testChannel === key
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="sms-test-to" className="text-xs">
                Phone number
              </Label>
              <Input
                id="sms-test-to"
                type="tel"
                placeholder="01700-000000 or +8801700000000"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={testing || !testTo.trim()}
              onClick={sendTest}
            >
              {testing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              Send test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auditing note */}
      <Card className="border-border/60 shadow-soft bg-muted/20">
        <CardContent className="p-4 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every send — blast or test — writes a{" "}
            <span className="font-medium text-foreground">MessageLog</span> row
            and an audit entry, visible in{" "}
            <span className="font-medium text-foreground">
              Documents → Messages
            </span>
            . Failed gateway deliveries are kept with the provider&apos;s exact
            error so nothing disappears silently.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
