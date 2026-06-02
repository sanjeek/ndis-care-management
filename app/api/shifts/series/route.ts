import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can bulk edit recurring shifts." }, { status: 403 });
  }

  const body = await request.json();
  const seriesId = String(body.series_id ?? "").trim();
  if (!seriesId) {
    return NextResponse.json({ message: "Recurring series ID is required." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const location = String(body.location ?? "").trim();
  const status = String(body.status ?? "").trim();
  const allowedLatitude = body.allowed_latitude === undefined || body.allowed_latitude === "" ? null : Number(body.allowed_latitude);
  const allowedLongitude = body.allowed_longitude === undefined || body.allowed_longitude === "" ? null : Number(body.allowed_longitude);
  const allowedRadiusM = body.allowed_radius_m === undefined || body.allowed_radius_m === "" ? null : Number(body.allowed_radius_m);

  if (location) update.location = location;
  if (status) update.status = status;
  if (allowedLatitude !== null || allowedLongitude !== null || allowedRadiusM !== null) {
    if (!isValidLatitude(Number(allowedLatitude)) || !isValidLongitude(Number(allowedLongitude)) || !isValidRadius(Number(allowedRadiusM))) {
      return NextResponse.json({ message: "Valid latitude, longitude, and radius are required for geofence bulk updates." }, { status: 400 });
    }
    update.allowed_latitude = allowedLatitude;
    update.allowed_longitude = allowedLongitude;
    update.allowed_radius_m = Math.round(Number(allowedRadiusM));
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ message: "Add at least one field to update." }, { status: 400 });
  }

  const { data: updatedRows, error } = await auth.client
    .from("shifts")
    .update(update)
    .eq("recurrence_series_id", seriesId)
    .is("clock_in_at", null)
    .neq("approval_status", "approved")
    .select("id, participant_name");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "update",
    tableName: "shifts",
    recordId: seriesId,
    recordLabel: "Recurring shift series",
    metadata: { workflow: "bulk_edit_recurring_series", seriesId, updatedCount: updatedRows?.length ?? 0, update }
  });

  return NextResponse.json({ message: `${updatedRows?.length ?? 0} unclocked recurring shifts updated.` });
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
