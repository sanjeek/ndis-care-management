import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const rawNote = String(body.raw_note ?? "").trim();
  const participantName = String(body.participant_name ?? "").trim();
  const category = String(body.category ?? "General").trim();
  if (rawNote.length < 10) {
    return NextResponse.json({ message: "Add at least 10 characters of note text before using the assistant." }, { status: 400 });
  }

  const draft = [
    `Participant: ${participantName || "Not selected"}`,
    `Support category: ${category}`,
    "",
    "Support provided:",
    sentence(rawNote),
    "",
    "Observed response and outcomes:",
    inferOutcome(rawNote),
    "",
    "Risks, follow-up, and handover:",
    inferFollowUp(rawNote)
  ].join("\n");

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "ai_note_assistant",
    tableName: "progress_notes",
    recordLabel: participantName || "Draft note",
    metadata: { category, sourceLength: rawNote.length, generatedLength: draft.length }
  });

  return NextResponse.json({ message: "Draft generated. Review before saving to the participant record.", draft });
}

function sentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function inferOutcome(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("declin")) return "Participant declined part of the planned support. Record reason, alternatives offered, and whether follow-up is required.";
  if (lower.includes("incident") || lower.includes("fall") || lower.includes("injur")) return "Potential incident or risk was mentioned. Confirm whether an incident report is required and document immediate actions.";
  if (lower.includes("goal") || lower.includes("progress")) return "Participant made progress toward the stated goal. Link this note to the relevant participant goal if applicable.";
  return "Participant response and service outcome should be confirmed by the worker before saving.";
}

function inferFollowUp(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("medication") || lower.includes("medicine")) return "Check medication record, missed medication procedure, and whether coordinator review is needed.";
  if (lower.includes("behaviour") || lower.includes("risk")) return "Coordinator should review risk controls and support plan if this is a new or changed behaviour.";
  if (lower.includes("family") || lower.includes("guardian")) return "Record any authorised family or guardian communication separately where required.";
  return "No automatic follow-up identified. Worker must review accuracy and add any required handover actions.";
}
