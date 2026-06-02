import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCareNotification, type EmailNotificationType } from "@/lib/email-notifications";

type NotificationInput = {
  type: EmailNotificationType;
  to: string[];
  title: string;
  body: string;
  subject?: string;
  text?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  email?: boolean;
};

function uniqueEmails(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => /\S+@\S+\.\S+/.test(value))));
}

export async function createInAppNotification(client: SupabaseClient, input: NotificationInput) {
  const recipients = uniqueEmails(input.to);
  if (!recipients.length) return { created: 0 };

  const profiles = await client.from("profiles").select("id, email").in("email", recipients);
  const userIdsByEmail = new Map((profiles.data ?? []).map((profile) => [String(profile.email ?? "").toLowerCase(), String(profile.id ?? "")]));

  const rows = recipients.map((recipient) => ({
    user_id: userIdsByEmail.get(recipient) || null,
    recipient_email: recipient,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    link_url: input.linkUrl ?? null,
    metadata: input.metadata ?? {}
  }));

  const { error } = await client.from("app_notifications").insert(rows);
  return { created: error ? 0 : rows.length, error };
}

export async function notifyCareEvent(client: SupabaseClient, input: NotificationInput) {
  const inApp = await createInAppNotification(client, input);
  if (input.email === false) return { inApp };

  const email = await sendCareNotification(client, {
    type: input.type,
    to: input.to,
    subject: input.subject || input.title,
    text: input.text || input.body,
    metadata: input.metadata
  });

  return { inApp, email };
}
