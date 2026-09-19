import { db } from "@/lib/db";

// =============================================================
// lib/sms.ts — SMS / WhatsApp gateway (real HTTP provider with
// graceful simulated fallback), mirroring lib/mailer.ts.
//
// Configuration resolution order:
//   1. Setting KV "smsGatewayConfig" — JSON string:
//      { endpoint, apiKey, senderId }
//      (Settings → SMS & WhatsApp)
//   2. Environment: SMS_ENDPOINT + SMS_API_KEY (+ SMS_SENDER_ID)
//
// When neither is configured, the gateway runs in SIMULATED mode:
// every send is recorded as SENT with a "Simulated send" note so
// the demo stays fully auditable without touching a real provider.
// =============================================================

export interface SmsConfig {
  endpoint: string;
  apiKey: string;
  senderId: string;
  source: "database" | "env";
}

interface StoredSmsConfig {
  endpoint?: string;
  apiKey?: string;
  senderId?: string;
}

export async function getSmsConfig(): Promise<SmsConfig | null> {
  // 1. Database config (Settings → SMS & WhatsApp)
  const kv = await db.setting.findUnique({
    where: { key: "smsGatewayConfig" },
  });
  if (kv?.value) {
    try {
      const parsed = JSON.parse(kv.value) as StoredSmsConfig;
      // A stored endpoint is the minimum bar for "configured" — an
      // endpoint without an API key would be a doomed real session.
      if (parsed.endpoint?.trim()) {
        return {
          endpoint: parsed.endpoint.trim(),
          apiKey: parsed.apiKey?.trim() ?? "",
          senderId: parsed.senderId?.trim() ?? "",
          source: "database",
        };
      }
    } catch {
      // Malformed JSON → treat as unconfigured
    }
  }

  // 2. Environment fallback
  const endpoint = process.env.SMS_ENDPOINT?.trim();
  if (endpoint) {
    return {
      endpoint,
      apiKey: process.env.SMS_API_KEY?.trim() ?? "",
      senderId: process.env.SMS_SENDER_ID?.trim() ?? "",
      source: "env",
    };
  }

  return null;
}

export interface SmsSendResult {
  delivered: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a text message through the configured gateway.
 *
 * Uses a generic JSON contract — most BD SMS aggregators (and the
 * WhatsApp Cloud API behind a relay) accept a POST with recipient,
 * sender and body. The exact shape:
 *
 *   POST {endpoint}
 *   Authorization: Bearer {apiKey}
 *   { "to": "...", "from": "{senderId}", "message": "...", "channel": "SMS"|"WHATSAPP" }
 *
 * Any 2xx response counts as accepted for delivery.
 */
export async function sendMessageViaGateway(
  config: SmsConfig,
  opts: { to: string; body: string; channel: "SMS" | "WHATSAPP" }
): Promise<SmsSendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        to: opts.to,
        from: config.senderId || undefined,
        message: opts.body,
        channel: opts.channel,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      return {
        delivered: false,
        error: `Gateway responded ${res.status}${text ? `: ${text}` : ""}`,
      };
    }

    let messageId: string | undefined;
    try {
      const json = (await res.json()) as { messageId?: string; id?: string };
      messageId = json.messageId ?? json.id;
    } catch {
      // Non-JSON 2xx body — still a successful accept
    }
    return { delivered: true, messageId };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Gateway connection timed out (15s)"
          : err.message
        : "Unknown gateway error";
    return { delivered: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Normalize Bangladeshi phone numbers to E.164 (+8801XXXXXXXXX):
 * "+8801XXXXXXXXX" | "8801XXXXXXXXX" | "01XXXXXXXXX" | "1XXXXXXXXX".
 * Returns null when the input doesn't look like a usable BD mobile.
 */
export function normalizeBdPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;

  let n = digits;
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("880")) n = n.slice(3);
  if (n.startsWith("0")) n = n.slice(1);

  // BD mobile numbers are 1XXXXXXXXX (10 digits after country code)
  if (/^1\d{9}$/.test(n)) return `+880${n}`;

  // Not a recognizable BD mobile — return as-is if it has a plausible
  // international shape (gateway's job to interpret), else null.
  if (/^\d{8,15}$/.test(n)) return `+${n}`;
  return null;
}

export function formatBdPhone(e164: string): string {
  // +8801XXXXXXXXX → +880 1XXXXXXXXX (readable grouping)
  if (e164.startsWith("+880") && e164.length === 14) {
    return `+880 ${e164.slice(4, 7)}-${e164.slice(7)}`;
  }
  return e164;
}
