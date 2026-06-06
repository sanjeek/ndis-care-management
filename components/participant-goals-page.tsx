"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ParticipantOption = { name: string; ndis_number: string; plan_type: string };
type GoalRecord = {
  id: string;
  participant_name: string;
  title: string;
  description: string | null;
  target_outcome: string | null;
  support_strategy: string | null;
  start_date: string | null;
  target_date: string | null;
  current_progress_percent: number;
  status: string;
  created_at: string;
};

const statuses = ["active", "paused", "achieved", "archived"];

export function ParticipantGoalsPage() {
  const [notice, setNotice] = useState("");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [editingId, setEditingId] = useState("");

  const editing = goals.find((goal) => goal.id === editingId);
  const summary = useMemo(() => ({
    total: goals.length,
    achieved: goals.filter((goal) => goal.status === "achieved" || Number(goal.current_progress_percent) >= 100).length,
    average: goals.length ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.current_progress_percent ?? 0), 0) / goals.length) : 0
  }), [goals]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening participant goals.");
      return;
    }
    const response = await fetch("/api/goals", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Goals could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setParticipants(result.participants ?? []);
    setGoals(result.goals ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice(result.goals?.length ? "" : "No participant goals recorded yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await postGoal({
      action: editing ? "update" : "create",
      id: editing?.id ?? "",
      participant_name: String(form.get("participant")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      target_outcome: String(form.get("targetOutcome")),
      support_strategy: String(form.get("supportStrategy")),
      start_date: String(form.get("startDate")),
      target_date: String(form.get("targetDate")),
      current_progress_percent: String(form.get("progress")),
      status: String(form.get("status"))
    });
    if (ok) {
      event.currentTarget.reset();
      setEditingId("");
      await refresh();
    }
  }

  async function postGoal(payload: Record<string, string>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving participant goals.");
      return false;
    }
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Goal could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Participant Goals" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Active goals" value={summary.total} icon={Target} />
        <Metric title="Achieved" value={summary.achieved} icon={CheckCircle2} tone="bg-gumleaf/10 text-gumleaf" />
        <Metric title="Average progress" value={`${summary.average}%`} icon={TrendingUp} tone="bg-harbour/10 text-harbour" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        {canManage ? (
          <Panel title={editing ? "Update goal" : "Create participant goal"} icon={Target}>
            <form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4">
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={editing?.participant_name ?? ""} />
              <Field name="title" label="Goal title" defaultValue={editing?.title ?? ""} placeholder="Build independence with morning routine" />
              <Area name="description" label="Goal description" defaultValue={editing?.description ?? ""} placeholder="Describe the participant goal, baseline, and context." required={false} />
              <Area name="targetOutcome" label="Target outcome" defaultValue={editing?.target_outcome ?? ""} placeholder="What success looks like for the participant." />
              <Area name="supportStrategy" label="Support strategy" defaultValue={editing?.support_strategy ?? ""} placeholder="How workers should support and record progress." required={false} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="startDate" label="Start date" type="date" defaultValue={editing?.start_date ?? ""} required={false} />
                <Field name="targetDate" label="Target date" type="date" defaultValue={editing?.target_date ?? ""} required={false} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="progress" label="Progress %" type="number" min="0" max="100" defaultValue={String(editing?.current_progress_percent ?? 0)} />
                <Select name="status" label="Status" options={statuses} defaultValue={editing?.status ?? "active"} />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">{editing ? "Update goal" : "Save goal"}</button>
                {editing ? <button type="button" onClick={() => setEditingId("")} className="min-h-12 rounded border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">Cancel edit</button> : null}
              </div>
            </form>
          </Panel>
        ) : (
          <Panel title="Assigned participant goals" icon={Target}>
            <p className="text-sm leading-6 text-slate-600">Goals are read-only here. Progress is updated when completed activities are linked from progress notes.</p>
          </Panel>
        )}

        <Panel title="Goal progress" icon={TrendingUp}>
          {goals.length ? (
            <div className="grid gap-3">
              {goals.map((goal) => (
                <article key={goal.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{goal.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{goal.participant_name}</p>
                    </div>
                    <Badge label={goal.status} tone={statusTone(goal.status)} />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Progress</span>
                      <span className="font-semibold text-ink">{Math.round(Number(goal.current_progress_percent ?? 0))}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
                      <div className="h-full bg-gumleaf" style={{ width: `${Math.min(100, Number(goal.current_progress_percent ?? 0))}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Target date" value={dateLabel(goal.target_date)} />
                    <Info label="Target outcome" value={goal.target_outcome || "Not recorded"} />
                  </div>
                  {goal.description ? <Info label="Description" value={goal.description} /> : null}
                  {goal.support_strategy ? <Info label="Support strategy" value={goal.support_strategy} /> : null}
                  {canManage ? <button type="button" onClick={() => setEditingId(goal.id)} className="mt-4 rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Edit goal</button> : null}
                </article>
              ))}
            </div>
          ) : (
            <Empty title="No participant goals" message={canManage ? "Create a participant goal to start tracking progress." : "No goals are currently visible for your account."} />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon, tone = "bg-harbour/10 text-harbour" }: { title: string; value: string | number; icon: typeof Target; tone?: string }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Target; children: React.ReactNode }) {
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

function Field({ name, label, defaultValue = "", placeholder = "", type = "text", required = true, min, max }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean; min?: string; max?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} min={min} max={max} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Area({ name, label, defaultValue = "", placeholder = "", required = true }: { name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required={required} rows={4} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, defaultValue = "" }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 rounded bg-white p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
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

function statusTone(status: string) {
  if (status === "achieved") return "bg-gumleaf/10 text-gumleaf";
  if (status === "paused") return "bg-banksia/20 text-ink";
  if (status === "archived") return "bg-slate-200 text-slate-600";
  return "bg-harbour/10 text-harbour";
}
