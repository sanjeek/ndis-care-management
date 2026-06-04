import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const expiryFields = [
  ["Police check", "police_check_expiry"],
  ["NDIS worker screening", "ndis_worker_screening_expiry"],
  ["First aid certificate", "first_aid_expiry"],
  ["CPR", "cpr_expiry"],
  ["Driver's licence", "drivers_licence_expiry"]
] as const;

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can run expiry alerts." }, { status: 403 });
  }

  const { data, error } = await auth.client
    .from("support_workers")
    .select("id, name, email, police_check_expiry, ndis_worker_screening_expiry, first_aid_expiry, cpr_expiry, drivers_licence_expiry")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const alerts = (data ?? []).flatMap((worker) =>
    expiryFields
      .map(([label, field]) => ({
        workerName: String(worker.name ?? ""),
        workerEmail: String(worker.email ?? ""),
        documentType: label,
        expiryDate: String(worker[field] ?? ""),
        days: daysUntil(String(worker[field] ?? ""))
      }))
      .filter((item) => item.days !== null && item.days <= 30)
      .map((item) => ({ ...item, days: item.days ?? 0 }))
  );

  const recipients = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  let created = 0;
  for (const alert of alerts) {
    const key = `${alert.workerEmail}:${alert.documentType}:${alert.expiryDate}`;
    const exists = await alreadySent(auth.client, key);
    if (exists) continue;
    await notifyCareEvent(auth.client, {
      type: "document_expiry",
      to: recipients,
      title: "Compliance document expiry",
      body: `${alert.workerName} ${alert.documentType} ${alert.days < 0 ? "expired" : "expires"} ${friendlyDays(alert.days)}.`,
      linkUrl: "/support-workers",
      subject: `Compliance expiry: ${alert.workerName}`,
      text: [
        "A support worker compliance document needs review.",
        `Worker: ${alert.workerName} (${alert.workerEmail})`,
        `Document: ${alert.documentType}`,
        `Expiry date: ${alert.expiryDate || "Not recorded"}`,
        `Open support workers: ${appUrl("/support-workers")}`
      ].join("\n"),
      metadata: { event: "document_expiry", key, ...alert }
    });
    created += 1;
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "document_expiry_check",
    tableName: "support_workers",
    recordLabel: "Document expiry alerts",
    metadata: { alerts: alerts.length, notificationsCreated: created }
  });

  return NextResponse.json({ message: "Document expiry check complete.", alerts: alerts.length, notificationsCreated: created });
}

async function alreadySent(client: SupabaseClient, key: string) {
  const { data } = await client
    .from("app_notifications")
    .select("id")
    .eq("notification_type", "document_expiry")
    .contains("metadata", { event: "document_expiry", key })
    .limit(1);
  return Boolean(data?.length);
}

function daysUntil(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function friendlyDays(days: number | null) {
  if (days === null) return "date not recorded";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
