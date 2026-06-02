import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can create or edit care plans." }, { status: 403 });
  }

  const body = await request.json();
  const participantName = String(body.participant_name ?? "").trim();
  const title = String(body.title ?? "").trim();
  const goals = String(body.goals ?? "").trim();
  const supportInstructions = String(body.support_instructions ?? "").trim();

  if (!participantName || !title || !goals || !supportInstructions) {
    return NextResponse.json({ message: "Participant, plan title, goals, and support instructions are required." }, { status: 400 });
  }

  const payload = {
    participant_name: participantName,
    title,
    goals,
    support_instructions: supportInstructions,
    medication_information: String(body.medication_information ?? "").trim(),
    mobility_requirements: String(body.mobility_requirements ?? "").trim(),
    participant_preferences: String(body.participant_preferences ?? "").trim(),
    review_date: String(body.review_date ?? "").trim() || null,
    status: String(body.status ?? "active").trim() || "active",
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };

  const { data: carePlan, error } = await auth.client.from("care_plans").insert(payload).select("id").single();
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "create",
    tableName: "care_plans",
    recordId: carePlan.id,
    recordLabel: title,
    metadata: { participantName, reviewDate: payload.review_date, status: payload.status }
  });

  return NextResponse.json({ message: "Care plan saved.", id: carePlan.id });
}
