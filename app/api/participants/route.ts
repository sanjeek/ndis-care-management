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

  const { data: participant, error } = await auth.client.from("participants").insert(payload).select("id").single();
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
    metadata: { operation: "create", ndisNumberPresent: Boolean(payload.ndis_number) }
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

  return NextResponse.json({ message: "Participant saved and notification recorded.", id: participant.id });
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

  const { data: participant, error } = await auth.client.from("participants").update(payload).eq("id", id).select("id, name").single();
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
    message: renameResult.warnings.length
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
    emergency_contact: clean(body.emergency_contact),
    emergency_contacts: clean(body.emergency_contacts),
    support_needs: clean(body.support_needs),
    support_plans: clean(body.support_plans),
    goals: clean(body.goals),
    risk_information: clean(body.risk_information),
    medical_notes: clean(body.medical_notes),
    allergies: clean(body.allergies),
    communication_preferences: clean(body.communication_preferences)
  };
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
