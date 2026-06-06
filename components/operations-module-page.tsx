"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Car, ClipboardList, GraduationCap, MapPinned, Phone, Route, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ModuleKey = "travel" | "emergency-contacts" | "visitors" | "vehicles" | "training-records" | "checklists";
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
  "emergency-contacts": {
    title: "Emergency Contacts",
    eyebrow: "Maintain participant emergency contacts with consent, priority, and relationship details.",
    description: "Admin can manage contact details. Support workers can view emergency contacts only for participants assigned to their shifts.",
    icon: Phone,
    endpoint: "/api/operations/emergency-contacts",
    submitLabel: "Save emergency contact",
    emptyTitle: "No emergency contacts",
    emptyMessage: "Emergency contacts will appear after admin adds participant contact details.",
    fields: [
      { name: "participant_name", label: "Participant", type: "participant" },
      { name: "contact_name", label: "Contact name", type: "text", placeholder: "Full name" },
      { name: "relationship", label: "Relationship", type: "select", options: ["Parent", "Guardian", "Partner", "Sibling", "Support coordinator", "Plan nominee", "Other"] },
      { name: "phone", label: "Phone", type: "text", placeholder: "Mobile or landline" },
      { name: "email", label: "Email", type: "text", required: false },
      { name: "priority", label: "Priority", type: "select", options: ["primary", "secondary", "other"] },
      { name: "consent_status", label: "Consent to contact", type: "select", options: ["consent_to_contact", "do_not_contact"] },
      { name: "notes", label: "Notes", type: "textarea", required: false },
      { name: "status", label: "Status", type: "select", options: ["active", "inactive"] }
    ],
    summary: [
      { label: "Contacts", value: (records) => String(records.length) },
      { label: "Primary", value: (records) => String(records.filter((row) => String(row.priority ?? "") === "primary").length) },
      { label: "Consent", value: (records) => String(records.filter((row) => Boolean(row.consent_to_contact)).length) }
    ],
    columns: [
      { label: "Participant", value: (row) => String(row.participant_name ?? "") },
      { label: "Contact", value: (row) => String(row.contact_name ?? "") },
      { label: "Relationship", value: (row) => String(row.relationship ?? "") },
      { label: "Phone", value: (row) => String(row.phone ?? "") },
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
  "training-records": {
    title: "Training Records",
    eyebrow: "Track worker training, mandatory certificates, expiry dates, and evidence references.",
    description: "Support workers can submit their own training evidence. Admin can manage all worker training and expiry alerts.",
    icon: GraduationCap,
    endpoint: "/api/operations/training-records",
    submitLabel: "Save training record",
    emptyTitle: "No training records",
    emptyMessage: "Training and certificate records will appear after they are saved.",
    fields: [
      { name: "worker_email", label: "Support worker", type: "worker" },
      { name: "training_name", label: "Training / certificate", type: "text", placeholder: "Medication assistance, CPR, manual handling" },
      { name: "provider", label: "Training provider", type: "text", required: false },
      { name: "completion_date", label: "Completion date", type: "date", required: false },
      { name: "expiry_date", label: "Expiry date", type: "date", required: false },
      { name: "certificate_reference", label: "Certificate reference", type: "text", required: false },
      { name: "evidence_location", label: "Evidence location", type: "text", required: false },
      { name: "mandatory_status", label: "Requirement", type: "select", options: ["required", "optional"] },
      { name: "status", label: "Status", type: "select", options: ["current", "expiring", "expired", "planned"] },
      { name: "notes", label: "Notes", type: "textarea", required: false }
    ],
    summary: [
      { label: "Records", value: (records) => String(records.length) },
      { label: "Mandatory", value: (records) => String(records.filter((row) => Boolean(row.mandatory)).length) },
      { label: "Due soon", value: (records) => String(records.filter((row) => isDueSoon(row.expiry_date)).length) }
    ],
    columns: [
      { label: "Worker", value: (row) => String(row.worker_name ?? row.worker_email ?? "") },
      { label: "Training", value: (row) => String(row.training_name ?? "") },
      { label: "Expiry", value: (row) => dateLabel(row.expiry_date) },
      { label: "Status", value: (row) => String(row.status ?? "") }
    ]
  },
  checklists: {
    title: "Participant Checklists",
    eyebrow: "Assign participant-specific tasks, routines, and required completion checks.",
    description: "Create NDIS support checklists with categories, priorities, evidence, risk controls, and worker completion tracking.",
    icon: ClipboardList,
    endpoint: "/api/operations/checklists",
    submitLabel: "Create checklist",
    emptyTitle: "No checklists",
    emptyMessage: "Participant checklists will appear after they are created.",
    fields: [
      { name: "participant_name", label: "Participant", type: "participant" },
      { name: "assigned_worker_email", label: "Assigned support worker", type: "worker", required: false },
      { name: "checklist_title", label: "Checklist title", type: "text" },
      { name: "checklist_category", label: "Checklist category", type: "select", options: ["Daily care routine", "Personal care", "Medication prompt", "Meal support", "Community access", "Transport", "Home safety", "Behaviour support", "Manual handling", "Appointment support", "Shift handover", "Goal activity", "Incident follow-up", "Custom"] },
      { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
      { name: "due_date", label: "Due date", type: "date", required: false },
      { name: "recurrence_pattern", label: "Recurrence", type: "select", options: ["once", "per_shift", "daily", "weekly", "fortnightly", "monthly"] },
      { name: "service_context", label: "Service context", type: "select", options: ["before_shift", "during_shift", "end_of_shift", "daily_routine", "community_access", "appointment", "sleepover", "plan_review"] },
      { name: "shift_id", label: "Linked shift", type: "shift", required: false },
      { name: "location_context", label: "Location or setting", type: "text", placeholder: "Participant home, community venue, appointment, vehicle", required: false },
      { name: "checklist_items", label: "Checklist items", type: "textarea", placeholder: "One item per line, for example:\nConfirm participant wellbeing\nComplete personal care routine\nRecord outcome in progress note" },
      { name: "pre_shift_checks", label: "Pre-shift checks", type: "textarea", placeholder: "Medication chart available, PPE ready, transport plan confirmed", required: false },
      { name: "support_instructions", label: "Support instructions", type: "textarea", placeholder: "Step-by-step support expectations, preferences, prompts, and communication needs" },
      { name: "risk_controls", label: "Risk controls", type: "textarea", placeholder: "Known risks, triggers, manual handling controls, escalation instructions", required: false },
      { name: "evidence_required", label: "Evidence required", type: "select", options: ["none", "progress_note", "photo", "signature", "case_note", "incident_follow_up"] },
      { name: "worker_signature_required", label: "Worker signature", type: "select", options: ["no", "yes"] },
      { name: "participant_signature_required", label: "Participant signature", type: "select", options: ["no", "yes"] },
      { name: "escalation_required", label: "Escalation required", type: "select", options: ["no", "yes"] },
      { name: "completion_status", label: "Status", type: "select", options: ["open", "in_progress", "completed", "cancelled"] },
      { name: "notes", label: "Notes", type: "textarea", required: false }
    ],
    summary: [
      { label: "Checklists", value: (records) => String(records.length) },
      { label: "Due / overdue", value: (records) => String(records.filter((row) => checklistDue(row)).length) },
      { label: "High priority", value: (records) => String(records.filter((row) => ["high", "critical"].includes(String(row.priority ?? "").toLowerCase()) && !["completed", "cancelled"].includes(String(row.completion_status ?? "").toLowerCase())).length) },
      { label: "Completed", value: (records) => String(records.filter((row) => String(row.completion_status ?? "") === "completed").length) }
    ],
    columns: [
      { label: "Checklist", value: (row) => String(row.checklist_title ?? "") },
      { label: "Category", value: (row) => friendlyChecklistText(row.checklist_category) },
      { label: "Participant", value: (row) => String(row.participant_name ?? "") },
      { label: "Worker", value: (row) => String(row.assigned_worker_name ?? row.assigned_worker_email ?? "") },
      { label: "Due", value: (row) => dateLabel(row.due_date) },
      { label: "Priority", value: (row) => friendlyChecklistText(row.priority) },
      { label: "Progress", value: (row) => `${checklistProgress(row)}%` },
      { label: "Status", value: (row) => friendlyChecklistText(row.completion_status) }
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
  const [currentUserEmail, setCurrentUserEmail] = useState("");
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
    const workerOptions = (result.workers ?? []).length
      ? result.workers
      : result.currentUser
        ? [{ name: result.currentUser.name, email: result.currentUser.email }]
        : [];
    setWorkers(workerOptions);
    setShifts(result.shifts ?? []);
    setCanManage(Boolean(result.canManage));
    setCurrentUserEmail(String(result.currentUser?.email ?? "").toLowerCase());
    setNotice((result.records ?? []).length ? `` : config.emptyMessage);
  }, [config]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
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

  async function updateChecklist(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before updating the checklist.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = {
      id,
      completion_status: String(form.get("completion_status") ?? ""),
      completion_percentage: String(form.get("completion_percentage") ?? ""),
      completed_items: String(form.get("completed_items") ?? ""),
      completion_notes: String(form.get("completion_notes") ?? ""),
      notes: String(form.get("notes") ?? "")
    };
    const response = await fetch(config.endpoint, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Could not update checklist." }));
    setNotice(result.message);
    if (response.ok) await refresh();
  }

  return (
    <AppShell title={config.title} eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          {canManage || module === "travel" || module === "training-records" || module === "checklists" ? (
            <form onSubmit={submit} className="grid gap-4">
              {config.fields.map((field) => <OperationField key={field.name} field={field} participants={participants} workers={workers} shifts={shifts} />)}
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">
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
                  {module === "checklists" ? (
                    <ChecklistRecordDetails
                      record={record}
                      canUpdate={canManage || String(record.assigned_worker_email ?? "").toLowerCase() === currentUserEmail}
                      onUpdate={updateChecklist}
                    />
                  ) : null}
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

function ChecklistRecordDetails({
  record,
  canUpdate,
  onUpdate
}: {
  record: Record<string, unknown>;
  canUpdate: boolean;
  onUpdate: (event: FormEvent<HTMLFormElement>, id: string) => Promise<void>;
}) {
  const id = String(record.id ?? "");
  const items = lines(record.checklist_items);
  const completedItems = lines(record.completed_items);
  const progress = checklistProgress(record);
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <ChecklistInfoBlock title="Service context" value={friendlyChecklistText(record.service_context)} />
        <ChecklistInfoBlock title="Recurrence" value={friendlyChecklistText(record.recurrence_pattern)} />
        <ChecklistInfoBlock title="Evidence" value={friendlyChecklistText(record.evidence_required)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Checklist items</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{items.length} item{items.length === 1 ? "" : "s"}</span>
          </div>
          {items.length ? (
            <ul className="mt-3 grid gap-2">
              {items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gumleaf" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No checklist items recorded.</p>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">NDIS support context</h3>
          <div className="mt-3 grid gap-3">
            <ChecklistText title="Pre-shift checks" value={record.pre_shift_checks} />
            <ChecklistText title="Support instructions" value={record.support_instructions} />
            <ChecklistText title="Risk controls" value={record.risk_controls} />
            <ChecklistText title="Location" value={record.location_context} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Completion tracking</h3>
            <p className="mt-1 text-xs text-slate-500">{completedItems.length ? `${completedItems.length} completed item${completedItems.length === 1 ? "" : "s"} recorded` : "No completed items recorded yet"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${progress >= 100 ? "bg-green-50 text-green-700" : progress > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{progress}% complete</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gumleaf" style={{ width: `${progress}%` }} />
        </div>

        {canUpdate && id ? (
          <form onSubmit={(event) => onUpdate(event, id)} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[180px_160px_1fr]">
              <label>
                <span className="field-label-required mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select name="completion_status" required defaultValue={String(record.completion_status ?? "open")} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label>
                <span className="field-label-required mb-2 block text-sm font-medium text-slate-700">Progress</span>
                <input name="completion_percentage" type="number" min="0" max="100" step="1" required defaultValue={String(progress)} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
              </label>
              <label>
                <span className="field-label-optional mb-2 block text-sm font-medium text-slate-700">Completion notes</span>
                <input name="completion_notes" defaultValue={String(record.completion_notes ?? "")} placeholder="Outcome, exception, or handover note" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
              </label>
            </div>
            <label>
              <span className="field-label-optional mb-2 block text-sm font-medium text-slate-700">Completed items</span>
              <textarea name="completed_items" rows={3} defaultValue={String(record.completed_items ?? "")} placeholder="One completed item per line" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
            </label>
            <label>
              <span className="field-label-optional mb-2 block text-sm font-medium text-slate-700">General notes</span>
              <textarea name="notes" rows={3} defaultValue={String(record.notes ?? "")} placeholder="Additional checklist notes" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
            </label>
            <button className="inline-flex min-h-11 w-fit items-center justify-center rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-2 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">Update checklist</button>
          </form>
        ) : (
          <p className="mt-4 rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Only the assigned support worker, admin, or team leader can update this checklist.</p>
        )}
      </div>
    </div>
  );
}

function ChecklistInfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value || "Not recorded"}</p>
    </div>
  );
}

function ChecklistText({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(value ?? "").trim() || "Not recorded"}</p>
    </div>
  );
}

function OperationField({ field, participants, workers, shifts }: { field: FieldConfig; participants: OptionRow[]; workers: OptionRow[]; shifts: OptionRow[] }) {
  const required = field.required !== false;
  if (field.type === "textarea") {
    return (
      <label>
        <span className={`${required ? "field-label-required" : "field-label-optional"} mb-2 block text-sm font-medium text-slate-700`}>{field.label}</span>
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
      <span className={`${required ? "field-label-required" : "field-label-optional"} mb-2 block text-sm font-medium text-slate-700`}>{field.label}</span>
      <input name={field.name} type={field.type} required={required} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "0.1" : undefined} placeholder={field.placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function SelectField({ name, label, options, required, renderLabel }: { name: string; label: string; options: string[]; required: boolean; renderLabel?: (value: string) => string }) {
  return (
    <label>
      <span className={`${required ? "field-label-required" : "field-label-optional"} mb-2 block text-sm font-medium text-slate-700`}>{label}</span>
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

function isDueSoon(value: unknown) {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 45;
}

function checklistDue(row: Record<string, unknown>) {
  const status = String(row.completion_status ?? "").toLowerCase();
  if (status === "completed" || status === "cancelled") return false;
  if (!row.due_date) return false;
  const date = new Date(String(row.due_date));
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date.getTime() <= today.getTime();
}

function checklistProgress(row: Record<string, unknown>) {
  const explicit = Number(row.completion_percentage ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(100, Math.max(0, Math.round(explicit)));
  if (String(row.completion_status ?? "").toLowerCase() === "completed") return 100;
  const total = lines(row.checklist_items).length;
  const completed = lines(row.completed_items).length;
  if (!total) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

function lines(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function friendlyChecklistText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Not recorded";
  return text
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
