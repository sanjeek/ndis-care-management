import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can manage family access." }, { status: 403 });
  }

  const [familyMembers, participants] = await Promise.all([
    auth.client.from("family_members").select("*").order("created_at", { ascending: false }),
    auth.client.from("participants").select("name").order("name", { ascending: true })
  ]);

  if (familyMembers.error) return NextResponse.json({ message: familyMembers.error.message }, { status: 400 });
  if (participants.error) return NextResponse.json({ message: participants.error.message }, { status: 400 });

  return NextResponse.json({
    familyMembers: familyMembers.data ?? [],
    participants: participants.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can approve family access." }, { status: 403 });
  }

  const body = await request.json();
  const familyEmail = String(body.family_email ?? "").trim().toLowerCase();
  const familyName = String(body.family_name ?? "").trim();
  const participantName = String(body.participant_name ?? "").trim();
  const relationship = String(body.relationship ?? "").trim();
  const status = String(body.status ?? "approved").trim().toLowerCase();

  if (!familyEmail || !familyName || !participantName || !relationship) {
    return NextResponse.json({ message: "Family name, email, participant, and relationship are required." }, { status: 400 });
  }
  if (!["pending", "approved", "suspended"].includes(status)) {
    return NextResponse.json({ message: "Status must be pending, approved, or suspended." }, { status: 400 });
  }

  const { data: profile } = await auth.client.from("profiles").select("id").eq("email", familyEmail).maybeSingle();
  const { data, error } = await auth.client
    .from("family_members")
    .upsert({
      family_user_id: profile?.id ?? null,
      family_name: familyName,
      family_email: familyEmail,
      participant_name: participantName,
      relationship,
      status,
      updated_at: new Date().toISOString()
    }, { onConflict: "family_email,participant_name" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "family_access_update",
    tableName: "family_members",
    recordId: data.id,
    recordLabel: `${familyEmail} -> ${participantName}`,
    metadata: { familyEmail, familyName, participantName, relationship, status }
  });

  return NextResponse.json({ message: "Family portal access saved.", id: data.id });
}
