"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Car, ClipboardList, MapPinned, Route, ShieldCheck, UserRoundCheck, UsersRound, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ModuleKey = "travel" | "participant-matching" | "visitors" | "vehicles" | "checklists";
type FieldType = "text" | "date" | "time" | "number" | "textarea" | "participant" | "worker" | "shift" | "select";

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

type OptionRow = { name?: string; email?: string; id?: string; participant_name?: string; starts_at?: string };

type ModuleConfig = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  endpoint: string;
  submitLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  fields: FieldConfig[];
  summary: Array<{ label: string; value: (records: Record<string, unknown>[]) => string }>;
  columns: Array<{ label: string; value: (record: Record<string, unknown>) => string }>;
};

const moduleConfig: Record<ModuleKey, ModuleConfig> = {
  travel: {
    title: "Travel Tracking",
    eyebrow: "Record worker travel, kilometres, vehicles, and NDIS billing evidence.",
    description: "Support workers can submit their own travel. Admin and team leaders can review all travel logs for payroll and invoices.",
    icon: Route,
    endpoint: "/api/operations/travel",
    submitLabel: "Record travel",
    emptyTitle: "No travel logs",
    emptyMessage: "Travel entries will appear after a support worker records kilometres or provider travel.",
    fields: [
      { name: "participant_name", label: "Participant", type: "participant" },
      { name: "worker_email", label: "Support worker", type: "worker", required: false },
      { name: "shift_id", label: "Linked shift", type: "shift", required: false },
      { name: "travel_date", label: "Travel date", type: "date" },
      { name: "start_location", label: "Start location", type: "text", placeholder: "Home, office, or service location" },
      { name: "end_location", label: "End location", type: "text", placeholder: "Participant home, community venue, or office" },
      { name: "kilometres", label: "Kilometres", type: "number", placeholder: "0" },
      { name: "travel_purpose", label: "Travel purpose", type: "select", options: ["Provider travel", "Transport with participant", "Community access", "Appointment travel", "Other"] },
      { name: "vehicle_registration", label: "Vehicle registration", type: "text", required: false },
      { name: "notes", label: "Notes", type: "textarea", required: false }
    ],
    summary: [
      { label: "Logs", value: (records) => String(records.length) },
      { label: "Kilometres", value: (records) => records.reduce((sum, row) => sum + Number(row.kilometres ?? 0), 0).toFixed(1) },
      { label: "Submitted", value: (records) => String(records.filter((row) => String(row.status ?? "") === "submitted").length) }
    ],
    columns: [
      { label: "Participant", value: (row) => String(row.participant_name ?? "") },
      { label: "Worker", value: (row) => String(row.worker_name ?? row.worker_email ?? "") },
      { label: "Date", value: (row) => dateLabel(row.travel_date) },
      { label: "Kilometres", value: (row) => `${Number(row.kilometres ?? 0).toFixed(1)} km` },
      { label: "Status", value: (row) => String(row.status ?? "") }
    ]
  },
  "participant-matching": {
    title: "Participant Matching",
    eyebrow: "Match participant preferences, support needs, and worker suitability.",
    description: "Coordinator records show why a worker is recommended, restricted, or unsuitable for a participant.",
    icon: UserRoundCheck,
    endpoint: "/api/operations/participant-matching",
    submitLabel: "Save match",
    emptyTitle: "No participant matches",
    emptyMessage: "Matching recommendations will appear here after a coordinator creates them.",
    fields: [
      { name: "participant_name", label: "Participant", type: "participant" },
      { name: "worker_email", label: "Support worker", type: "worker" },
      { name: "match_score", label: "Match score", type: "number", placeholder: "85" },
      { name: "matching_preferences", label: "Participant preferences", type: "textarea" },
      { name: "support_need_alignment", label: "Support need alignment", type: "textarea" },
      { name: "restrictions", label: "Restrictions or conflicts", type: "textarea", required: false },
      { name: "status", label: "Status", type: "select", options: ["recommended", "review_required", "restricted", "inactive"] }
    ],
    summary: [
      { label: "Matches", value: (records) => String(records.length) },
      { label: "Recommended", value: (records) => String(records.filter((row) => String(row.status ?? "") === "recommended").length) },
      { label: "Avg score", value: (records) => records.length ? Math.round(records.reduce((sum, row) => sum + Number(row.match_score ?? 0), 0) / records.length).toString() : "0" }
    ],
    columns: [
      { label: "Participant", value: (row) => String(row.participant_name ?? "") },
      { label: "Worker", value: (row) => String(row.worker_name ?? row.worker_email ?? "") },
      { label: "Score", value: (row) => `${Number(row.match_score ?? 0)}%` },
      { label: "Status", value: (row) => String(row.status ?? "") }
    ]
  },
  visitors: {
    title: "Visitor Management",
    eyebrow: "Record site visitors, host staff, purpose, and sign-in status.",
    description: "Maintain a secure visitor register for offices, homes, and service locations.",
    icon: UsersRound,
    endpoint: "/api/operations/visitors",
    submitLabel: "Sign visitor",
    emptyTitle: "No visitor logs",
    emptyMessage: "Visitor sign-in records will appear here.",
    fields: [
      { name: "visitor_name", label: "Visitor name", type: "text" },
      { name: "organisation", label: "Organisation", type: "text", required: false },
      { name: "participant_name", label: "Participant", type: "participant", required: false },
      { name: "visit_date", label: "Visit date", type: "date" },
      { name: "sign_in_time", label: "Sign-in time", type: "time" },
      { name: "sign_out_time", label: "Sign-out time", type: "time", required: false },
      { name: "purpose", label: "Purpose", type: "textarea" },
      { name: "host_worker_email", label: "Host staff", type: "worker", required: false },
      { name: "status", label: "Status", type: "select", options: ["signed_in", "signed_out", "cancelled"] }
    ],
    summary: [
      { label: "Visitors", value: (records) => String(records.length) },
      { label: "Signed in", value: (records) => String(records.filter((row) => String(row.status ?? "") === "signed_in").length) },
      { label: "Today", value: (records) => String(records.filter((row) => String(row.visit_date ?? "") === new Date().toISOString().slice(0, 10)).length) }
    ],
    columns: [
      { label: "Visitor", value: (row) => String(row.visitor_name ?? "") },
      { label: "Host", value: (row) => String(row.host_worker_name ?? row.host_worker_email ?? "") },
      { label: "Date", value: (row) => dateLabel(row.visit_date) },
      { label: "Status", value: (row) => String(row.status ?? "") }
    ]
  },
  vehicles: {
    title: "Vehicle Tracking",
    eyebrow: "Track provider vehicles, registration, insurance, odometer, and service dates.",
    description: "Keep vehicle compliance evidence visible before staff use vehicles for NDIS transport.",
    icon: Car,
    endpoint: "/api/operations/vehicles",
    submitLabel: "Save vehicle",
    emptyTitle: "No vehicles",
    emptyMessage: "Vehicle records will appear after they are added.",
    fields: [
      { name: "registration", label: "Registration", type: "text" },
      { name: "make_model", label: "Make and model", type: "text" },
      { name: "owner", label: "Owner", type: "text", required: false },
      { name: "odometer", label: "Odometer", type: "number", required: false },
      { name: "insurance_expiry", label: "Insurance expiry", type: "date", required: false },
      { name: "registration_expiry", label: "Registration expiry", type: "date", required: false },
      { name: "service_due_date", label: "Service due date", type: "date", required: false },
      { name: "status", label: "Status", type: "select", options: ["active", "maintenance", "inactive"] },
      { name: "notes", label: "Notes", type: "textarea", required: false }
    ],
    summary: [
      { label: "Vehicles", value: (records) => String(records.length) },
      { label: "Active", value: (records) => String(records.filter((row) => String(row.status ?? "") === "active").length) },
      { label: "Maintenance", value: (records) => String(records.filter((row) => String(row.status ?? "") === "maintenance").length) }
    ],
    columns: [
      { label: "Registration", value: (row) => String(row.registration ?? "") },
      { label: "Vehicle", value: (row) => String(row.make_model ?? "") },
      { label: "Insurance", value: (row) => dateLabel(row.insurance_expiry) },
      { label: "Status", value: (row) => String(row.status ?? "") }
    ]
  },
  checklists: {
    title: "Participant Checklists",
    eyebrow: "Assign participant-specific tasks, routines, and required completion checks.",
    description: "Workers can see and complete checklists assigned to their login. Admin can manage all checklists.",
    icon: ClipboardList,
    endpoint: "/api/operations/checklists",
    submitLabel: "Create checklist",
    emptyTitle: "No checklists",
    emptyMessage: "Participant checklists will appear after they are created.",
    fields: [
      { name: "participant_name", label: "Participant", type: "participant" },
      { name: "assigned_worker_email", label: "Assigned support worker", type: "worker", required: false },
      { name: "checklist_title", label: "Checklist title", type: "text" },
      { name: "due_date", label: "Due date", type: "date", required: false },
      { name: "checklist_items", label: "Checklist items", type: "textarea", placeholder: "One item per line" },
      { name: "completion_status", label: "Status", type: "select", options: ["open", "in_progress", "completed", "cancelled"] },
      { name: "notes", label: "Notes", type: "textarea", required: false }
    ],
    summary: [
      { label: "Checklists", value: (records) => String(records.length) },
      { label: "Open", value: (records) => String(records.filter((row) => String(row.completion_status ?? "") !== "completed").length) },
      { label: "Completed", value: (records) => String(records.filter((row) => String(row.completion_status ?? "") === "completed").length) }
    ],
    columns: [
      { label: "Checklist", value: (row) => String(row.checklist_title ?? "") },
      { label: "Participant", value: (row) => String(row.participant_name ?? "") },
      { label: "Worker", value: (row) => String(row.assigned_worker_name ?? row.assigned_worker_email ?? "") },
      { label: "Status", value: (row) => String(row.completion_status ?? "") }
    ]
  }
};

export function OperationsModulePage({ module }: { module: ModuleKey }) {
  const config = moduleConfig[module];
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [participants, setParticipants] = useState<OptionRow[]>([]);
  const [workers, setWorkers] = useState<OptionRow[]>([]);
  const [shifts, setShifts] = useState<OptionRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [notice, setNotice] = useState(`Loading ${config.title}.`);

  const Icon = config.icon;
  const metrics = useMemo(() => config.summary.map((item) => ({ label: item.label, value: item.value(records) })), [config, records]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening this module.");
      return;
    }
    const response = await fetch(config.endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Could not load records." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setRecords(result.records ?? []);
    setParticipants(result.participants ?? []);
    setWorkers(result.workers ?? []);
    setShifts(result.shifts ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice((result.records ?? []).length ? `${config.title} loaded from Supabase.` : config.emptyMessage);
  }, [config]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    config.fields.forEach((field) => {
      payload[field.name] = String(form.get(field.name) ?? "");
      if (field.type === "worker") {
        const [email, name] = payload[field.name].split("||");
        payload[field.name] = email ?? "";
        const nameField = field.name.replace("_email", "_name");
        payload[nameField] = name ?? "";
      }
    });
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Could not save record." }));
    setNotice(result.message);
    if (response.ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  return (
    <AppShell title={config.title} eyebrow={notice}>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <section key={metric.label} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{metric.label}</p>
              <span className="rounded bg-gumleaf/10 p-2 text-gumleaf"><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{config.submitLabel}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{config.description}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-gumleaf" />
          </div>
          {canManage || module === "travel" || module === "checklists" ? (
            <form onSubmit={submit} className="grid gap-4">
              {config.fields.map((field) => <OperationField key={field.name} field={field} participants={participants} workers={workers} shifts={shifts} />)}
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
                <Bell className="h-4 w-4" />
                {config.submitLabel}
              </button>
            </form>
          ) : (
            <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Manager access is required to create records in this module.</p>
          )}
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Register</h2>
            <MapPinned className="h-5 w-5 text-gumleaf" />
          </div>
          {records.length ? (
            <div className="grid gap-3">
              {records.map((record, index) => (
                <article key={String(record.id ?? index)} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {config.columns.map((column) => (
                      <div key={column.label}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{column.label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{column.value(record) || "Not recorded"}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{config.emptyTitle}: {config.emptyMessage}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function OperationField({ field, participants, workers, shifts }: { field: FieldConfig; participants: OptionRow[]; workers: OptionRow[]; shifts: OptionRow[] }) {
  const required = field.required !== false;
  if (field.type === "textarea") {
    return (
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
        <textarea name={field.name} required={required} rows={4} placeholder={field.placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
      </label>
    );
  }
  if (field.type === "participant") {
    return <SelectField name={field.name} label={field.label} required={required} options={participants.map((item) => String(item.name ?? ""))} />;
  }
  if (field.type === "worker") {
    return <SelectField name={field.name} label={field.label} required={required} options={workers.map((item) => `${item.email ?? ""}||${item.name ?? ""}`)} renderLabel={(value) => value.split("||")[1] || value} />;
  }
  if (field.type === "shift") {
    return <SelectField name={field.name} label={field.label} required={required} options={["", ...shifts.map((item) => String(item.id ?? ""))]} renderLabel={(value) => value ? `${shifts.find((shift) => String(shift.id) === value)?.participant_name ?? "Shift"} | ${dateLabel(shifts.find((shift) => String(shift.id) === value)?.starts_at)}` : "Not linked"} />;
  }
  if (field.type === "select") {
    return <SelectField name={field.name} label={field.label} required={required} options={field.options ?? []} />;
  }
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
      <input name={field.name} type={field.type} required={required} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "0.1" : undefined} placeholder={field.placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function SelectField({ name, label, options, required, renderLabel }: { name: string; label: string; options: string[]; required: boolean; renderLabel?: (value: string) => string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required={required} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {!required ? <option value="">Not recorded</option> : null}
        {options.filter(Boolean).map((option) => (
          <option key={option} value={option}>{renderLabel ? renderLabel(option) : option}</option>
        ))}
      </select>
    </label>
  );
}

function dateLabel(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}
