import nodemailer from "nodemailer";
import { db } from "@/lib/db";

// ============================================================
// Server-side SMTP mailer.
//
// Configuration resolution order:
//   1. EmailSetting row (Settings → Email Settings tab) — used when
//      `smtpHost` is filled in.
//   2. Environment variables (SMTP_HOST / SMTP_PORT / SMTP_USER /
//      SMTP_PASS / SMTP_FROM) — useful for Vercel deployments where
//      admins prefer not to store credentials in the DB.
//   3. null → caller falls back to simulated send (EmailLog notes it).
// ============================================================

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS (usually 465)
  user: string | null;
  pass: string | null;
  fromName: string;
  fromEmail: string;
  source: "db" | "env";
}

export interface SendResult {
  delivered: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  mode: "smtp" | "simulated";
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const es = await db.emailSetting.findFirst({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (es?.smtpHost && es.senderEmail) {
    // A username without a password is an incomplete configuration — treat it
    // as not-configured so the app stays in honest simulated mode instead of
    // attempting an SMTP session that will be rejected (e.g. Gmail 530).
    const authComplete = es.username ? !!es.password : true;
    if (!authComplete) {
      return null;
    }
    // SSL → implicit TLS on the given port (typically 465).
    // TLS/STARTTLS and NONE → plain connection, upgrading via STARTTLS
    // when the server advertises it.
    const secure = (es.encryption ?? "TLS") === "SSL";
    return {
      host: es.smtpHost,
      port: es.smtpPort ?? (secure ? 465 : 587),
      secure,
      user: es.username || null,
      pass: es.password || null,
      fromName: es.senderName || "BH HR",
      fromEmail: es.senderEmail,
      source: "db",
    };
  }

  // Environment fallback.
  const envHost = process.env.SMTP_HOST;
  const envFrom = process.env.SMTP_FROM;
  if (envHost && envFrom) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    return {
      host: envHost,
      port,
      secure: port === 465,
      user: process.env.SMTP_USER ?? null,
      pass: process.env.SMTP_PASS ?? null,
      fromName: process.env.SMTP_FROM_NAME || "BH HR",
      fromEmail: envFrom,
      source: "env",
    };
  }

  return null;
}

export async function sendViaSmtp(
  cfg: SmtpConfig,
  opts: {
    to: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }
): Promise<SendResult> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth:
      cfg.user && cfg.pass
        ? { user: cfg.user, pass: cfg.pass }
        : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: opts.to,
      cc: opts.cc || undefined,
      bcc: opts.bcc || undefined,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments,
    });
    return {
      delivered: true,
      simulated: false,
      messageId: info.messageId,
      mode: "smtp",
    };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    return {
      delivered: false,
      simulated: false,
      error: err.message
        ? `${err.code ? `${err.code}: ` : ""}${err.message}`
        : "Unknown SMTP error",
      mode: "smtp",
    };
  }
}

/** Wraps a plain-text body in a minimal, email-client-safe HTML shell. */
export function textToEmailHtml(text: string, opts?: { heading?: string; footer?: string }): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return [
    '<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a1a;">',
    opts?.heading
      ? `<h2 style="font-size:18px;margin:0 0 12px;color:#0f766e;">${esc(opts.heading)}</h2>`
      : "",
    `<div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${esc(text)}</div>`,
    opts?.footer
      ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 8px;" /><p style="font-size:11px;color:#9ca3af;margin:0;">${esc(opts.footer)}</p>`
      : "",
    "</div>",
  ].join("");
}
