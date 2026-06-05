import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

type ModuleKey = "travel" | "emergency-contacts" | "visitors" | "vehicles" | "training-records" | "checklists";

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
    participantNameField: "participant_name",
    workerEmailField: "assigned_worker_email",
    workerNameField: "assigned_worker_name",
    notify: true,
    buildPayload: (body, user) => ({
      participant_name: clean(body.participant_name),
      checklist_title: clean(body.checklist_title),
      assigned_worker_name: clean(body.assigned_worker_name) || user.name,
      assigned_worker_email: clean(body.assigned_worker_email).toLowerCase() || user.email,
      due_date: clean(body.due_date) || null,
      checklist_category: clean(body.checklist_category) || "custom",
      priority: clean(body.priority) || "medium",
      recurrence_pattern: clean(body.recurrence_pattern) || "once",
      shift_id: clean(body.shift_id) || null,
      service_context: clean(body.service_context),
      location_context: clean(body.location_context),
      checklist_items: clean(body.checklist_items),
      pre_shift_checks: clean(body.pre_shift_checks),
      support_instructions: clean(body.support_instructions),
      risk_controls: clean(body.risk_controls),
      evidence_required: clean(body.evidence_required) || "progress_note",
      completion_status: clean(body.completion_status) || "open",
      completed_items: clean(body.completed_items),
      completion_percentage: numberValue(body.completion_percentage),
      completion_notes: clean(body.completion_notes),
      worker_signature_required: booleanValue(body.worker_signature_required),
      participant_signature_required: booleanValue(body.participant_signature_required),
      escalation_required: booleanValue(body.escalation_required),
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
  if (!canManage && !config.workerEmailField && config.participantNameField) {
    const participantNames = await loadAssignedParticipants(auth.client, auth.user.email.toLowerCase());
    query = participantNames.length ? query.in(config.participantNameField, participantNames) : query.in(config.participantNameField, ["__none__"]);
  }
  if (!canManage && !config.workerEmailField && !config.participantNameField) return NextResponse.json({ message: "You do not have permission to view this module." }, { status: 403 });

  const assignedParticipantNames = !canManage ? await loadAssignedParticipants(auth.client, auth.user.email.toLowerCase()) : [];
  const participantsQuery = auth.client.from("participants").select("name").order("name", { ascending: true });
  const shiftsQuery = auth.client.from("shifts").select("id, participant_name, support_worker_name, support_worker_email, starts_at, ends_at").order("starts_at", { ascending: false }).limit(100);

  const [records, participants, workers, shifts] = await Promise.all([
    query,
    canManage ? participantsQuery : assignedParticipantNames.length ? participantsQuery.in("name", assignedParticipantNames) : participantsQuery.in("name", ["__none__"]),
    canManage
      ? auth.client.from("support_workers").select("name, email").order("name", { ascending: true })
      : auth.client.from("support_workers").select("name, email").eq("email", auth.user.email),
    canManage ? shiftsQuery : shiftsQuery.eq("support_worker_email", auth.user.email.toLowerCase())
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

  const insert = await insertOperationRecord(auth.client, moduleKey, config, payload);
  if (insert.error) return NextResponse.json({ message: insert.error.message }, { status: 400 });
  const data = insert.data;
  const savedPayload = insert.payload;

  const recordLabel = String(savedPayload[config.labelField] ?? moduleKey);
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: config.auditAction,
    tableName: config.table,
    recordId: String(data.id),
    recordLabel,
    metadata: { module: moduleKey, ...savedPayload, legacyChecklistSave: insert.legacy }
  });

  if (config.notify) {
    const recipients = canManage && config.workerEmailField ? [String(savedPayload[config.workerEmailField] ?? "")] : await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
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

  return NextResponse.json({
    message: insert.legacy
      ? "Participant checklist saved. Extra checklist details were stored in notes until the Supabase schema update is applied."
      : `${operationsTitle(moduleKey)} saved.`,
    id: data.id
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ module: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const moduleKey = (await context.params).module;
  const config = moduleConfig(moduleKey);
  if (!config) return NextResponse.json({ message: "Unknown operations module." }, { status: 404 });
  if (moduleKey !== "checklists") return NextResponse.json({ message: "This module does not support updates yet." }, { status: 405 });

  const body = await request.json();
  const id = clean(body.id);
  if (!id) return NextResponse.json({ message: "Checklist id is required." }, { status: 400 });

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const existing = await auth.client.from(config.table).select("id, checklist_title, assigned_worker_email").eq("id", id).single();
  if (existing.error) return NextResponse.json({ message: existing.error.message }, { status: 404 });
  if (!canManage && String(existing.data.assigned_worker_email ?? "").toLowerCase() !== auth.user.email.toLowerCase()) {
    return NextResponse.json({ message: "Support workers can only update checklists assigned to their own login." }, { status: 403 });
  }

  const completionStatus = clean(body.completion_status) || "in_progress";
  const updatePayload: Record<string, unknown> = {
    completion_status: completionStatus,
    completed_items: clean(body.completed_items),
    completion_percentage: numberValue(body.completion_percentage),
    completion_notes: clean(body.completion_notes),
    notes: clean(body.notes),
    updated_at: new Date().toISOString()
  };
  if (completionStatus === "completed") {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = auth.user.id;
    updatePayload.completed_by_email = auth.user.email;
  } else {
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
    updatePayload.completed_by_email = null;
  }

  const update = await updateChecklistRecord(auth.client, config, id, updatePayload);
  if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });

  const recordLabel = String(existing.data.checklist_title ?? "Participant checklist");
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_checklist_update",
    tableName: config.table,
    recordId: id,
    recordLabel,
    metadata: { module: moduleKey, ...update.payload, legacyChecklistUpdate: update.legacy }
  });

  return NextResponse.json({
    message: update.legacy
      ? "Checklist status updated. Completion notes were stored in notes until the Supabase schema update is applied."
      : "Checklist status updated.",
    id
  });
}

function moduleConfig(value: string): ModuleConfig | null {
  return Object.prototype.hasOwnProperty.call(modules, value) ? modules[value as ModuleKey] : null;
}

function requiredValuesPresent(module: string, payload: Record<string, unknown>) {
  if (module === "travel") return Boolean(payload.participant_name && payload.worker_email && payload.travel_date && Number(payload.kilometres) >= 0);
  if (module === "emergency-contacts") return Boolean(payload.participant_name && payload.contact_name && payload.phone);
  if (module === "visitors") return Boolean(payload.visitor_name && payload.visit_date && payload.sign_in_time && payload.purpose);
  if (module === "vehicles") return Boolean(payload.registration && payload.make_model);
  if (module === "training-records") return Boolean(payload.worker_email && payload.training_name);
  if (module === "checklists") {
    return Boolean(
      payload.participant_name
      && payload.checklist_title
      && payload.assigned_worker_email
      && payload.checklist_category
      && payload.priority
      && payload.recurrence_pattern
      && payload.service_context
      && payload.checklist_items
      && payload.support_instructions
      && payload.evidence_required
    );
  }
  return false;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function booleanValue(value: unknown) {
  return ["1", "true", "yes", "on", "required"].includes(clean(value).toLowerCase());
}

type WriteResult = {
  data: { id: string };
  error: null;
  payload: Record<string, unknown>;
  legacy: boolean;
} | {
  data: { id: string } | null;
  error: { message: string };
  payload: Record<string, unknown>;
  legacy: boolean;
};

async function insertOperationRecord(client: SupabaseClient, moduleKey: string, config: ModuleConfig, payload: Record<string, unknown>): Promise<WriteResult> {
  const insert = await client.from(config.table).insert(payload).select("id").single();
  if (!insert.error) return { data: insert.data as { id: string }, error: null, payload, legacy: false };
  if (moduleKey !== "checklists" || !isSchemaCacheError(insert.error.message)) return { data: null, error: { message: insert.error.message }, payload, legacy: false };

  const legacyPayload = legacyChecklistPayload(payload);
  const fallback = await client.from(config.table).insert(legacyPayload).select("id").single();
  if (fallback.error) return { data: null, error: { message: fallback.error.message }, payload: legacyPayload, legacy: true };
  return { data: fallback.data as { id: string }, error: null, payload: legacyPayload, legacy: true };
}

async function updateChecklistRecord(client: SupabaseClient, config: ModuleConfig, id: string, payload: Record<string, unknown>): Promise<WriteResult> {
  const update = await client.from(config.table).update(payload).eq("id", id).select("id").single();
  if (!update.error) return { data: update.data as { id: string }, error: null, payload, legacy: false };
  if (!isSchemaCacheError(update.error.message)) return { data: null, error: { message: update.error.message }, payload, legacy: false };

  const legacyPayload = legacyChecklistCompletionPayload(payload);
  const fallback = await client.from(config.table).update(legacyPayload).eq("id", id).select("id").single();
  if (fallback.error) return { data: null, error: { message: fallback.error.message }, payload: legacyPayload, legacy: true };
  return { data: fallback.data as { id: string }, error: null, payload: legacyPayload, legacy: true };
}

function isSchemaCacheError(message: string) {
  return /schema cache|column .* does not exist|could not find .* column/i.test(message);
}

function legacyChecklistPayload(payload: Record<string, unknown>) {
  const extra = [
    ["Category", payload.checklist_category],
    ["Priority", payload.priority],
    ["Recurrence", payload.recurrence_pattern],
    ["Linked shift", payload.shift_id],
    ["Service context", payload.service_context],
    ["Location context", payload.location_context],
    ["Pre-shift checks", payload.pre_shift_checks],
    ["Support instructions", payload.support_instructions],
    ["Risk controls", payload.risk_controls],
    ["Evidence required", payload.evidence_required],
    ["Worker signature required", payload.worker_signature_required],
    ["Participant signature required", payload.participant_signature_required],
    ["Escalation required", payload.escalation_required]
  ]
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${String(value)}`);

  return {
    participant_name: payload.participant_name,
    checklist_title: payload.checklist_title,
    assigned_worker_name: payload.assigned_worker_name,
    assigned_worker_email: payload.assigned_worker_email,
    due_date: payload.due_date,
    checklist_items: payload.checklist_items,
    completion_status: payload.completion_status,
    notes: [payload.notes, extra.join("\n")].filter(Boolean).join("\n\n"),
    created_by: payload.created_by,
    created_by_email: payload.created_by_email
  };
}

function legacyChecklistCompletionPayload(payload: Record<string, unknown>) {
  const extra = [
    ["Completion percentage", payload.completion_percentage],
    ["Completed items", payload.completed_items],
    ["Completion notes", payload.completion_notes]
  ]
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${String(value)}`);

  return {
    completion_status: payload.completion_status,
    notes: [payload.notes, extra.join("\n")].filter(Boolean).join("\n\n"),
    completed_at: payload.completed_at,
    completed_by: payload.completed_by,
    completed_by_email: payload.completed_by_email,
    updated_at: payload.updated_at
  };
}

function operationsTitle(module: string) {
  return module.split("-").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

function operationsHref(module: string) {
  if (module === "emergency-contacts") return "/participants";
  if (module === "training-records") return "/training-records";
  return `/${module}`;
}

async function loadAssignedParticipants(client: SupabaseClient, email: string) {
  const { data } = await client.from("shifts").select("participant_name").eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}
