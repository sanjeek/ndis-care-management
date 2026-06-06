import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can manage participants." }, { status: 403 });
  }

  const body = await request.json();
  const payload = participantPayload(body);
  const name = payload.name;
  if (!name) {
    return NextResponse.json({ message: "Participant name is required." }, { status: 400 });
  }

  const insert = await insertParticipant(auth.client, payload);
  const { data: participant, error } = insert;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_update",
    tableName: "participants",
    recordId: participant.id,
    recordLabel: name,
    metadata: { operation: "create", ndisNumberPresent: Boolean(payload.ndis_number), extendedProfileSaved: !insert.legacy }
  });

  const admins = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await sendCareNotification(auth.client, {
    type: "participant_update",
    to: admins,
    subject: `Participant record created: ${name}`,
    text: [
      `Participant record created: ${name}`,
      `Created by: ${auth.user.name} (${auth.user.email})`,
      `Plan type: ${payload.plan_type || "Not recorded"}`,
      `Open participants: ${appUrl("/participants")}`
    ].join("\n"),
    metadata: { participantId: participant.id, participantName: name, createdBy: auth.user.email }
  });

  return NextResponse.json({
    message: insert.legacy
      ? "Participant saved with core fields. Run the updated supabase/schema.sql to enable the extended profile fields."
      : "Participant saved and notification recorded.",
    id: participant.id
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can update participant profiles." }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const payload = participantPayload(body);
  const name = payload.name;
  if (!id) return NextResponse.json({ message: "Participant ID is required." }, { status: 400 });
  if (!name) return NextResponse.json({ message: "Participant name is required." }, { status: 400 });

  const existing = await auth.client.from("participants").select("id, name").eq("id", id).maybeSingle();
  if (existing.error) return NextResponse.json({ message: existing.error.message }, { status: 400 });
  if (!existing.data) return NextResponse.json({ message: "Participant profile not found." }, { status: 404 });

  const update = await updateParticipant(auth.client, id, payload);
  const { data: participant, error } = update;
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const oldName = String(existing.data.name ?? "");
  const renameResult = oldName && oldName !== name ? await renameParticipantReferences(auth.client, oldName, name) : { updatedTables: [], warnings: [] };

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_update",
    tableName: "participants",
    recordId: participant.id,
    recordLabel: name,
    metadata: {
      operation: "update",
      previousName: oldName,
      updatedName: name,
      linkedTablesUpdated: renameResult.updatedTables,
      linkedTableWarnings: renameResult.warnings,
      extendedProfileSaved: !update.legacy,
      ndisNumberPresent: Boolean(payload.ndis_number)
    }
  });

  const admins = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await sendCareNotification(auth.client, {
    type: "participant_update",
    to: admins,
    subject: `Participant record updated: ${name}`,
    text: [
      `Participant record updated: ${name}`,
      `Updated by: ${auth.user.name} (${auth.user.email})`,
      oldName !== name ? `Previous name: ${oldName}` : "",
      `Plan type: ${payload.plan_type || "Not recorded"}`,
      `Open profile: ${appUrl(`/participants/${participant.id}`)}`
    ].filter(Boolean).join("\n"),
    metadata: { participantId: participant.id, participantName: name, previousName: oldName, updatedBy: auth.user.email }
  });

  return NextResponse.json({
    message: update.legacy
      ? "Participant profile updated with core fields. Run the updated supabase/schema.sql to enable the extended profile fields."
      : renameResult.warnings.length
      ? "Participant profile updated. Some linked records could not be renamed; check audit logs for details."
      : "Participant profile updated.",
    id: participant.id
  });
}

function participantPayload(body: Record<string, unknown>) {
  return {
    name: clean(body.name),
    ndis_number: clean(body.ndis_number),
    plan_type: clean(body.plan_type),
    date_of_birth: clean(body.date_of_birth) || null,
    medicare_number: clean(body.medicare_number),
    display_name: clean(body.display_name),
    preferred_name: clean(body.preferred_name),
    person_alias: clean(body.person_alias),
    other_identifier: clean(body.other_identifier),
    gender: clean(body.gender),
    sex: clean(body.sex),
    primary_address: clean(body.primary_address),
    postal_address: clean(body.postal_address),
    mobile_number: clean(body.mobile_number),
    phone_number: clean(body.phone_number),
    email: clean(body.email).toLowerCase(),
    secondary_email: clean(body.secondary_email).toLowerCase(),
    preferred_contact_method: clean(body.preferred_contact_method),
    languages: clean(body.languages),
    cultural_identity: clean(body.cultural_identity),
    religion: clean(body.religion),
    marital_status: clean(body.marital_status),
    nationality: clean(body.nationality),
    ethnicity: clean(body.ethnicity),
    aboriginal_torres_strait_islander: clean(body.aboriginal_torres_strait_islander),
    place_of_birth: clean(body.place_of_birth),
    joined_date: clean(body.joined_date) || null,
    next_review_date: clean(body.next_review_date) || null,
    client_status: clean(body.client_status) || "active",
    emergency_contact: clean(body.emergency_contact),
    emergency_contacts: clean(body.emergency_contacts),
    support_needs: clean(body.support_needs),
    support_plans: clean(body.support_plans),
    goals: clean(body.goals),
    risk_information: clean(body.risk_information),
    requirements: clean(body.requirements),
    preferences: clean(body.preferences),
    need_to_know_information: clean(body.need_to_know_information),
    useful_information: clean(body.useful_information),
    environmental_details: clean(body.environmental_details),
    psychological_details: clean(body.psychological_details),
    sensory_details: clean(body.sensory_details),
    bmi: clean(body.bmi),
    medical_notes: clean(body.medical_notes),
    allergies: clean(body.allergies),
    communication_preferences: clean(body.communication_preferences),
    client_type: clean(body.client_type),
    share_progress_notes: Boolean(body.share_progress_notes),
    enable_sms_reminders: Boolean(body.enable_sms_reminders),
    invoice_travel: Boolean(body.invoice_travel),
    private_info: clean(body.private_info)
  };
}

type ParticipantPayload = ReturnType<typeof participantPayload>;
type ParticipantWriteResult = {
  data: { id: string; name?: string };
  error: null;
  legacy: boolean;
} | {
  data: null;
  error: { message: string };
  legacy: boolean;
};

async function insertParticipant(client: SupabaseClient, payload: ParticipantPayload): Promise<ParticipantWriteResult> {
  const insert = await client.from("participants").insert(payload).select("id").single();
  if (!insert.error) return { data: insert.data as { id: string }, error: null, legacy: false };
  if (!isSchemaCacheError(insert.error.message)) return { data: null, error: { message: insert.error.message }, legacy: false };

  const fallback = await client.from("participants").insert(coreParticipantPayload(payload)).select("id").single();
  if (fallback.error) return { data: null, error: { message: fallback.error.message }, legacy: true };
  return { data: fallback.data as { id: string }, error: null, legacy: true };
}

async function updateParticipant(client: SupabaseClient, id: string, payload: ParticipantPayload): Promise<ParticipantWriteResult> {
  const update = await client.from("participants").update(payload).eq("id", id).select("id, name").single();
  if (!update.error) return { data: update.data as { id: string; name: string }, error: null, legacy: false };
  if (!isSchemaCacheError(update.error.message)) return { data: null, error: { message: update.error.message }, legacy: false };

  const fallback = await client.from("participants").update(coreParticipantPayload(payload)).eq("id", id).select("id, name").single();
  if (fallback.error) return { data: null, error: { message: fallback.error.message }, legacy: true };
  return { data: fallback.data as { id: string; name: string }, error: null, legacy: true };
}

function coreParticipantPayload(payload: ParticipantPayload) {
  return {
    name: payload.name,
    ndis_number: payload.ndis_number,
    plan_type: payload.plan_type,
    date_of_birth: payload.date_of_birth,
    emergency_contact: payload.emergency_contact,
    emergency_contacts: payload.emergency_contacts,
    support_needs: payload.support_needs,
    support_plans: payload.support_plans,
    goals: payload.goals,
    risk_information: payload.risk_information,
    medical_notes: payload.medical_notes,
    allergies: payload.allergies,
    communication_preferences: payload.communication_preferences
  };
}

function isSchemaCacheError(message: string) {
  return /schema cache|column .* does not exist|could not find .* column/i.test(message);
}

async function renameParticipantReferences(client: SupabaseClient, oldName: string, newName: string) {
  const tables = [
    "family_members",
    "participant_emergency_contacts",
    "travel_logs",
    "participant_matches",
    "visitor_logs",
    "participant_checklists",
    "shifts",
    "shift_attachments",
    "progress_notes",
    "participant_goals",
    "incident_reports",
    "care_plans",
    "medication_records",
    "medication_events",
    "ndis_funding_records",
    "invoices",
    "invoice_items",
    "contractor_invoice_items",
    "service_agreements",
    "care_documents",
    "participant_tasks",
    "support_coordination_provider_contacts",
    "support_coordination_service_bookings",
    "support_coordination_case_meetings",
    "support_coordination_actions",
    "participant_risk_assessments"
  ];

  const updatedTables: string[] = [];
  const warnings: string[] = [];

  for (const table of tables) {
    const { error } = await client.from(table).update({ participant_name: newName }).eq("participant_name", oldName);
    if (error) {
      warnings.push(`${table}: ${error.message}`);
    } else {
      updatedTables.push(table);
    }
  }

  return { updatedTables, warnings };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}
