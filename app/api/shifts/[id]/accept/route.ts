import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

type ShiftRow = {
  id: string;
  participant_name: string;
  support_worker_name: string | null;
  support_worker_email: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "support_worker" && auth.user.role !== "team_leader" && auth.user.role !== "admin" && auth.user.role !== "super_admin") {
    return NextResponse.json({ message: "Only authorised users can accept an open shift." }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: shift, error } = await auth.client
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, status")
    .eq("id", id)
    .maybeSingle<ShiftRow>();

  if (error || !shift) {
    return NextResponse.json({ message: "Shift not found." }, { status: 404 });
  }

  if (shift.support_worker_email) {
    return NextResponse.json({ message: "This shift is already assigned to a support worker." }, { status: 409 });
  }

  const startsAt = new Date(String(shift.starts_at ?? ""));
  const endsAt = new Date(String(shift.ends_at ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return NextResponse.json({ message: "This shift has invalid start or end times." }, { status: 400 });
  }

  const availabilityConflict = await hasAvailabilityConflict(auth.client, auth.user.email, startsAt, endsAt);
  if (availabilityConflict) {
    return NextResponse.json({ message: "You are marked unavailable during this shift time." }, { status: 409 });
  }

  const leaveConflict = await hasLeaveConflict(auth.client, auth.user.email, startsAt, endsAt);
  if (leaveConflict) {
    return NextResponse.json({ message: "You have approved leave during this shift time." }, { status: 409 });
  }

  const { error: updateError } = await auth.client
    .from("shifts")
    .update({
      support_worker_name: auth.user.name,
      support_worker_email: auth.user.email,
      status: "Confirmed"
    })
    .eq("id", shift.id)
    .or("support_worker_email.is.null,support_worker_email.eq.");

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "shift_acceptance",
    tableName: "shifts",
    recordId: shift.id,
    recordLabel: `${shift.participant_name} open shift`,
    metadata: { participantName: shift.participant_name, startsAt: shift.starts_at, acceptedBy: auth.user.email }
  });

  const adminRecipients = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await notifyCareEvent(auth.client, {
    type: "shift_acceptance",
    to: adminRecipients,
    title: "Open shift accepted",
    body: `${auth.user.name} accepted the ${shift.participant_name} shift.`,
    linkUrl: "/rostering",
    subject: `Open shift accepted: ${shift.participant_name}`,
    text: [
      `${auth.user.name} (${auth.user.email}) accepted an open shift.`,
      `Participant: ${shift.participant_name}`,
      `Start: ${formatDateTime(shift.starts_at)}`,
      `End: ${formatDateTime(shift.ends_at)}`,
      `Location: ${shift.location || "Not recorded"}`,
      `Open roster: ${appUrl("/rostering")}`
    ].join("\n"),
    metadata: { shiftId: shift.id, participantName: shift.participant_name, acceptedBy: auth.user.email }
  });

  return NextResponse.json({ message: "Shift accepted and assigned to your login." });
}

async function hasAvailabilityConflict(client: SupabaseClient, workerEmail: string, startsAt: Date, endsAt: Date) {
  const date = startsAt.toISOString().slice(0, 10);
  const { data } = await client
    .from("worker_availability")
    .select("start_time, end_time, availability_status")
    .eq("worker_email", workerEmail)
    .eq("available_date", date)
    .eq("availability_status", "unavailable");
  return (data ?? []).some((slot) => {
    const slotStart = new Date(`${date}T${String(slot.start_time).slice(0, 5)}`);
    const slotEnd = new Date(`${date}T${String(slot.end_time).slice(0, 5)}`);
    return startsAt < slotEnd && endsAt > slotStart;
  });
}

async function hasLeaveConflict(client: SupabaseClient, workerEmail: string, startsAt: Date, endsAt: Date) {
  const { data } = await client
    .from("worker_leave_requests")
    .select("id")
    .eq("worker_email", workerEmail)
    .eq("status", "approved")
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .limit(1);
  return Boolean(data?.length);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
