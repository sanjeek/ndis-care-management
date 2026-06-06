import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

const statuses = new Set(["active", "paused", "achieved", "archived"]);
type Auth = Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const email = auth.user.email.toLowerCase();
  const goalQuery = auth.client
    .from("participant_goals")
    .select("*")
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  let visibleParticipantNames: string[] = [];
  if (auth.user.role === "support_worker") {
    visibleParticipantNames = await loadAssignedParticipants(auth, email);
    if (!visibleParticipantNames.length) return NextResponse.json({ canManage, participants: [], goals: [] });
    goalQuery.in("participant_name", visibleParticipantNames);
  } else if (auth.user.role === "family") {
    visibleParticipantNames = await loadFamilyParticipants(auth, email);
    if (!visibleParticipantNames.length) return NextResponse.json({ canManage: false, participants: [], goals: [] });
    goalQuery.in("participant_name", visibleParticipantNames).in("status", ["active", "achieved"]);
  }

  const [goals, participants] = await Promise.all([
    goalQuery,
    auth.client.from("participants").select("name, ndis_number, plan_type").order("name", { ascending: true })
  ]);
  if (goals.error) return NextResponse.json({ message: goals.error.message }, { status: 400 });
  if (participants.error) return NextResponse.json({ message: participants.error.message }, { status: 400 });

  const participantRows = canManage
    ? participants.data ?? []
    : (participants.data ?? []).filter((participant) => visibleParticipantNames.includes(String(participant.name ?? "")));

  return NextResponse.json({
    canManage,
    participants: participantRows,
    goals: goals.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin and team leader users can manage participant goals." }, { status: 403 });
  }

  const body = await request.json();
  const action = clean(body.action || "create");
  return action === "update" ? updateGoal(auth, body) : createGoal(auth, body);
}

async function createGoal(auth: Auth, body: Record<string, unknown>) {
  const payload = goalPayload(auth, body);
  const validation = validateGoal(payload);
  if (validation) return NextResponse.json({ message: validation }, { status: 400 });

  const { data, error } = await auth.client.from("participant_goals").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await auditGoal(auth, "participant_goal_create", data.id, payload);
  return NextResponse.json({ message: "Participant goal saved.", id: data.id });
}

async function updateGoal(auth: Auth, body: Record<string, unknown>) {
  const id = clean(body.id);
  if (!id) return NextResponse.json({ message: "Goal is required." }, { status: 400 });
  const payload = { ...goalPayload(auth, body), updated_at: new Date().toISOString() };
  const validation = validateGoal(payload);
  if (validation) return NextResponse.json({ message: validation }, { status: 400 });

  const { error } = await auth.client.from("participant_goals").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await auditGoal(auth, "participant_goal_update", id, payload);
  return NextResponse.json({ message: "Participant goal updated." });
}

function goalPayload(auth: Auth, body: Record<string, unknown>) {
  const status = clean(body.status);
  const progress = Math.min(100, Math.max(0, Number(body.current_progress_percent ?? 0) || 0));
  return {
    participant_name: clean(body.participant_name),
    title: clean(body.title),
    description: clean(body.description),
    target_outcome: clean(body.target_outcome),
    support_strategy: clean(body.support_strategy),
    ndis_category: clean(body.ndis_category) || null,
    start_date: clean(body.start_date) || null,
    target_date: clean(body.target_date) || null,
    current_progress_percent: progress,
    status: statuses.has(status) ? status : "active",
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
}

function validateGoal(payload: ReturnType<typeof goalPayload>) {
  if (!payload.participant_name) return "Participant is required.";
  if (!payload.title) return "Goal title is required.";
  if (!payload.target_outcome) return "Target outcome is required.";
  return "";
}

async function auditGoal(auth: Auth, action: string, id: string, payload: ReturnType<typeof goalPayload>) {
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action,
    tableName: "participant_goals",
    recordId: id,
    recordLabel: payload.title,
    metadata: {
      participantName: payload.participant_name,
      progress: payload.current_progress_percent,
      status: payload.status
    }
  });
}

async function loadAssignedParticipants(auth: Auth, email: string) {
  const { data } = await auth.client.from("shifts").select("participant_name").eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}

async function loadFamilyParticipants(auth: Auth, email: string) {
  const { data } = await auth.client.from("family_members").select("participant_name").eq("family_email", email).eq("status", "approved");
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}
