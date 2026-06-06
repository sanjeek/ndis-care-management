import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailNotificationType =
  | "new_shift"
  | "incident_report"
  | "password_reset"
  | "participant_update"
  | "document_upload"
  | "worker_availability"
  | "worker_leave"
  | "document_expiry"
  | "shift_change"
  | "shift_cancellation"
  | "shift_acceptance"
  | "shift_reminder"
  | "missed_clock_in"
  | "contractor_invoice"
  | "payroll_export"
  | "operations_update"
  | "worker_invite"
  | "user_account_created";

type EmailInput = {
  type: EmailNotificationType;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
};

type AdminRecipientOptions = {
  fallback?: string[];
};

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(","))
        .map((value) => value.trim().toLowerCase())
        .filter((value) => /\S+@\S+\.\S+/.test(value))
    )
  );
}

export async function getAdminNotificationRecipients(client: SupabaseClient, options: AdminRecipientOptions = {}) {
  const configured = uniqueEmails([process.env.NOTIFICATION_EMAIL_TO, process.env.ADMIN_NOTIFICATION_EMAIL]);
  const { data } = await client.from("profiles").select("email").eq("role", "admin").eq("active", true);
  return uniqueEmails([...configured, ...(data ?? []).map((profile) => String(profile.email ?? "")), ...(options.fallback ?? [])]);
}

export function appUrl(path = "") {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");
  const base = site.startsWith("http") ? site : `https://${site}`;
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function sendCareNotification(client: SupabaseClient, input: EmailInput) {
  const recipients = uniqueEmails(input.to);
  if (!recipients.length) {
    await logNotification(client, input, "", "skipped", "No notification recipient was available.");
    return { sent: 0, failed: 0, errors: [] as string[] };
  }

  // Gmail SMTP takes priority if configured
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return sendViaGmail(client, input, recipients, gmailUser, gmailPass);
  }

  // Fall back to Resend
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !apiKey.startsWith("re_") || !from) {
    await Promise.all(recipients.map((recipient) => logNotification(client, input, recipient, "skipped", "Email provider is not configured.")));
    return { sent: 0, failed: 0, errors: [] as string[] };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: recipient,
          subject: input.subject,
          text: input.text,
          html: input.html || textToHtml(input.text),
          ...(input.replyTo ? { reply_to: input.replyTo } : {})
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        failed += 1;
        const errMsg = String(result.message || result.error || response.statusText);
        errors.push(errMsg);
        await logNotification(client, input, recipient, "failed", errMsg);
      } else {
        sent += 1;
        await logNotification(client, input, recipient, "sent", null, String(result.id ?? ""));
      }
    } catch (error) {
      failed += 1;
      const errMsg = error instanceof Error ? error.message : "Email send failed.";
      errors.push(errMsg);
      await logNotification(client, input, recipient, "failed", errMsg);
    }
  }

  return { sent, failed, errors };
}

async function sendViaGmail(
  client: SupabaseClient,
  input: EmailInput,
  recipients: string[],
  user: string,
  pass: string
) {
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass }
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: `CareOS <${user}>`,
        to: recipient,
        subject: input.subject,
        text: input.text,
        html: input.html || textToHtml(input.text)
      });
      sent += 1;
      await logNotification(client, input, recipient, "sent", null, "gmail");
    } catch (error) {
      failed += 1;
      const errMsg = error instanceof Error ? error.message : "Gmail send failed.";
      errors.push(errMsg);
      await logNotification(client, input, recipient, "failed", errMsg);
    }
  }

  return { sent, failed, errors };
}

async function logNotification(
  client: SupabaseClient,
  input: EmailInput,
  recipient: string,
  status: "sent" | "failed" | "skipped",
  errorMessage: string | null,
  providerMessageId = ""
) {
  await client.from("email_notifications").insert({
    notification_type: input.type,
    recipient_email: recipient || null,
    subject: input.subject,
    status,
    provider: "resend",
    provider_message_id: providerMessageId || null,
    error_message: errorMessage,
    metadata: input.metadata ?? {}
  });
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">${escapeHtml(text).replace(/\n/g, "<br />")}</div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character] ?? character;
  });
}
