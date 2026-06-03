import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

const riskLevels = new Set(["low", "medium", "high", "critical"]);
const statuses = new Set(["draft", "review_required", "approved", "archived"]);

type Auth = Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const email = auth.user.email.toLowerCase();

  let assignedParticipants: string[] = [];
  if (!canManage) {
    assignedParticipants = await loadAssignedParticipants(auth, email);
  }

  const assessmentsQuery = auth.client
    .from("participant_risk_assessments")
    .select("*")
    .order("review_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!canManage) {
    const participantFilter = assignedParticipants.map((name) => `participant_name.eq.${escapeFilterValue(name)}`).join(",");
    assessmentsQuery.or([`assessor_email.eq.${email}`, participantFilter].filter(Boolean).join(","));
  }

  const [assessments, participants] = await Promise.all([
    assessmentsQuery,
    auth.client.from("participants").select("name, ndis_number, plan_type").order("name", { ascending: true })
  ]);

  if (assessments.error) return NextResponse.json({ message: assessments.error.message }, { status: 400 });
  if (participants.error) return NextResponse.json({ message: participants.error.message }, { status: 400 });

  const visibleParticipants = canManage
    ? participants.data ?? []
    : (participants.data ?? []).filter((participant) => assignedParticipants.includes(String(participant.name ?? "")));

  return NextResponse.json({
    currentUser: auth.user,
    canManage,
    participants: visibleParticipants,
    assessments: assessments.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = clean(body.action || "create");
  if (action === "update") return updateAssessment(auth, body);
  return createAssessment(auth, body);
}

async function createAssessment(auth: Auth, body: Record<string, unknown>) {
  const participantName = clean(body.participant_name);
  if (!participantName) {
    return NextResponse.json({ message: "Participant is required." }, { status: 400 });
  }

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  if (!canManage && !(await workerCanAccessParticipant(auth, participantName))) {
    return NextResponse.json({ message: "You can only create risk assessments for participants assigned to you." }, { status: 403 });
  }

  const payload = assessmentPayload(auth, body, participantName);
  const validation = validatePayload(payload);
  if (validation) return NextResponse.json({ message: validation }, { status: 400 });

  const { data, error } = await auth.client
    .from("participant_risk_assessments")
    .insert(payload)
    .select("id")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_risk_assessment_create",
    tableName: "participant_risk_assessments",
    recordId: data.id,
    recordLabel: participantName,
    metadata: { riskLevel: payload.overall_risk_level, status: payload.status, reviewDate: payload.review_date }
  });

  return NextResponse.json({ message: "Risk assessment saved.", id: data.id });
}

async function updateAssessment(auth: Auth, body: Record<string, unknown>) {
  const id = clean(body.id);
  if (!id) return NextResponse.json({ message: "Risk assessment is required." }, { status: 400 });

  const { data: existing, error: loadError } = await auth.client
    .from("participant_risk_assessments")
    .select("id, participant_name, assessor_email")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !existing) {
    return NextResponse.json({ message: loadError?.message ?? "Risk assessment not found." }, { status: 404 });
  }

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const participantName = clean(body.participant_name || existing.participant_name);
  const ownsAssessment = String(existing.assessor_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!canManage && (!ownsAssessment || !(await workerCanAccessParticipant(auth, participantName)))) {
    return NextResponse.json({ message: "You can only update risk assessments assigned to you." }, { status: 403 });
  }

  const payload = {
    ...assessmentPayload(auth, body, participantName),
    updated_at: new Date().toISOString()
  };
  if (payload.status === "approved") {
    Object.assign(payload, {
      approved_by: auth.user.id,
      approved_by_email: auth.user.email,
      approved_at: new Date().toISOString()
    });
  }
  const validation = validatePayload(payload);
  if (validation) return NextResponse.json({ message: validation }, { status: 400 });

  const { error } = await auth.client.from("participant_risk_assessments").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_risk_assessment_update",
    tableName: "participant_risk_assessments",
    recordId: id,
    recordLabel: participantName,
    metadata: { riskLevel: payload.overall_risk_level, status: payload.status, reviewDate: payload.review_date }
  });

  return NextResponse.json({ message: "Risk assessment updated." });
}

function assessmentPayload(auth: Auth, body: Record<string, unknown>, participantName: string) {
  const level = clean(body.overall_risk_level);
  const status = clean(body.status);
  return {
    participant_name: participantName,
    assessor_name: auth.user.name,
    assessor_email: auth.user.email.toLowerCase(),
    assessment_date: clean(body.assessment_date) || new Date().toISOString().slice(0, 10),
    review_date: clean(body.review_date) || null,
    overall_risk_level: riskLevels.has(level) ? level : "medium",
    environmental_risks: clean(body.environmental_risks),
    behavioural_risks: clean(body.behavioural_risks),
    medication_risks: clean(body.medication_risks),
    manual_handling_risks: clean(body.manual_handling_risks),
    control_measures: clean(body.control_measures),
    status: statuses.has(status) ? status : "draft",
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
}

function validatePayload(payload: ReturnType<typeof assessmentPayload>) {
  if (!payload.participant_name) return "Participant is required.";
  if (!payload.environmental_risks) return "Environmental risks are required.";
  if (!payload.behavioural_risks) return "Behavioural risks are required.";
  if (!payload.medication_risks) return "Medication risks are required.";
  if (!payload.manual_handling_risks) return "Manual handling risks are required.";
  if (!payload.control_measures) return "Control measures are required.";
  return "";
}

async function workerCanAccessParticipant(auth: Auth, participantName: string) {
  if (requireRole(auth.user, ["admin", "team_leader"])) return true;
  const { data } = await auth.client
    .from("shifts")
    .select("id")
    .eq("participant_name", participantName)
    .eq("support_worker_email", auth.user.email.toLowerCase())
    .limit(1);
  return Boolean(data?.length);
}

async function loadAssignedParticipants(auth: Auth, email: string) {
  const { data } = await auth.client
    .from("shifts")
    .select("participant_name")
    .eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}

function escapeFilterValue(value: string) {
  return value.replace(/[,()]/g, "");
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}
