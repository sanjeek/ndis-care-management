import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type Auth = Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>;

const actionStatuses = new Set(["open", "in_progress", "completed", "cancelled"]);
const priorities = new Set(["low", "medium", "high", "critical"]);

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const visibleParticipants = canManage ? [] : await loadAssignedParticipants(auth, auth.user.email.toLowerCase());
  if (!canManage && !visibleParticipants.length) {
    return NextResponse.json({ canManage, participants: [], goals: [], contacts: [], bookings: [], meetings: [], actions: [], workers: [] });
  }

  let goalsQuery = auth.client.from("participant_goals").select("id, participant_name, title, current_progress_percent, status").order("created_at", { ascending: false });
  let contactsQuery = auth.client.from("support_coordination_provider_contacts").select("*").order("provider_name", { ascending: true });
  let bookingsQuery = auth.client.from("support_coordination_service_bookings").select("*").order("end_date", { ascending: true, nullsFirst: false });
  let meetingsQuery = auth.client.from("support_coordination_case_meetings").select("*").order("meeting_date", { ascending: false });
  let actionsQuery = auth.client.from("support_coordination_actions").select("*").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (!canManage) {
    goalsQuery = goalsQuery.in("participant_name", visibleParticipants);
    contactsQuery = contactsQuery.in("participant_name", visibleParticipants);
    bookingsQuery = bookingsQuery.in("participant_name", visibleParticipants);
    meetingsQuery = meetingsQuery.in("participant_name", visibleParticipants);
    actionsQuery = actionsQuery.in("participant_name", visibleParticipants);
  }

  const [participants, goals, contacts, bookings, meetings, actions, workers] = await Promise.all([
    auth.client.from("participants").select("name, ndis_number, plan_type").order("name", { ascending: true }),
    goalsQuery,
    contactsQuery,
    bookingsQuery,
    meetingsQuery,
    actionsQuery,
    canManage
      ? auth.client.from("support_workers").select("name, email").order("name", { ascending: true })
      : auth.client.from("support_workers").select("name, email").eq("email", auth.user.email.toLowerCase())
  ]);

  for (const result of [participants, goals, contacts, bookings, meetings, actions, workers]) {
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
  }

  const participantRows = canManage
    ? participants.data ?? []
    : (participants.data ?? []).filter((participant) => visibleParticipants.includes(String(participant.name ?? "")));

  return NextResponse.json({
    canManage,
    participants: participantRows,
    goals: goals.data ?? [],
    contacts: contacts.data ?? [],
    bookings: bookings.data ?? [],
    meetings: meetings.data ?? [],
    actions: actions.data ?? [],
    workers: workers.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = clean(body.action);
  if (action === "update_action") return updateCoordinationAction(auth, body);

  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin and team leader users can manage support coordination." }, { status: 403 });
  }
  if (action === "contact") return createProviderContact(auth, body);
  if (action === "booking") return createServiceBooking(auth, body);
  if (action === "meeting") return createCaseMeeting(auth, body);
  if (action === "coordination_action") return createCoordinationAction(auth, body);

  return NextResponse.json({ message: "Select a valid support coordination action." }, { status: 400 });
}

async function createProviderContact(auth: Auth, body: Record<string, unknown>) {
  const payload = {
    participant_name: clean(body.participant_name),
    provider_name: clean(body.provider_name),
    service_type: clean(body.service_type),
    contact_name: clean(body.contact_name),
    phone: clean(body.phone),
    email: clean(body.email).toLowerCase(),
    address: clean(body.address),
    notes: clean(body.notes),
    status: clean(body.status) === "inactive" ? "inactive" : "active",
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
  if (!payload.participant_name || !payload.provider_name) {
    return NextResponse.json({ message: "Participant and provider name are required." }, { status: 400 });
  }
  const { data, error } = await auth.client.from("support_coordination_provider_contacts").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await audit(auth, "support_coordination_contact_create", "support_coordination_provider_contacts", data.id, payload.provider_name, payload);
  return NextResponse.json({ message: "Provider contact saved.", id: data.id });
}

async function createServiceBooking(auth: Auth, body: Record<string, unknown>) {
  const payload = {
    participant_name: clean(body.participant_name),
    provider_contact_id: clean(body.provider_contact_id) || null,
    provider_name: clean(body.provider_name),
    support_category: clean(body.support_category),
    line_item: clean(body.line_item),
    booking_reference: clean(body.booking_reference),
    start_date: clean(body.start_date) || null,
    end_date: clean(body.end_date) || null,
    budget_amount: money(body.budget_amount),
    used_amount: money(body.used_amount),
    status: bookingStatus(clean(body.status)),
    notes: clean(body.notes),
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
  if (!payload.participant_name || !payload.provider_name || !payload.support_category) {
    return NextResponse.json({ message: "Participant, provider, and support category are required." }, { status: 400 });
  }
  const { data, error } = await auth.client.from("support_coordination_service_bookings").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await audit(auth, "support_coordination_booking_create", "support_coordination_service_bookings", data.id, payload.booking_reference || payload.provider_name, payload);
  return NextResponse.json({ message: "Service booking saved.", id: data.id });
}

async function createCaseMeeting(auth: Auth, body: Record<string, unknown>) {
  const payload = {
    participant_name: clean(body.participant_name),
    meeting_date: clean(body.meeting_date),
    meeting_type: clean(body.meeting_type) || "review",
    attendees: clean(body.attendees),
    summary: clean(body.summary),
    decisions: clean(body.decisions),
    next_steps: clean(body.next_steps),
    status: meetingStatus(clean(body.status)),
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
  if (!payload.participant_name || !payload.meeting_date) {
    return NextResponse.json({ message: "Participant and meeting date are required." }, { status: 400 });
  }
  const { data, error } = await auth.client.from("support_coordination_case_meetings").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await audit(auth, "support_coordination_meeting_create", "support_coordination_case_meetings", data.id, `${payload.participant_name} meeting`, payload);
  return NextResponse.json({ message: "Case meeting saved.", id: data.id });
}

async function createCoordinationAction(auth: Auth, body: Record<string, unknown>) {
  const payload = {
    participant_name: clean(body.participant_name),
    goal_id: clean(body.goal_id) || null,
    case_meeting_id: clean(body.case_meeting_id) || null,
    title: clean(body.title),
    description: clean(body.description),
    assigned_to_name: clean(body.assigned_to_name),
    assigned_to_email: clean(body.assigned_to_email).toLowerCase(),
    due_date: clean(body.due_date) || null,
    priority: priorities.has(clean(body.priority)) ? clean(body.priority) : "medium",
    status: actionStatuses.has(clean(body.status)) ? clean(body.status) : "open",
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };
  if (!payload.participant_name || !payload.title) {
    return NextResponse.json({ message: "Participant and action title are required." }, { status: 400 });
  }
  const { data, error } = await auth.client.from("support_coordination_actions").insert(payload).select("id").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await audit(auth, "support_coordination_action_create", "support_coordination_actions", data.id, payload.title, payload);
  return NextResponse.json({ message: "Coordination action saved.", id: data.id });
}

async function updateCoordinationAction(auth: Auth, body: Record<string, unknown>) {
  const id = clean(body.id);
  const status = clean(body.status);
  if (!id || !actionStatuses.has(status)) {
    return NextResponse.json({ message: "Action and valid status are required." }, { status: 400 });
  }
  const { data: existing, error: loadError } = await auth.client
    .from("support_coordination_actions")
    .select("id, title, assigned_to_email, participant_name")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !existing) return NextResponse.json({ message: loadError?.message ?? "Coordination action not found." }, { status: 404 });
  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const assignedToUser = String(existing.assigned_to_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!canManage && !assignedToUser) {
    return NextResponse.json({ message: "You can only update actions assigned to you." }, { status: 403 });
  }
  const update = {
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };
  const { error } = await auth.client.from("support_coordination_actions").update(update).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await audit(auth, "support_coordination_action_update", "support_coordination_actions", id, String(existing.title ?? ""), { status, participantName: existing.participant_name });
  return NextResponse.json({ message: "Coordination action updated." });
}

async function loadAssignedParticipants(auth: Auth, email: string) {
  const { data } = await auth.client.from("shifts").select("participant_name").eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row) => String(row.participant_name ?? "")).filter(Boolean)));
}

async function audit(auth: Auth, action: string, tableName: string, recordId: string, recordLabel: string, metadata: Record<string, unknown>) {
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action,
    tableName,
    recordId,
    recordLabel,
    metadata
  });
}

function bookingStatus(value: string) {
  return ["planned", "active", "paused", "completed", "cancelled"].includes(value) ? value : "active";
}

function meetingStatus(value: string) {
  return ["scheduled", "completed", "cancelled"].includes(value) ? value : "scheduled";
}

function money(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}
