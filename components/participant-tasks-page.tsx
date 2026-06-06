"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, ListChecks, Plus, UserRoundCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type TaskRecord = {
  id: string;
  participant_name: string;
  assigned_worker_name: string;
  assigned_worker_email: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  status_note: string | null;
  completed_at: string | null;
  created_at: string;
};

type ParticipantOption = {
  name: string;
  ndis_number: string;
  plan_type: string;
};

type WorkerOption = {
  name: string;
  email: string;
};

export function ParticipantTasksPage() {
  const [notice, setNotice] = useState("");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [canManage, setCanManage] = useState(false);

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      open: tasks.filter((task) => task.status === "open" || task.status === "in_progress").length,
      overdue: tasks.filter((task) => task.due_date && new Date(`${task.due_date}T00:00:00`) < today && task.status !== "completed").length,
      completed: tasks.filter((task) => task.status === "completed").length
    };
  }, [tasks]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening participant tasks.");
      return;
    }

    const response = await fetch("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({ message: "Tasks could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setTasks(result.tasks ?? []);
    setParticipants(result.participants ?? []);
    setWorkers(result.workers ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice(result.tasks?.length ? "" : "No participant tasks yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const workerParts = String(form.get("worker")).split("||");
    const ok = await postTask({
      action: "create",
      participant_name: String(form.get("participant")),
      assigned_worker_email: workerParts[0] ?? "",
      assigned_worker_name: workerParts[1] ?? "",
      title: String(form.get("title")),
      description: String(form.get("description")),
      due_date: String(form.get("dueDate")),
      priority: String(form.get("priority"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function updateTask(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await postTask({
      action: "update",
      id,
      status: String(form.get("status")),
      status_note: String(form.get("statusNote"))
    });
    if (ok) await refresh();
  }

  async function postTask(payload: Record<string, string>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving tasks.");
      return false;
    }
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Task could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Participant Tasks" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Open tasks" value={summary.open} icon={ListChecks} />
        <Metric title="Overdue" value={summary.overdue} icon={CircleAlert} tone="text-coral bg-coral/10" />
        <Metric title="Completed" value={summary.completed} icon={CheckCircle2} tone="text-gumleaf bg-gumleaf/10" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        {canManage ? (
          <Panel title="Assign participant task" icon={Plus}>
            <form onSubmit={createTask} className="grid gap-4">
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              <Select name="worker" label="Assign support worker" options={workers.map((worker) => `${worker.email}||${worker.name}`)} renderLabel={(value) => value.split("||")[1] || value} />
              <Field name="title" label="Task title" placeholder="Medication follow-up, goal activity, document request" />
              <Area name="description" label="Task details" placeholder="Describe what needs to be completed and any participant-specific instructions." required={false} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="dueDate" label="Due date" type="date" required={false} />
                <Select name="priority" label="Priority" options={["low", "medium", "high", "critical"]} />
              </div>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
                <Plus className="h-4 w-4" />
                Assign task
              </button>
            </form>
          </Panel>
        ) : (
          <Panel title="My assigned tasks" icon={UserRoundCheck}>
            <p className="text-sm leading-6 text-slate-600">Only tasks assigned to your support worker account are shown here. Admin records, other workers, invoices, settings, and unrelated participant information are hidden.</p>
          </Panel>
        )}

        <Panel title={canManage ? "Task register" : "My task list"} icon={CalendarClock}>
          {tasks.length ? (
            <div className="grid gap-3">
              {tasks.map((task) => (
                <article key={task.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{task.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{task.participant_name} | {task.assigned_worker_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge label={statusLabel(task.status)} tone={statusTone(task.status)} />
                      <Badge label={task.priority} tone={priorityTone(task.priority)} />
                    </div>
                  </div>

                  {task.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description}</p> : null}
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Info label="Due date" value={dateLabel(task.due_date)} />
                    <Info label="Created" value={dateLabel(task.created_at)} />
                    <Info label="Completed" value={dateLabel(task.completed_at)} />
                  </div>
                  {task.status_note ? <p className="mt-3 rounded bg-white p-3 text-sm leading-6 text-slate-600">{task.status_note}</p> : null}

                  <form onSubmit={(event) => updateTask(event, task.id)} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-[190px_1fr_auto]">
                    <label>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                      <select name="status" defaultValue={task.status} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status update</span>
                      <input name="statusNote" defaultValue={task.status_note ?? ""} placeholder="Add a completion or follow-up note" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
                    </label>
                    <button className="mt-auto min-h-11 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Update</button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="No participant tasks" message={canManage ? "Assign a participant-related task to a support worker to start tracking work." : "You do not have any assigned participant tasks yet."} />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon, tone = "text-harbour bg-harbour/10" }: { title: string; value: number; icon: typeof ListChecks; tone?: string }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`rounded p-2 ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </section>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof ListChecks; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <Icon className="h-5 w-5 text-gumleaf" />
      </div>
      {children}
    </section>
  );
}

function Field({ name, label, placeholder = "", type = "text", required = true }: { name: string; label: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Area({ name, label, placeholder = "", required = true }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required={required} rows={4} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, renderLabel }: { name: string; label: string; options: string[]; renderLabel?: (value: string) => string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>{renderLabel ? renderLabel(option) : option}</option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: string) {
  if (status === "completed") return "bg-gumleaf/10 text-gumleaf";
  if (status === "cancelled") return "bg-slate-200 text-slate-600";
  if (status === "in_progress") return "bg-harbour/10 text-harbour";
  return "bg-banksia/20 text-ink";
}

function priorityTone(priority: string) {
  if (priority === "critical") return "bg-coral/10 text-coral";
  if (priority === "high") return "bg-orange-100 text-orange-700";
  if (priority === "low") return "bg-slate-100 text-slate-600";
  return "bg-harbour/10 text-harbour";
}
