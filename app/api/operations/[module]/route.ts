import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

type ModuleKey = "travel" | "participant-matching" | "emergency-contacts" | "visitors" | "vehicles" | "training-records" | "checklists";

type ModuleConfig = {
  table: string;
  auditAction: string;
  labelField: string;
  workerEmailField?: string;
  workerNameField?: string;
  participantNameField?: string;
  managerOnly?: boolean;
  managerOnlyCreate?: boolean;
  notify?: boolean;
  buildPayload: (body: Record<string, unknown>, user: { id: string; email: string; name: string }) => Record<string, unknown>;
};

const modules: Record<ModuleKey, ModuleConfig> = {
  travel: {
    table: "travel_logs",
    auditAction: "travel_tracking",
    labelField: "participant_name",
    workerEmailField: "worker_email",
    workerNameField: "worker_name",
    notify: true,
    buildPayload: (body, user) => ({
      participant_name: clean(body.participant_name),
      worker_name: clean(body.worker_name) || user.name,
      worker_email: clean(body.worker_email).toLowerCase() || user.email,
      shift_id: clean(body.shift_id) || null,
      travel_date: clean(body.travel_date),
      start_location: clean(body.start_location),
      end_location: clean(body.end_location),
      kilometres: numberValue(body.kilometres),
      travel_purpose: clean(body.travel_purpose),
      vehicle_registration: clean(body.vehicle_registration).toUpperCase(),
      notes: clean(body.notes),
      status: clean(body.status) || "submitted",
      created_by: user.id,
      created_by_email: user.email
    })
  },
  "emergency-contacts": {
    table: "participant_emergency_contacts",
    auditAction: "emergency_contact",
    labelField: "contact_name",
    participantNameField: "participant_name",
    managerOnlyCreate: true,
    notify: true,
    buildPayload: (body, user) => ({
      participant_name: clean(body.participant_name),
      contact_name: clean(body.contact_name),
      relationship: clean(body.relationship),
      phone: clean(body.phone),
      email: clean(body.email).toLowerCase(),
      priority: clean(body.priority) || "primary",
      consent_to_contact: clean(body.consent_status) !== "do_not_contact",
      notes: clean(body.notes),
      status: clean(body.status) || "active",
      created_by: user.id,
      created_by_email: user.email
    })
  },
  "participant-matching": {
    table: "participant_matches",
    auditAction: "participant_matching",
    labelField: "participant_name",
    managerOnly: true,
    notify: true,
    buildPayload: (body, user) => ({
      participant_name: clean(body.participant_name),
      worker_name: clean(body.worker_name),
      worker_email: clean(body.worker_email).toLowerCase(),
      match_score: numberValue(body.match_score),
      matching_preferences: clean(body.matching_preferences),
      support_need_alignment: clean(body.support_need_alignment),
      restrictions: clean(body.restrictions),
      status: clean(body.status) || "recommended",
      created_by: user.id,
      created_by_email: user.email
    })
  },
  visitors: {
    table: "visitor_logs",
    auditAction: "visitor_management",
    labelField: "visitor_name",
    managerOnly: true,
    notify: true,
    buildPayload: (body, user) => ({
      visitor_name: clean(body.visitor_name),
      organisation: clean(body.organisation),
      participant_name: clean(body.participant_name),
      visit_date: clean(body.visit_date),
      sign_in_time: clean(body.sign_in_time),
      sign_out_time: clean(body.sign_out_time) || null,
      purpose: clean(body.purpose),
      host_worker_name: clean(body.host_worker_name),
      host_worker_email: clean(body.host_worker_email).toLowerCase(),
      status: clean(body.status) || "signed_in",
      created_by: user.id,
      created_by_email: user.email
    })
  },
  vehicles: {
    table: "vehicles",
    auditAction: "vehicle_tracking",
    labelField: "registration",
    managerOnly: true,
    notify: true,
    buildPayload: (body, user) => ({
      registration: clean(body.registration).toUpperCase(),
      make_model: clean(body.make_model),
      owner: clean(body.owner),
      odometer: numberValue(body.odometer),
      insurance_expiry: clean(body.insurance_expiry) || null,
      registration_expiry: clean(body.registration_expiry) || null,
      service_due_date: clean(body.service_due_date) || null,
      status: clean(body.status) || "active",
      notes: clean(body.notes),
      created_by: user.id,
      created_by_email: user.email
    })
  },
  "training-records": {
    table: "worker_training_records",
    auditAction: "training_record",
    labelField: "training_name",
    workerEmailField: "worker_email",
    workerNameField: "worker_name",
    notify: true,
    buildPayload: (body, user) => ({
      worker_name: clean(body.worker_name) || user.name,
      worker_email: clean(body.worker_email).toLowerCase() || user.email,
      training_name: clean(body.training_name),
      provider: clean(body.provider),
      completion_date: clean(body.completion_date) || null,
      expiry_date: clean(body.expiry_date) || null,
      certificate_reference: clean(body.certificate_reference),
      evidence_location: clean(body.evidence_location),
      mandatory: clean(body.mandatory_status) !== "optional",
      status: clean(body.status) || "current",
      notes: clean(body.notes),
      created_by: user.id,
      created_by_email: user.email
    })
  },
  checklists: {
    table: "participant_checklists",
    auditAction: "participant_checklist",
    labelField: "checklist_title",
    workerEmailField: "assigned_worker_email",
    workerNameField: "assigned_worker_name",
    notify: true,
    buildPayload: (body, user) => ({
      participant_name: clean(body.participant_name),
      checklist_title: clean(body.checklist_title),
      assigned_worker_name: clean(body.assigned_worker_name) || user.name,
      assigned_worker_email: clean(body.assigned_worker_email).toLowerCase() || user.email,
      due_date: clean(body.due_date) || null,
      checklist_items: clean(body.checklist_items),
      completion_status: clean(body.completion_status) || "open",
      notes: clean(body.notes),
      created_by: user.id,
      created_by_email: user.email
    })
  }
};

export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const config = moduleConfig((await context.params).module);
  if (!config) return NextResponse.json({ message: "Unknown operations module." }, { status: 404 });
  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  if (config.managerOnly && !canManage) return NextResponse.json({ message: "Manager access is required." }, { status: 403 });

  let query = auth.client.from(config.table).select("*").order("created_at", { ascending: false }).limit(200);
  if (!canManage && config.workerEmailField) query = query.eq(config.workerEmailField, auth.user.email.toLowerCase());
  if (!canManage && config.participantNameField) {
    const participantNames = await loadAssignedParticipants(auth.client, auth.user.email.toLowerCase());
    query = participantNames.length ? query.in(config.participantNameField, participantNames) : query.in(config.participantNameField, ["__none__"]);
  }
  if (!canManage && !config.workerEmailField && !config.participantNameField) return NextResponse.json({ message: "You do not have permission to view this module." }, { status: 403 });

  const [records, participants, workers, shifts] = await Promise.all([
    query,
    auth.client.from("participants").select("name").order("name", { ascending: true }),
    canManage
      ? auth.client.from("support_workers").select("name, email").order("name", { ascending: true })
      : auth.client.from("support_workers").select("name, email").eq("email", auth.user.email),
    auth.client.from("shifts").select("id, participant_name, support_worker_name, support_worker_email, starts_at, ends_at").order("starts_at", { ascending: false }).limit(100)
  ]);

  if (records.error) return NextResponse.json({ message: records.error.message }, { status: 400 });
  return NextResponse.json({
    canManage,
    currentUser: auth.user,
    records: records.data ?? [],
    participants: participants.data ?? [],
    workers: workers.data ?? [],
    shifts: shifts.data ?? []
  });
}

export async function POST(request: Request, context: { params: Promise<{ module: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const moduleKey = (await context.params).module;
  const config = moduleConfig(moduleKey);
  if (!config) return NextResponse.json({ message: "Unknown operations module." }, { status: 404 });
  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  if ((config.managerOnly || config.managerOnlyCreate) && !canManage) return NextResponse.json({ message: "Manager access is required." }, { status: 403 });

  const body = await request.json();
  const payload = config.buildPayload(body, auth.user);
  if (!requiredValuesPresent(moduleKey, payload)) {
    return NextResponse.json({ message: "Required fields are missing. Complete the form and try again." }, { status: 400 });
  }
  if (!canManage && config.workerEmailField && String(payload[config.workerEmailField] ?? "").toLowerCase() !== auth.user.email.toLowerCase()) {
    return NextResponse.json({ message: "Support workers can only create records for their own login." }, { status: 403 });
  }

  const { data, error } = await auth.client.from(config.table).insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const recordLabel = String(payload[config.labelField] ?? moduleKey);
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: config.auditAction,
    tableName: config.table,
    recordId: String(data.id),
    recordLabel,
    metadata: { module: moduleKey, ...payload }
  });

  if (config.notify) {
    const recipients = canManage && config.workerEmailField ? [String(payload[config.workerEmailField] ?? "")] : await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
    await notifyCareEvent(auth.client, {
      type: "operations_update",
      to: recipients,
      title: operationsTitle(moduleKey),
      body: `${recordLabel} was recorded by ${auth.user.name}.`,
      linkUrl: operationsHref(moduleKey),
      subject: `${operationsTitle(moduleKey)}: ${recordLabel}`,
      text: `${operationsTitle(moduleKey)} recorded by ${auth.user.name} (${auth.user.email}).`,
      metadata: { module: moduleKey, recordId: data.id }
    });
  }

  return NextResponse.json({ message: `${operationsTitle(moduleKey)} saved.`, id: data.id });
}

function moduleConfig(value: string): ModuleConfig | null {
  return Object.prototype.hasOwnProperty.call(modules, value) ? modules[value as ModuleKey] : null;
}

function requiredValuesPresent(module: string, payload: Record<string, unknown>) {
  if (module === "travel") return Boolean(payload.participant_name && payload.worker_email && payload.travel_date && Number(payload.kilometres) >= 0);
  if (module === "emergency-contacts") return Boolean(payload.participant_name && payload.contact_name && payload.phone);
  if (module === "participant-matching") return Boolean(payload.participant_name && payload.worker_email && Number(payload.match_score) >= 0);
  if (module === "visitors") return Boolean(payload.visitor_name && payload.visit_date && payload.sign_in_time && payload.purpose);
  if (module === "vehicles") return Boolean(payload.registration && payload.make_model);
  if (module === "training-records") return Boolean(payload.worker_email && payload.training_name);
  if (module === "checklists") return Boolean(payload.participant_name && payload.checklist_title && payload.assigned_worker_email && payload.checklist_items);
  return false;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function operationsTitle(module: string) {
  return module.split("-").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

function operationsHref(module: string) {
  if (module === "participant-matching") return "/participant-matching";
  if (module === "emergency-contacts") return "/participants";
  if (module === "training-records") return "/training-records";
  return `/${module}`;
}

async function loadAssignedParticipants(client: SupabaseClient, email: string) {
  const { data } = await client.from("shifts").select("participant_name").eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}
