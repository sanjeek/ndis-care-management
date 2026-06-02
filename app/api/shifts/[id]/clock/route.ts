import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser, type UserRole } from "@/lib/auth";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

type AuthContext = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type ShiftClockRecord = {
  id: string;
  participant_name: string;
  support_worker_name: string | null;
  support_worker_email: string | null;
  location: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  approval_status: string | null;
  allowed_latitude: number | null;
  allowed_longitude: number | null;
  allowed_radius_m: number | null;
};

async function requireUser(request: Request): Promise<{ user: AuthContext } | { response: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const admin = serviceClient();

  if (!url || !anon || !token || !admin) {
    return { response: NextResponse.json({ message: "Authenticated session is required." }, { status: 401 }) };
  }

  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { response: NextResponse.json({ message: "Invalid session." }, { status: 401 }) };
  }

  let role = roleForUser(data.user.user_metadata?.role, data.user.email);
  if (!data.user.user_metadata?.role) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    role = roleForUser(profile?.role, data.user.email);
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: String(data.user.user_metadata?.full_name || data.user.email || data.user.id),
      role
    }
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy ?? 0);

  const { data: shift, error } = await admin
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, clock_in_at, clock_out_at, approval_status, allowed_latitude, allowed_longitude, allowed_radius_m")
    .eq("id", id)
    .maybeSingle<ShiftClockRecord>();

  if (error || !shift) {
    return NextResponse.json({ message: "Shift not found." }, { status: 404 });
  }

  const isAssignedWorker = (shift.support_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!isAssignedWorker) {
    return NextResponse.json({ message: "You can only clock shifts assigned to your login." }, { status: 403 });
  }

  if (shift.approval_status === "approved") {
    return NextResponse.json({ message: "This shift is already approved for payroll and cannot be changed." }, { status: 400 });
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return NextResponse.json({ message: "GPS latitude and longitude are required before clocking this shift." }, { status: 400 });
  }

  const hasGeofence =
    shift.allowed_latitude !== null &&
    shift.allowed_longitude !== null &&
    isValidLatitude(Number(shift.allowed_latitude)) &&
    isValidLongitude(Number(shift.allowed_longitude)) &&
    Number(shift.allowed_radius_m) > 0;
  if (!hasGeofence) {
    return NextResponse.json({ message: "GPS geofence is not configured for this shift. Ask an admin to add allowed latitude, longitude, and radius." }, { status: 400 });
  }

  const distanceM = Math.round(distanceInMetres(latitude, longitude, Number(shift.allowed_latitude), Number(shift.allowed_longitude)));
  const radiusM = Number(shift.allowed_radius_m);

  const now = new Date().toISOString();
  if (action === "in") {
    if (shift.clock_in_at) {
      return NextResponse.json({ message: "You have already clocked in for this shift." }, { status: 400 });
    }
    if (distanceM > radiusM) {
      return NextResponse.json({ message: `Clock-in blocked. You are ${distanceM}m from the allowed shift location, outside the ${radiusM}m radius.` }, { status: 403 });
    }
    const update = await admin
      .from("shifts")
      .update({
        status: "In progress",
        clock_in_at: now,
        clocked_by: auth.user.id,
        clocked_by_email: auth.user.email,
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        clock_in_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
        clock_in_distance_m: distanceM
      })
      .eq("id", shift.id);
    if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });

    await recordServerAudit(admin, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "update",
      tableName: "shifts",
      recordId: shift.id,
      recordLabel: `${shift.participant_name} shift`,
      metadata: {
        workflow: "clock_in",
        participantName: shift.participant_name,
        workerName: shift.support_worker_name,
        workerEmail: auth.user.email,
        shiftLocation: shift.location,
        latitude,
        longitude,
        accuracy,
        distanceM,
        radiusM
      }
    });

    return NextResponse.json({ message: `Clock in saved. GPS verified ${distanceM}m from allowed location.` });
  }

  if (action === "out") {
    if (!shift.clock_in_at) {
      return NextResponse.json({ message: "Clock in before clocking out." }, { status: 400 });
    }
    if (shift.clock_out_at) {
      return NextResponse.json({ message: "You have already clocked out for this shift." }, { status: 400 });
    }
    const update = await admin
      .from("shifts")
      .update({
        status: "Completed",
        clock_out_at: now,
        clocked_by: auth.user.id,
        clocked_by_email: auth.user.email,
        clock_out_latitude: latitude,
        clock_out_longitude: longitude,
        clock_out_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
        clock_out_distance_m: distanceM
      })
      .eq("id", shift.id);
    if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });

    await recordServerAudit(admin, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "update",
      tableName: "shifts",
      recordId: shift.id,
      recordLabel: `${shift.participant_name} shift`,
      metadata: {
        workflow: "clock_out",
        participantName: shift.participant_name,
        workerName: shift.support_worker_name,
        workerEmail: auth.user.email,
        shiftLocation: shift.location,
        latitude,
        longitude,
        accuracy,
        distanceM,
        radiusM
      }
    });

    return NextResponse.json({ message: `Clock out saved with GPS location. Submit the shift for approval when your notes are complete.` });
  }

  return NextResponse.json({ message: "Unknown clock action." }, { status: 400 });
}

function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function distanceInMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
