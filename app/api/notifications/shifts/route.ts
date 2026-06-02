import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

type ShiftNotificationRow = {
  id: string;
  participant_name: string;
  support_worker_name: string | null;
  support_worker_email: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: string | null;
  clock_in_at: string | null;
};

async function authorise(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(request.url).searchParams.get("secret");
  if (request.headers.get("x-vercel-cron") === "1" || new URL(request.url).searchParams.get("cron") === "1") {
    if (cronSecret && suppliedSecret !== cronSecret) {
      return { response: NextResponse.json({ message: "Invalid cron secret." }, { status: 401 }) };
    }
    return {
      user: {
        id: null,
        email: "vercel-cron",
        name: "Vercel Cron",
        role: "system"
      }
    };
  }

  const auth = await requireApiUser(request);
  if ("response" in auth) return auth;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return { response: NextResponse.json({ message: "Only admin or team leader users can run shift notification checks." }, { status: 403 }) };
  }
  return { user: auth.user };
}

export async function GET(request: Request) {
  return runShiftNotifications(request);
}

export async function POST(request: Request) {
  return runShiftNotifications(request);
}

async function runShiftNotifications(request: Request) {
  const auth = await authorise(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const now = new Date();
  const reminderFrom = now.toISOString();
  const reminderTo = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const missedBefore = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const reminderRows = await admin
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, status, clock_in_at")
    .gte("starts_at", reminderFrom)
    .lte("starts_at", reminderTo)
    .neq("status", "Cancelled")
    .is("clock_in_at", null);
  const missedRows = await admin
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, status, clock_in_at")
    .lt("starts_at", missedBefore)
    .neq("status", "Cancelled")
    .is("clock_in_at", null)
    .limit(100);

  if (reminderRows.error) return NextResponse.json({ message: reminderRows.error.message }, { status: 400 });
  if (missedRows.error) return NextResponse.json({ message: missedRows.error.message }, { status: 400 });

  let reminders = 0;
  let missedClockIns = 0;
  for (const shift of (reminderRows.data ?? []) as ShiftNotificationRow[]) {
    if (await alreadySent(admin, "shift_reminder", shift.id)) continue;
    if (!shift.support_worker_email) continue;
    await notifyCareEvent(admin, {
      type: "shift_reminder",
      to: [shift.support_worker_email],
      title: "Upcoming shift reminder",
      body: `${shift.participant_name} shift starts ${formatDateTime(shift.starts_at)}.`,
      linkUrl: "/worker-portal",
      subject: `Shift reminder: ${shift.participant_name}`,
      text: [
        "Reminder: you have an upcoming shift.",
        `Participant: ${shift.participant_name}`,
        `Start: ${formatDateTime(shift.starts_at)}`,
        `End: ${formatDateTime(shift.ends_at)}`,
        `Location: ${shift.location || "Not recorded"}`,
        `Open worker portal: ${appUrl("/worker-portal")}`
      ].join("\n"),
      metadata: { shiftId: shift.id, event: "shift_reminder", startsAt: shift.starts_at }
    });
    reminders += 1;
  }

  const adminRecipients = await getAdminNotificationRecipients(admin, { fallback: [auth.user.email] });
  for (const shift of (missedRows.data ?? []) as ShiftNotificationRow[]) {
    if (await alreadySent(admin, "missed_clock_in", shift.id)) continue;
    const recipients = Array.from(new Set([shift.support_worker_email ?? "", ...adminRecipients].filter(Boolean)));
    await notifyCareEvent(admin, {
      type: "missed_clock_in",
      to: recipients,
      title: "Missed clock-in alert",
      body: `${shift.support_worker_name || "Support worker"} has not clocked in for ${shift.participant_name}.`,
      linkUrl: "/rostering",
      subject: `Missed clock-in: ${shift.participant_name}`,
      text: [
        "A scheduled shift has passed its start time without a clock-in.",
        `Participant: ${shift.participant_name}`,
        `Support worker: ${shift.support_worker_name || "Not recorded"} (${shift.support_worker_email || "No email"})`,
        `Start: ${formatDateTime(shift.starts_at)}`,
        `Location: ${shift.location || "Not recorded"}`,
        `Open roster: ${appUrl("/rostering")}`
      ].join("\n"),
      metadata: { shiftId: shift.id, event: "missed_clock_in", startsAt: shift.starts_at }
    });
    missedClockIns += 1;
  }

  await recordServerAudit(admin, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "shift_notification_check",
    tableName: "shifts",
    recordLabel: "Shift notifications",
    metadata: { reminders, missedClockIns, reminderWindowHours: 24, missedClockInGraceMinutes: 15 }
  });

  return NextResponse.json({ message: "Shift notification check complete.", reminders, missedClockIns });
}

async function alreadySent(client: ReturnType<typeof serviceClient>, type: "shift_reminder" | "missed_clock_in", shiftId: string) {
  if (!client) return false;
  const { data } = await client
    .from("app_notifications")
    .select("id")
    .eq("notification_type", type)
    .contains("metadata", { shiftId, event: type })
    .limit(1);
  return Boolean(data?.length);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
