import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
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
  const recurrenceType = String(body.recurrence_type ?? "single").trim();
  const customIntervalDays = Number(body.custom_interval_days ?? 0);
  const recurrenceCount = Math.min(Math.max(Number(body.recurrence_count ?? 1), 1), 60);
  const recurrence = recurrenceConfig(recurrenceType, customIntervalDays, recurrenceCount);

  if (!participantName || !workerName || !workerEmail || !startsAt || !endsAt) {
    return NextResponse.json({ message: "Participant, support worker, worker email, start time, and end time are required." }, { status: 400 });
  }
  if (!isValidLatitude(allowedLatitude) || !isValidLongitude(allowedLongitude) || !isValidRadius(allowedRadiusM)) {
    return NextResponse.json({ message: "Valid GPS latitude, longitude, and an allowed radius between 25 and 5000 metres are required." }, { status: 400 });
  }
  if (!recurrence) {
    return NextResponse.json({ message: "Select a valid recurrence: single, daily, weekly, fortnightly, or custom." }, { status: 400 });
  }

  const seriesId = recurrence.count > 1 ? crypto.randomUUID() : null;
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return NextResponse.json({ message: "Start and end time must be valid, and end time must be after start time." }, { status: 400 });
  }
  const { data: participantBranch } = await auth.client
    .from("participants")
    .select("branch_id")
    .eq("name", participantName)
    .maybeSingle();
  const branchId = String(participantBranch?.branch_id ?? "") || null;
  const durationMs = endDate.getTime() - startDate.getTime();
  const rows = Array.from({ length: recurrence.count }).map((_, index) => {
    const nextStart = new Date(startDate);
    nextStart.setDate(startDate.getDate() + recurrence.intervalDays * index);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    return {
      branch_id: branchId,
      participant_name: participantName,
      support_worker_name: workerName,
      support_worker_email: workerEmail,
      location,
      starts_at: nextStart.toISOString(),
      ends_at: nextEnd.toISOString(),
      status,
      allowed_latitude: allowedLatitude,
      allowed_longitude: allowedLongitude,
      allowed_radius_m: Math.round(allowedRadiusM),
      recurrence_series_id: seriesId,
      recurrence_type: recurrence.type,
      recurrence_interval_days: recurrence.intervalDays,
      recurrence_count: recurrence.count,
      recurrence_position: index + 1
    };
  });

  const unavailableConflict = await findUnavailableConflict(auth.client, workerEmail, rows);
  if (unavailableConflict) {
    return NextResponse.json(
      {
        message: `${workerName} is unavailable on ${formatDate(unavailableConflict.shiftStart)} from ${unavailableConflict.startTime} to ${unavailableConflict.endTime}. Shift booking blocked.`
      },
      { status: 409 }
    );
  }

  const leaveConflict = await findApprovedLeaveConflict(auth.client, workerEmail, rows);
  if (leaveConflict) {
    return NextResponse.json(
      {
        message: `${workerName} has approved ${friendlyLeaveType(leaveConflict.leaveType)} from ${formatDateTime(leaveConflict.startsAt)} to ${formatDateTime(leaveConflict.endsAt)}. Shift booking blocked.`
      },
      { status: 409 }
    );
  }

  const { data: shifts, error } = await auth.client
    .from("shifts")
    .insert(rows)
    .select("id");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  const firstShiftId = shifts?.[0]?.id ?? "";

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "create",
    tableName: "shifts",
    recordId: firstShiftId,
    recordLabel: `${participantName} shift`,
    metadata: { branchId, participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM, recurrence, seriesId, createdCount: rows.length }
  });

  const adminRecipients = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await notifyCareEvent(auth.client, {
    type: "new_shift",
    to: [workerEmail],
    title: rows.length > 1 ? `${rows.length} new recurring shifts` : "New shift assigned",
    body: rows.length > 1 ? `${participantName} recurring shifts have been assigned to you.` : `${participantName} shift has been assigned to you.`,
    linkUrl: "/worker-portal",
    subject: rows.length > 1 ? `New recurring shifts assigned: ${participantName}` : `New shift assigned: ${participantName}`,
    text: [
      rows.length > 1 ? `${rows.length} recurring shifts have been assigned to you.` : `A new shift has been assigned to you.`,
      `Participant: ${participantName}`,
      `Location: ${location || "Not recorded"}`,
      `Start: ${startsAt}`,
      `End: ${endsAt}`,
      `Recurrence: ${recurrenceLabel(recurrence.type, recurrence.intervalDays, recurrence.count)}`,
      `Status: ${status}`,
      `Open worker portal: ${appUrl("/worker-portal")}`
    ].join("\n"),
    metadata: { shiftId: firstShiftId, seriesId, participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM, recurrence, createdCount: rows.length }
  });
  await notifyCareEvent(auth.client, {
    type: "new_shift",
    to: adminRecipients,
    title: rows.length > 1 ? "Recurring shift series created" : "Shift created",
    body: rows.length > 1 ? `${rows.length} shifts created for ${participantName}.` : `${participantName} shift created for ${workerName}.`,
    linkUrl: "/rostering",
    subject: rows.length > 1 ? `Recurring shift series created for ${participantName}` : `Shift created for ${participantName}`,
    text: [
      rows.length > 1 ? `${rows.length} shifts created by ${auth.user.name} (${auth.user.email}).` : `Shift created by ${auth.user.name} (${auth.user.email}).`,
      `Participant: ${participantName}`,
      `Support worker: ${workerName} (${workerEmail})`,
      `Start: ${startsAt}`,
      `End: ${endsAt}`,
      `Recurrence: ${recurrenceLabel(recurrence.type, recurrence.intervalDays, recurrence.count)}`,
      `Open roster: ${appUrl("/rostering")}`
    ].join("\n"),
    metadata: { shiftId: firstShiftId, seriesId, participantName, workerName, workerEmail, startsAt, endsAt, status, allowedLatitude, allowedLongitude, allowedRadiusM, recurrence, createdCount: rows.length }
  });

  return NextResponse.json({ message: rows.length > 1 ? `${rows.length} recurring shifts saved and notifications recorded.` : "Shift saved and notifications recorded.", id: firstShiftId, seriesId });
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

function recurrenceConfig(type: string, customIntervalDays: number, count: number) {
  if (type === "single") return { type, intervalDays: 0, count: 1 };
  if (type === "daily") return { type, intervalDays: 1, count };
  if (type === "weekly") return { type, intervalDays: 7, count };
  if (type === "fortnightly") return { type, intervalDays: 14, count };
  if (type === "custom" && Number.isFinite(customIntervalDays) && customIntervalDays >= 1 && customIntervalDays <= 365) {
    return { type, intervalDays: Math.round(customIntervalDays), count };
  }
  return null;
}

function recurrenceLabel(type: string, intervalDays: number, count: number) {
  if (type === "single") return "Single shift";
  if (type === "custom") return `Every ${intervalDays} day${intervalDays === 1 ? "" : "s"} for ${count} shifts`;
  return `${type} for ${count} shifts`;
}

async function findUnavailableConflict(client: SupabaseClient, workerEmail: string, rows: Array<{ starts_at: string; ends_at: string }>) {
  const dates = Array.from(new Set(rows.map((row) => row.starts_at.slice(0, 10))));
  const { data, error } = await client
    .from("worker_availability")
    .select("available_date, start_time, end_time, availability_status, notes")
    .eq("worker_email", workerEmail)
    .eq("availability_status", "unavailable")
    .in("available_date", dates);

  if (error || !data?.length) return null;

  for (const row of rows) {
    const shiftStart = new Date(row.starts_at);
    const shiftEnd = new Date(row.ends_at);
    const dateKey = row.starts_at.slice(0, 10);
    for (const unavailable of data) {
      if (String(unavailable.available_date) !== dateKey) continue;
      const unavailableStart = new Date(`${dateKey}T${normalizeTime(String(unavailable.start_time))}`);
      const unavailableEnd = new Date(`${dateKey}T${normalizeTime(String(unavailable.end_time))}`);
      if (shiftStart < unavailableEnd && shiftEnd > unavailableStart) {
        return {
          shiftStart: row.starts_at,
          startTime: normalizeTime(String(unavailable.start_time)),
          endTime: normalizeTime(String(unavailable.end_time)),
          notes: String(unavailable.notes ?? "")
        };
      }
    }
  }

  return null;
}

async function findApprovedLeaveConflict(client: SupabaseClient, workerEmail: string, rows: Array<{ starts_at: string; ends_at: string }>) {
  const rangeStart = rows.reduce((earliest, row) => row.starts_at < earliest ? row.starts_at : earliest, rows[0]?.starts_at ?? "");
  const rangeEnd = rows.reduce((latest, row) => row.ends_at > latest ? row.ends_at : latest, rows[0]?.ends_at ?? "");
  if (!rangeStart || !rangeEnd) return null;

  const { data, error } = await client
    .from("worker_leave_requests")
    .select("starts_at, ends_at, leave_type, status")
    .eq("worker_email", workerEmail)
    .eq("status", "approved")
    .lt("starts_at", rangeEnd)
    .gt("ends_at", rangeStart);

  if (error || !data?.length) return null;

  for (const row of rows) {
    const shiftStart = new Date(row.starts_at);
    const shiftEnd = new Date(row.ends_at);
    for (const leave of data) {
      const leaveStart = new Date(String(leave.starts_at));
      const leaveEnd = new Date(String(leave.ends_at));
      if (shiftStart < leaveEnd && shiftEnd > leaveStart) {
        return {
          startsAt: String(leave.starts_at),
          endsAt: String(leave.ends_at),
          leaveType: String(leave.leave_type ?? "unavailable")
        };
      }
    }
  }

  return null;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function friendlyLeaveType(value: string) {
  if (value === "annual_leave") return "annual leave";
  if (value === "sick_leave") return "sick leave";
  return "unavailable period";
}
