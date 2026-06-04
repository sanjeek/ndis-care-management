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
  | "payroll_export";

type EmailInput = {
  type: EmailNotificationType;
  to: string[];
  subject: string;
  text: string;
  html?: string;
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
    return { sent: 0, skipped: 1 };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    await Promise.all(recipients.map((recipient) => logNotification(client, input, recipient, "skipped", "Email provider is not configured.")));
    return { sent: 0, skipped: recipients.length };
  }

  let sent = 0;
  let failed = 0;

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
          html: input.html || textToHtml(input.text)
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        failed += 1;
        await logNotification(client, input, recipient, "failed", String(result.message || result.error || response.statusText));
      } else {
        sent += 1;
        await logNotification(client, input, recipient, "sent", null, String(result.id ?? ""));
      }
    } catch (error) {
      failed += 1;
      await logNotification(client, input, recipient, "failed", error instanceof Error ? error.message : "Email send failed.");
    }
  }

  return { sent, failed };
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
