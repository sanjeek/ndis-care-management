import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type WorkerRow = {
  name: string;
  email: string;
  qualifications: string | null;
  compliance_status: string | null;
  police_check_expiry: string | null;
  ndis_worker_screening_expiry: string | null;
  first_aid_expiry: string | null;
  cpr_expiry: string | null;
  drivers_licence_expiry: string | null;
};

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can match workers to shifts." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const participantName = String(body.participant_name ?? "").trim();
  const startsAt = String(body.starts_at ?? "").trim();
  const endsAt = String(body.ends_at ?? "").trim();
  const location = String(body.location ?? "").trim().toLowerCase();

  if (!participantName || !startsAt || !endsAt) {
    return NextResponse.json({ message: "Participant, start time, and end time are required for shift matching." }, { status: 400 });
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ message: "Use a valid start and end time for shift matching." }, { status: 400 });
  }

  const { data: workers, error } = await auth.client
    .from("support_workers")
    .select("name, email, qualifications, compliance_status, police_check_expiry, ndis_worker_screening_expiry, first_aid_expiry, cpr_expiry, drivers_licence_expiry")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const matches = [];
  for (const worker of (workers ?? []) as WorkerRow[]) {
    const conflicts = await hasShiftOrLeaveConflict(auth.client, worker.email, start, end);
    const unavailable = await hasUnavailableSlot(auth.client, worker.email, start, end);
    const expiring = complianceWarnings(worker);
    let score = 100;
    const reasons = ["No conflicting shift found"];
    if (conflicts) {
      score -= 60;
      reasons.push("Has an existing shift or approved leave conflict");
    }
    if (unavailable) {
      score -= 40;
      reasons.push("Submitted unavailable time overlaps");
    }
    if (location && worker.qualifications?.toLowerCase().includes(location)) {
      score += 5;
      reasons.push("Qualifications or notes mention the location");
    }
    if (expiring.length) {
      score -= expiring.length * 10;
      reasons.push(`Compliance warning: ${expiring.join(", ")}`);
    }
    if (String(worker.compliance_status ?? "").toLowerCase().includes("clear")) {
      score += 10;
      reasons.push("Compliance status is clear");
    }
    matches.push({
      name: worker.name,
      email: worker.email,
      score: Math.max(0, Math.min(100, score)),
      reasons
    });
  }

  matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "ai_shift_matching",
    tableName: "shifts",
    recordLabel: `${participantName} shift matching`,
    metadata: { participantName, startsAt, endsAt, location, returned: matches.slice(0, 5).length }
  });

  return NextResponse.json({ message: "Shift matching complete.", matches: matches.slice(0, 5) });
}

async function hasShiftOrLeaveConflict(client: SupabaseClient, workerEmail: string, start: Date, end: Date) {
  const [shiftRows, leaveRows] = await Promise.all([
    client.from("shifts").select("id").eq("support_worker_email", workerEmail).neq("status", "Cancelled").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString()).limit(1),
    client.from("worker_leave_requests").select("id").eq("worker_email", workerEmail).eq("status", "approved").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString()).limit(1)
  ]);
  return Boolean(shiftRows.data?.length || leaveRows.data?.length);
}

async function hasUnavailableSlot(client: SupabaseClient, workerEmail: string, start: Date, end: Date) {
  const date = start.toISOString().slice(0, 10);
  const { data } = await client
    .from("worker_availability")
    .select("start_time, end_time")
    .eq("worker_email", workerEmail)
    .eq("available_date", date)
    .eq("availability_status", "unavailable");
  return (data ?? []).some((slot: { start_time: string; end_time: string }) => {
    const slotStart = new Date(`${date}T${String(slot.start_time).slice(0, 5)}`);
    const slotEnd = new Date(`${date}T${String(slot.end_time).slice(0, 5)}`);
    return start < slotEnd && end > slotStart;
  });
}

function complianceWarnings(worker: WorkerRow) {
  const now = new Date();
  return [
    ["police check", worker.police_check_expiry],
    ["NDIS screening", worker.ndis_worker_screening_expiry],
    ["first aid", worker.first_aid_expiry],
    ["CPR", worker.cpr_expiry],
    ["driver licence", worker.drivers_licence_expiry]
  ]
    .filter(([, value]) => {
      if (!value) return true;
      const date = new Date(`${value}T00:00:00`);
      return Number.isNaN(date.getTime()) || date.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;
    })
    .map(([label]) => label);
}
