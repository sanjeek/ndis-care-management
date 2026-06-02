import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const medicationStatuses = ["active", "paused", "ceased"];
const eventTypes = ["administered", "missed", "incident"];

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = String(body.action ?? "record");

  if (action === "record") {
    if (!requireRole(auth.user, ["admin", "team_leader"])) {
      return NextResponse.json({ message: "Only admin or team leader users can add medication records." }, { status: 403 });
    }

    const participantName = String(body.participant_name ?? "").trim();
    const medicationName = String(body.medication_name ?? "").trim();
    const dosage = String(body.dosage ?? "").trim();
    const frequency = String(body.frequency ?? "").trim();
    const instructions = String(body.administration_instructions ?? "").trim();
    const status = String(body.status ?? "active").trim().toLowerCase();

    if (!participantName || !medicationName || !dosage || !frequency || !instructions) {
      return NextResponse.json({ message: "Participant, medication, dosage, frequency, and administration instructions are required." }, { status: 400 });
    }
    if (!medicationStatuses.includes(status)) {
      return NextResponse.json({ message: "Medication status must be active, paused, or ceased." }, { status: 400 });
    }

    const { data: medication, error } = await auth.client
      .from("medication_records")
      .insert({
        participant_name: participantName,
        medication_name: medicationName,
        dosage,
        route: String(body.route ?? "").trim(),
        frequency,
        administration_time: String(body.administration_time ?? "").trim(),
        administration_instructions: instructions,
        prescribing_doctor: String(body.prescribing_doctor ?? "").trim(),
        start_date: String(body.start_date ?? "") || null,
        end_date: String(body.end_date ?? "") || null,
        status,
        created_by: auth.user.id,
        created_by_email: auth.user.email
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    await recordServerAudit(auth.client, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "medication_record_create",
      tableName: "medication_records",
      recordId: medication.id,
      recordLabel: `${participantName} ${medicationName}`,
      metadata: { participantName, medicationName, dosage, frequency, status }
    });

    return NextResponse.json({ message: "Medication record saved.", id: medication.id });
  }

  if (action === "event") {
    const medicationId = String(body.medication_id ?? "").trim();
    const participantName = String(body.participant_name ?? "").trim();
    const medicationName = String(body.medication_name ?? "").trim();
    const eventType = String(body.event_type ?? "").trim().toLowerCase();
    const eventDate = String(body.event_date ?? "").trim();
    const eventTime = String(body.event_time ?? "").trim();

    if (!participantName || !medicationName || !eventType || !eventDate || !eventTime) {
      return NextResponse.json({ message: "Participant, medication, event type, date, and time are required." }, { status: 400 });
    }
    if (!eventTypes.includes(eventType)) {
      return NextResponse.json({ message: "Event type must be administered, missed, or incident." }, { status: 400 });
    }
    if (auth.user.role === "support_worker" && !(await workerCanAccessParticipant(auth.client, auth.user.email, participantName))) {
      return NextResponse.json({ message: "You can only report medication events for assigned participants." }, { status: 403 });
    }

    const { data: event, error } = await auth.client
      .from("medication_events")
      .insert({
        medication_id: medicationId || null,
        participant_name: participantName,
        medication_name: medicationName,
        event_type: eventType,
        event_date: eventDate,
        event_time: eventTime,
        dosage_given: String(body.dosage_given ?? "").trim(),
        reason: String(body.reason ?? "").trim(),
        actions_taken: String(body.actions_taken ?? "").trim(),
        severity: String(body.severity ?? "").trim(),
        recorded_by: auth.user.id,
        recorded_by_email: auth.user.email,
        recorded_by_name: auth.user.name
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    await recordServerAudit(auth.client, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: eventType === "administered" ? "medication_administered" : eventType === "missed" ? "medication_missed" : "medication_incident",
      tableName: "medication_events",
      recordId: event.id,
      recordLabel: `${participantName} ${medicationName}`,
      metadata: { participantName, medicationName, eventType, eventDate, eventTime }
    });

    if (eventType !== "administered") {
      const admins = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
      await notifyCareEvent(auth.client, {
        type: "incident_report",
        to: admins,
        title: eventType === "missed" ? "Missed medication reported" : "Medication incident reported",
        body: `${medicationName} for ${participantName} was reported as ${eventType}.`,
        linkUrl: "/medications",
        subject: eventType === "missed" ? `Missed medication: ${participantName}` : `Medication incident: ${participantName}`,
        text: [
          `${eventType === "missed" ? "Missed medication" : "Medication incident"} reported.`,
          `Participant: ${participantName}`,
          `Medication: ${medicationName}`,
          `Date/time: ${eventDate} ${eventTime}`,
          `Recorded by: ${auth.user.name} (${auth.user.email})`,
          `Reason: ${String(body.reason ?? "").trim() || "Not recorded"}`,
          `Actions taken: ${String(body.actions_taken ?? "").trim() || "Not recorded"}`,
          `Open medication management: ${appUrl("/medications")}`
        ].join("\n"),
        metadata: { medicationEventId: event.id, participantName, medicationName, eventType }
      });
    }

    return NextResponse.json({ message: eventType === "administered" ? "Medication administration recorded." : eventType === "missed" ? "Missed medication report saved." : "Medication incident recorded.", id: event.id });
  }

  return NextResponse.json({ message: "Unsupported medication action." }, { status: 400 });
}

async function workerCanAccessParticipant(client: SupabaseClient, workerEmail: string, participantName: string) {
  const { data } = await client
    .from("shifts")
    .select("id")
    .eq("support_worker_email", workerEmail.toLowerCase())
    .eq("participant_name", participantName)
    .limit(1);
  return Boolean(data?.length);
}
