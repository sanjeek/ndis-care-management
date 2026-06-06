"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Filter, Pencil, Target, TrendingUp, Trash2 } from "lucide-react";
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
  ndis_category: string | null;
  start_date: string | null;
  target_date: string | null;
  current_progress_percent: number;
  status: string;
  created_at: string;
};

const statuses = ["active", "paused", "achieved", "archived"];
const NDIS_CATEGORIES = [
  "Daily Living",
  "Social & Community",
  "Employment",
  "Improved Living Arrangements",
  "Increased Social & Community Participation",
  "Finding & Keeping a Job",
  "Improved Health & Wellbeing",
  "Improved Learning",
  "Improved Life Choices",
  "Improved Daily Living",
  "Improved Relationships",
];

export function ParticipantGoalsPage() {
  const [notice, setNotice] = useState("");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [progressUpdating, setProgressUpdating] = useState<Record<string, boolean>>({});

  const editing = goals.find((goal) => goal.id === editingId);

  const summary = useMemo(() => ({
    total: goals.filter((g) => g.status === "active").length,
    achieved: goals.filter((g) => g.status === "achieved" || Number(g.current_progress_percent) >= 100).length,
    average: goals.length ? Math.round(goals.reduce((sum, g) => sum + Number(g.current_progress_percent ?? 0), 0) / goals.length) : 0,
    paused: goals.filter((g) => g.status === "paused").length,
  }), [goals]);

  const filteredGoals = useMemo(() => {
    let list = goals;
    if (statusFilter !== "all") list = list.filter((g) => g.status === statusFilter);
    if (participantFilter !== "all") list = list.filter((g) => g.participant_name === participantFilter);
    return list;
  }, [goals, statusFilter, participantFilter]);

  const uniqueParticipants = useMemo(() => Array.from(new Set(goals.map((g) => g.participant_name))).sort(), [goals]);

  const refresh = useCallback(async () => {
    if (!supabase) { setNotice("Supabase is not connected."); return; }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setNotice("Please sign in again before opening participant goals."); return; }
    const response = await fetch("/api/goals", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Goals could not be loaded." }));
    if (!response.ok) { setNotice(result.message); return; }
    setParticipants(result.participants ?? []);
    setGoals(result.goals ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice(result.goals?.length ? "" : "No participant goals recorded yet.");
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function postGoal(payload: Record<string, string>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setNotice("Please sign in again before saving participant goals."); return false; }
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({ message: "Goal could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setSaving(true);
    const ok = await postGoal({
      action: editing ? "update" : "create",
      id: editing?.id ?? "",
      participant_name: String(form.get("participant")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      target_outcome: String(form.get("targetOutcome")),
      support_strategy: String(form.get("supportStrategy")),
      ndis_category: String(form.get("ndisCategory")),
      start_date: String(form.get("startDate")),
      target_date: String(form.get("targetDate")),
      current_progress_percent: String(form.get("progress")),
      status: String(form.get("status")),
    });
    setSaving(false);
    if (ok) {
      formEl.reset();
      setEditingId("");
      await refresh();
    }
  }

  async function quickProgress(goal: GoalRecord, newPct: number) {
    setProgressUpdating((prev) => ({ ...prev, [goal.id]: true }));
    await postGoal({
      action: "update",
      id: goal.id,
      participant_name: goal.participant_name,
      title: goal.title,
      description: goal.description ?? "",
      target_outcome: goal.target_outcome ?? "",
      support_strategy: goal.support_strategy ?? "",
      ndis_category: goal.ndis_category ?? "",
      start_date: goal.start_date ?? "",
      target_date: goal.target_date ?? "",
      current_progress_percent: String(newPct),
      status: newPct >= 100 ? "achieved" : goal.status,
    });
    setProgressUpdating((prev) => ({ ...prev, [goal.id]: false }));
    await refresh();
  }

  async function quickStatus(goal: GoalRecord, newStatus: string) {
    await postGoal({
      action: "update",
      id: goal.id,
      participant_name: goal.participant_name,
      title: goal.title,
      description: goal.description ?? "",
      target_outcome: goal.target_outcome ?? "",
      support_strategy: goal.support_strategy ?? "",
      ndis_category: goal.ndis_category ?? "",
      start_date: goal.start_date ?? "",
      target_date: goal.target_date ?? "",
      current_progress_percent: String(newStatus === "achieved" ? 100 : goal.current_progress_percent),
      status: newStatus,
    });
    await refresh();
  }

  return (
    <AppShell title="Participant Goals" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Active goals" value={summary.total} icon={Target} />
        <Metric title="Achieved" value={summary.achieved} icon={CheckCircle2} tone="bg-gumleaf/10 text-gumleaf" />
        <Metric title="Average progress" value={`${summary.average}%`} icon={TrendingUp} tone="bg-harbour/10 text-harbour" />
        <Metric title="Paused" value={summary.paused} icon={Archive} tone="bg-banksia/20 text-banksia" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        {canManage ? (
          <Panel title={editing ? "Update goal" : "Create participant goal"} icon={Target}>
            <form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4">
              <Select name="participant" label="Participant" options={participants.map((p) => p.name)} defaultValue={editing?.participant_name ?? ""} />
              <Field name="title" label="Goal title" defaultValue={editing?.title ?? ""} placeholder="Build independence with morning routine" />
              <Select name="ndisCategory" label="NDIS support category" options={NDIS_CATEGORIES} defaultValue={editing?.ndis_category ?? ""} required={false} />
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
                <button disabled={saving} className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Update goal" : "Save goal"}
                </button>
                {editing ? (
                  <button type="button" onClick={() => setEditingId("")} className="min-h-12 rounded border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </Panel>
        ) : (
          <Panel title="Assigned participant goals" icon={Target}>
            <p className="text-sm leading-6 text-slate-600">Goals are read-only here. Progress is updated when completed activities are linked from progress notes.</p>
          </Panel>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex flex-wrap gap-1.5">
              {["all", ...statuses].map((s) => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${statusFilter === s ? "bg-gumleaf text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s === "all" ? "All statuses" : s}
                </button>
              ))}
            </div>
            {uniqueParticipants.length > 1 && (
              <select value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value)}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-gumleaf">
                <option value="all">All participants</option>
                {uniqueParticipants.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>

          {filteredGoals.length ? (
            <div className="grid gap-3">
              {filteredGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} canManage={canManage}
                  progressUpdating={!!progressUpdating[goal.id]}
                  onEdit={() => { setEditingId(goal.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onQuickProgress={(pct) => void quickProgress(goal, pct)}
                  onQuickStatus={(s) => void quickStatus(goal, s)} />
              ))}
            </div>
          ) : (
            <Empty title="No goals found" message={goals.length ? "Try a different filter." : canManage ? "Create a participant goal to start tracking progress." : "No goals are currently visible for your account."} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function GoalCard({ goal, canManage, progressUpdating, onEdit, onQuickProgress, onQuickStatus }: {
  goal: GoalRecord; canManage: boolean; progressUpdating: boolean;
  onEdit: () => void; onQuickProgress: (pct: number) => void; onQuickStatus: (s: string) => void;
}) {
  const [localPct, setLocalPct] = useState(Number(goal.current_progress_percent ?? 0));
  const pct = Math.round(Number(goal.current_progress_percent ?? 0));

  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{goal.title}</h3>
            <Badge label={goal.status} tone={statusTone(goal.status)} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{goal.participant_name}{goal.ndis_category ? ` · ${goal.ndis_category}` : ""}</p>
        </div>
        {canManage && (
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={onEdit} title="Edit goal"
              className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {goal.status !== "achieved" && (
              <button type="button" onClick={() => onQuickStatus("achieved")} title="Mark as achieved"
                className="rounded border border-gumleaf/20 bg-gumleaf/5 p-1.5 text-gumleaf hover:bg-gumleaf/15">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            )}
            {goal.status !== "archived" && (
              <button type="button" onClick={() => onQuickStatus("archived")} title="Archive goal"
                className="rounded border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Progress</span>
          <span className="font-semibold text-ink">{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-200">
          <div className={`h-full transition-all duration-500 ${pct >= 100 ? "bg-gumleaf" : pct >= 70 ? "bg-harbour" : pct >= 40 ? "bg-banksia" : "bg-coral/60"}`}
            style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        {canManage && (
          <div className="mt-2 flex items-center gap-3">
            <input type="range" min={0} max={100} step={5} value={localPct}
              onChange={(e) => setLocalPct(Number(e.target.value))}
              onMouseUp={() => { if (localPct !== pct) onQuickProgress(localPct); }}
              onTouchEnd={() => { if (localPct !== pct) onQuickProgress(localPct); }}
              disabled={progressUpdating}
              className="h-1.5 w-full cursor-pointer accent-gumleaf disabled:opacity-50" />
            <span className="w-10 shrink-0 text-right text-xs text-slate-500">{localPct}%</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-slate-100 bg-slate-50 p-2.5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target date</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-slate-700">{dateLabel(goal.target_date)}</span>
            {goal.target_date ? (() => {
              const days = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000);
              if (days < 0) return <span className="rounded bg-coral/10 px-1.5 py-0.5 text-xs font-semibold text-coral">{Math.abs(days)}d overdue</span>;
              if (days <= 30) return <span className="rounded bg-banksia/20 px-1.5 py-0.5 text-xs font-semibold text-banksia">{days}d left</span>;
              return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{days}d to go</span>;
            })() : null}
          </div>
        </div>
        {goal.target_outcome ? (
          <div className="rounded border border-slate-100 bg-slate-50 p-2.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target outcome</p>
            <p className="mt-1 leading-5 text-slate-700 line-clamp-2">{goal.target_outcome}</p>
          </div>
        ) : null}
      </div>

      {goal.description ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-600">Description</summary>
          <p className="mt-1 text-sm leading-6 text-slate-600">{goal.description}</p>
        </details>
      ) : null}
      {goal.support_strategy ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-600">Support strategy</summary>
          <p className="mt-1 text-sm leading-6 text-slate-600">{goal.support_strategy}</p>
        </details>
      ) : null}
    </article>
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
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}{required ? <span className="ml-0.5 text-coral">*</span> : null}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} min={min} max={max} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Area({ name, label, defaultValue = "", placeholder = "", required = true }: { name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}{required ? <span className="ml-0.5 text-coral">*</span> : null}</span>
      <textarea name={name} required={required} rows={3} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, defaultValue = "", required = true }: { name: string; label: string; options: string[]; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}{required ? <span className="ml-0.5 text-coral">*</span> : null}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(status: string) {
  if (status === "achieved") return "bg-gumleaf/10 text-gumleaf";
  if (status === "paused") return "bg-banksia/20 text-ink";
  if (status === "archived") return "bg-slate-200 text-slate-600";
  return "bg-harbour/10 text-harbour";
}
