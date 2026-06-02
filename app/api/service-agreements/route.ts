import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type AgreementRecord = {
  id: string;
  agreement_group_id: string;
  participant_name: string;
  ndis_number: string | null;
  title: string;
  version_number: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  renewal_reminder_at: string | null;
  support_categories: string | null;
  funding_summary: string | null;
  terms: string;
};

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can manage service agreements." }, { status: 403 });
  }

  const body = await request.json();
  const action = String(body.action ?? "create").trim();

  if (action === "sign") {
    const id = String(body.id ?? "").trim();
    const participantSignature = String(body.participant_signature ?? "").trim();
    const signedByName = String(body.signed_by_name ?? participantSignature).trim();
    if (!id || participantSignature.length < 2) {
      return NextResponse.json({ message: "Agreement and participant signature are required." }, { status: 400 });
    }

    const { data: agreement, error } = await auth.client
      .from("service_agreements")
      .update({
        participant_signature: participantSignature,
        signed_by_name: signedByName,
        participant_signed_at: new Date().toISOString(),
        status: "signed",
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id, participant_name, title")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await recordServerAudit(auth.client, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "service_agreement_signed",
      tableName: "service_agreements",
      recordId: agreement.id,
      recordLabel: agreement.title,
      metadata: { participantName: agreement.participant_name, signedByName }
    });
    return NextResponse.json({ message: "Participant signature saved." });
  }

  if (action === "version") {
    const sourceId = String(body.source_id ?? "").trim();
    if (!sourceId) return NextResponse.json({ message: "Source agreement is required." }, { status: 400 });
    const { data: source, error: sourceError } = await auth.client
      .from("service_agreements")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle<AgreementRecord>();
    if (sourceError || !source) {
      return NextResponse.json({ message: sourceError?.message ?? "Source agreement not found." }, { status: 404 });
    }

    const payload = agreementPayload(body, auth.user.id, auth.user.email, {
      agreement_group_id: source.agreement_group_id,
      participant_name: source.participant_name,
      ndis_number: source.ndis_number ?? "",
      title: source.title,
      version_number: Number(source.version_number ?? 1) + 1,
      status: "draft",
      support_categories: source.support_categories ?? "",
      funding_summary: source.funding_summary ?? "",
      terms: source.terms
    });

    const { data: created, error } = await auth.client.from("service_agreements").insert(payload).select("id").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await recordServerAudit(auth.client, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "service_agreement_version_create",
      tableName: "service_agreements",
      recordId: created.id,
      recordLabel: payload.title,
      metadata: { participantName: payload.participant_name, versionNumber: payload.version_number, sourceId }
    });
    return NextResponse.json({ message: "New agreement version created.", id: created.id });
  }

  const payload = agreementPayload(body, auth.user.id, auth.user.email);
  if (!payload.participant_name || !payload.title || !payload.terms) {
    return NextResponse.json({ message: "Participant, title, and agreement terms are required." }, { status: 400 });
  }

  const { data: created, error } = await auth.client.from("service_agreements").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "service_agreement_create",
    tableName: "service_agreements",
    recordId: created.id,
    recordLabel: payload.title,
    metadata: { participantName: payload.participant_name, versionNumber: payload.version_number, renewalReminderAt: payload.renewal_reminder_at }
  });

  return NextResponse.json({ message: "Service agreement saved.", id: created.id });
}

function agreementPayload(body: Record<string, unknown>, userId: string, userEmail: string, fallback: Record<string, unknown> = {}) {
  const endDate = dateValue(body.end_date ?? fallback.end_date);
  return {
    agreement_group_id: fallback.agreement_group_id,
    participant_name: text(body.participant_name ?? fallback.participant_name),
    ndis_number: text(body.ndis_number ?? fallback.ndis_number),
    title: text(body.title ?? fallback.title),
    version_number: Number(body.version_number ?? fallback.version_number ?? 1),
    status: normaliseStatus(body.status ?? fallback.status),
    start_date: dateValue(body.start_date ?? fallback.start_date),
    end_date: endDate,
    renewal_reminder_at: dateValue(body.renewal_reminder_at) || defaultReminder(endDate),
    support_categories: text(body.support_categories ?? fallback.support_categories),
    funding_summary: text(body.funding_summary ?? fallback.funding_summary),
    terms: text(body.terms ?? fallback.terms),
    created_by: userId,
    created_by_email: userEmail
  };
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function dateValue(value: unknown) {
  const date = text(value);
  return date || null;
}

function defaultReminder(endDate: string | null) {
  if (!endDate) return null;
  const date = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function normaliseStatus(value: unknown) {
  const status = text(value).toLowerCase();
  return ["draft", "active", "signed", "expired", "renewal_due", "closed"].includes(status) ? status : "draft";
}
