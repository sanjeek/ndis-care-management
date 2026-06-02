import { NextResponse } from "next/server";
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
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ message: "Participant name is required." }, { status: 400 });
  }

  const payload = {
    name,
    ndis_number: String(body.ndis_number ?? "").trim(),
    plan_type: String(body.plan_type ?? "").trim(),
    date_of_birth: String(body.date_of_birth ?? "").trim() || null,
    emergency_contact: String(body.emergency_contact ?? "").trim(),
    emergency_contacts: String(body.emergency_contacts ?? "").trim(),
    support_needs: String(body.support_needs ?? "").trim(),
    support_plans: String(body.support_plans ?? "").trim(),
    goals: String(body.goals ?? "").trim(),
    risk_information: String(body.risk_information ?? "").trim(),
    medical_notes: String(body.medical_notes ?? "").trim(),
    allergies: String(body.allergies ?? "").trim(),
    communication_preferences: String(body.communication_preferences ?? "").trim()
  };

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
