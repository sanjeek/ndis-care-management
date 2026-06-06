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

  let draft: string;
  let engine: "claude" | "keyword";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.startsWith("sk-ant-")) {
    try {
      draft = await generateWithClaude(apiKey, rawNote, participantName, category);
      engine = "claude";
    } catch (err) {
      console.error("[assistant] Claude API failed, using keyword fallback:", err);
      draft = generateWithKeywords(rawNote, participantName, category);
      engine = "keyword";
    }
  } else {
    draft = generateWithKeywords(rawNote, participantName, category);
    engine = "keyword";
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "ai_note_assistant",
    tableName: "progress_notes",
    recordLabel: participantName || "Draft note",
    metadata: { category, sourceLength: rawNote.length, generatedLength: draft.length, engine }
  });

  return NextResponse.json({ message: "Draft generated. Review before saving to the participant record.", draft, engine });
}

async function generateWithClaude(apiKey: string, rawNote: string, participantName: string, category: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: "You are a professional NDIS support worker progress note writer. Write clear, factual, person-centred progress notes. Use respectful, strength-based language. Focus only on what was observed and supported — never invent details.",
      messages: [
        {
          role: "user",
          content: `Write a professional NDIS progress note using these sections: "Support provided", "Observed response and outcomes", "Risks, follow-up, and handover".\n\nParticipant: ${participantName || "Not specified"}\nSupport category: ${category}\nRaw worker note: ${rawNote}\n\nKeep it factual and suitable for an NDIS audit. Do not invent details not present in the raw note.`
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Claude");
  return text;
}

function generateWithKeywords(rawNote: string, participantName: string, category: string): string {
  return [
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
