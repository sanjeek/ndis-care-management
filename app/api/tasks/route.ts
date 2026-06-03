import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type TaskUpdate = {
  status?: string;
  status_note?: string;
};

const statuses = new Set(["open", "in_progress", "completed", "cancelled"]);
const priorities = new Set(["low", "medium", "high", "critical"]);

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const email = auth.user.email.toLowerCase();
  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const taskQuery = auth.client
    .from("participant_tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!canManage) {
    taskQuery.eq("assigned_worker_email", email);
  }

  const [tasks, participants, workers] = await Promise.all([
    taskQuery,
    auth.client.from("participants").select("name, ndis_number, plan_type").order("name", { ascending: true }),
    canManage
      ? auth.client.from("support_workers").select("name, email").order("name", { ascending: true })
      : auth.client.from("support_workers").select("name, email").eq("email", email)
  ]);

  if (tasks.error) return NextResponse.json({ message: tasks.error.message }, { status: 400 });
  if (participants.error) return NextResponse.json({ message: participants.error.message }, { status: 400 });
  if (workers.error) return NextResponse.json({ message: workers.error.message }, { status: 400 });

  const visibleParticipants = canManage
    ? participants.data ?? []
    : (participants.data ?? []).filter((participant) =>
        (tasks.data ?? []).some((task) => String(task.participant_name ?? "") === String(participant.name ?? ""))
      );

  return NextResponse.json({
    currentUser: auth.user,
    canManage,
    tasks: tasks.data ?? [],
    participants: visibleParticipants,
    workers: workers.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = String(body.action ?? "create");
  if (action === "update") {
    return updateTask(auth, body);
  }
  return createTask(auth, body);
}

async function createTask(auth: Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>, body: Record<string, unknown>) {
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin and team leader users can create participant tasks." }, { status: 403 });
  }

  const participantName = clean(body.participant_name);
  const workerName = clean(body.assigned_worker_name);
  const workerEmail = clean(body.assigned_worker_email).toLowerCase();
  const title = clean(body.title);
  const priority = priorities.has(clean(body.priority)) ? clean(body.priority) : "medium";
  const dueDate = clean(body.due_date) || null;
  if (!participantName || !workerName || !workerEmail || !title) {
    return NextResponse.json({ message: "Participant, assigned worker, worker email, and task title are required." }, { status: 400 });
  }

  const { data: task, error } = await auth.client
    .from("participant_tasks")
    .insert({
      participant_name: participantName,
      assigned_worker_name: workerName,
      assigned_worker_email: workerEmail,
      title,
      description: clean(body.description),
      due_date: dueDate,
      priority,
      status: "open",
      created_by: auth.user.id,
      created_by_email: auth.user.email
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await auth.client.from("app_notifications").insert({
    recipient_email: workerEmail,
    notification_type: "participant_task",
    title: `New task: ${title}`,
    body: `${participantName} task assigned by ${auth.user.name}.`,
    link_url: "/tasks",
    metadata: { taskId: task.id, participantName, assignedBy: auth.user.email }
  });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_task_create",
    tableName: "participant_tasks",
    recordId: task.id,
    recordLabel: title,
    metadata: { participantName, assignedWorkerEmail: workerEmail, priority, dueDate }
  });

  return NextResponse.json({ message: "Participant task assigned.", id: task.id });
}

async function updateTask(auth: Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>, body: Record<string, unknown>) {
  const id = clean(body.id);
  const status = clean(body.status);
  if (!id || !statuses.has(status)) {
    return NextResponse.json({ message: "Task and a valid status are required." }, { status: 400 });
  }

  const { data: existing, error: loadError } = await auth.client
    .from("participant_tasks")
    .select("id, title, assigned_worker_email, participant_name")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !existing) {
    return NextResponse.json({ message: loadError?.message ?? "Task not found." }, { status: 404 });
  }

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const assignedToUser = String(existing.assigned_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!canManage && !assignedToUser) {
    return NextResponse.json({ message: "You can only update tasks assigned to you." }, { status: 403 });
  }

  const update: TaskUpdate & {
    completed_at?: string | null;
    completed_by?: string | null;
    completed_by_email?: string | null;
    updated_at: string;
  } = {
    status,
    status_note: clean(body.status_note),
    updated_at: new Date().toISOString()
  };
  if (status === "completed") {
    update.completed_at = new Date().toISOString();
    update.completed_by = auth.user.id;
    update.completed_by_email = auth.user.email;
  }
  if (status !== "completed") {
    update.completed_at = null;
    update.completed_by = null;
    update.completed_by_email = null;
  }

  const { error } = await auth.client.from("participant_tasks").update(update).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "participant_task_update",
    tableName: "participant_tasks",
    recordId: id,
    recordLabel: String(existing.title ?? ""),
    metadata: { participantName: existing.participant_name, status }
  });

  return NextResponse.json({ message: "Task status updated." });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}
