import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can create shifts." }, { status: 403 });
  }

  const body = await request.json();
  const participantName = String(body.participant_name ?? "").trim();
  const workerName = String(body.support_worker_name ?? "").trim();
  const workerEmail = String(body.support_worker_email ?? "").trim().toLowerCase();
  const startsAt = String(body.starts_at ?? "").trim();
  const endsAt = String(body.ends_at ?? "").trim();
  const location = String(body.location ?? "").trim();
  const status = String(body.status ?? "Draft").trim() || "Draft";
  const allowedLatitude = Number(body.allowed_latitude);
  const allowedLongitude = Number(body.allowed_longitude);
  const allowedRadiusM = Number(body.allowed_radius_m ?? 250);

  if (!participantName || !workerName || !workerEmail || !startsAt || !endsAt) {
    return NextResponse.json({ message: "Participant, support worker, worker email, start time, and end time are required." }, { status: 400 });
  }
  if (!isValidLatitude(allowedLatitude) || !isValidLongitude(allowedLongitude) || !isValidRadius(allowedRadiusM)) {
    return NextResponse.json({ message: "Valid GPS latitude, longitude, and an allowed radius between 25 and 5000 metres are required." }, { status: 400 });
  }

  const { data: shift, error } = await auth.client
    .from("shifts")
    .insert({
      participant_name: participantName,
      support_worker_name: workerName,
      support_worker_email: workerEmail,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      allowed_latitude: allowedLatitude,
      allowed_longitude: allowedLongitude,
      allowed_radius_m: Math.round(allowedRadiusM)
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "create",
    tableName: "shifts",
    recordId: shift.id,
    recordLabel: `${participantName} shift`,
    metadata: { participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM }
  });

  const adminRecipients = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await sendCareNotification(auth.client, {
    type: "new_shift",
    to: [workerEmail],
    subject: `New shift assigned: ${participantName}`,
    text: [
      `A new shift has been assigned to you.`,
      `Participant: ${participantName}`,
      `Location: ${location || "Not recorded"}`,
      `Start: ${startsAt}`,
      `End: ${endsAt}`,
      `Status: ${status}`,
      `Open worker portal: ${appUrl("/worker-portal")}`
    ].join("\n"),
    metadata: { shiftId: shift.id, participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM }
  });
  await sendCareNotification(auth.client, {
    type: "new_shift",
    to: adminRecipients,
    subject: `Shift created for ${participantName}`,
    text: [
      `Shift created by ${auth.user.name} (${auth.user.email}).`,
      `Participant: ${participantName}`,
      `Support worker: ${workerName} (${workerEmail})`,
      `Start: ${startsAt}`,
      `End: ${endsAt}`,
      `Open roster: ${appUrl("/rostering")}`
    ].join("\n"),
    metadata: { shiftId: shift.id, participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM }
  });

  return NextResponse.json({ message: "Shift saved and notifications recorded.", id: shift.id });
}

function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidRadius(value: number) {
  return Number.isFinite(value) && value >= 25 && value <= 5000;
}
