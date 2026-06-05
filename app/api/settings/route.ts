import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const allowedStatuses = new Set(["active", "planned", "coming_soon", "disabled", "archived"]);

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Admin or team leader access is required." }, { status: 403 });
  }

  const { data, error } = await auth.client
    .from("organisation_settings")
    .select("*")
    .order("setting_category", { ascending: true })
    .order("setting_key", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ records: data ?? [], canManage: requireRole(auth.user, ["admin"]) });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can update organisation settings." }, { status: 403 });
  }

  const body = await request.json();
  const payload = {
    setting_category: clean(body.setting_category),
    setting_key: clean(body.setting_key),
    setting_value: clean(body.setting_value),
    details: clean(body.details),
    status: normaliseStatus(body.status),
    is_sensitive: Boolean(body.is_sensitive),
    updated_by: auth.user.id,
    updated_by_email: auth.user.email,
    updated_at: new Date().toISOString()
  };

  if (!payload.setting_category || !payload.setting_key) {
    return NextResponse.json({ message: "Setting category and key are required." }, { status: 400 });
  }

  const { data, error } = await auth.client
    .from("organisation_settings")
    .upsert(payload, { onConflict: "setting_category,setting_key" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "organisation_setting_update",
    tableName: "organisation_settings",
    recordId: String(data.id),
    recordLabel: `${payload.setting_category}:${payload.setting_key}`,
    metadata: { category: payload.setting_category, key: payload.setting_key, status: payload.status, sensitive: payload.is_sensitive }
  });

  await notifyCareEvent(auth.client, {
    type: "operations_update",
    to: [auth.user.email],
    title: "Organisation setting updated",
    body: `${payload.setting_key} was saved in ${payload.setting_category}.`,
    linkUrl: "/settings",
    subject: `CareOS setting updated: ${payload.setting_key}`,
    text: `${auth.user.name} updated ${payload.setting_key} in ${payload.setting_category}.`,
    metadata: { category: payload.setting_category, key: payload.setting_key, status: payload.status }
  });

  return NextResponse.json({ message: "Organisation setting saved.", id: data.id });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normaliseStatus(value: unknown) {
  const status = clean(value);
  return allowedStatuses.has(status) ? status : "active";
}
