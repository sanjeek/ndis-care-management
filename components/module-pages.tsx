"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarPlus, CheckCircle2, ClipboardPlus, Eye, EyeOff, FilePlus2, KeyRound, LockKeyhole, Plus, ShieldCheck, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { documents, incidents, metrics, participants as seedParticipants, todayShifts, workers as seedWorkers } from "@/lib/data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Shift = (typeof todayShifts)[number];

const statuses = ["Draft", "Offered", "Confirmed", "In progress", "Completed"];

export function DashboardPage() {
  return (
    <AppShell title="Dashboard" eyebrow="Sunday, 31 May 2026">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <ShiftTable shifts={todayShifts} />
        <QuickActions />
      </div>
    </AppShell>
  );
}

export function ParticipantsPage() {
  const [participants, setParticipants] = useState(seedParticipants);
  const [notice, setNotice] = useState("Add participant records here.");

  async function submit(form: FormData) {
    const next = {
      name: get(form, "name"),
      ndis: get(form, "ndis"),
      plan: get(form, "plan"),
      emergency: get(form, "emergency"),
      needs: get(form, "needs"),
      docs: 0,
      notes: 0
    };
    setParticipants([next, ...participants]);
    await persist("participants", { name: next.name, ndis_number: next.ndis, plan_type: next.plan, emergency_contact: next.emergency, support_needs: next.needs }, setNotice);
  }

  return (
    <AppShell title="Participants" eyebrow={notice}>
      <RecordForm submitLabel="Add participant" onSubmit={submit}>
        <Field name="name" label="Participant profile" defaultValue="Ruby Wilson" />
        <Field name="ndis" label="NDIS number" defaultValue="721 003 445" />
        <Field name="plan" label="Plan type" defaultValue="Plan managed" />
        <Field name="emergency" label="Emergency contact" defaultValue="Jordan Wilson, 0410 332 118" />
        <Area name="needs" label="Support needs" defaultValue="Community access, domestic assistance, transport to appointments" />
      </RecordForm>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {participants.map((participant) => (
          <article key={`${participant.ndis}-${participant.name}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{participant.name}</h2>
                <p className="text-sm text-slate-500">NDIS {participant.ndis}</p>
              </div>
              <span className="rounded bg-harbour/10 px-2 py-1 text-xs font-semibold text-harbour">{participant.plan}</span>
            </div>
            <Info label="Emergency contact" value={participant.emergency} />
            <Info label="Support needs" value={participant.needs} />
            <Info label="Documents / Notes" value={`${participant.docs} documents, ${participant.notes} progress notes`} />
          </article>
        ))}
      </div>
    </AppShell>
  );
}

export function WorkersPage() {
  const [workers, setWorkers] = useState(seedWorkers);
  const [notice, setNotice] = useState("Manage staff availability and compliance.");
  const [inviteLink, setInviteLink] = useState("/worker-portal/create-login?invite=demo-invite");

  async function submit(form: FormData) {
    const token = crypto.randomUUID();
    const next = {
      name: get(form, "name"),
      email: get(form, "email"),
      role: get(form, "role"),
      availability: get(form, "availability"),
      qualifications: get(form, "qualifications"),
      compliance: get(form, "compliance"),
      assigned: 0
    };
    setWorkers([next, ...workers]);
    setInviteLink(`/worker-portal/create-login?invite=${token}`);
    await persist("support_workers", next, setNotice);
    await persist(
      "worker_invitations",
      {
        worker_name: next.name,
        worker_email: next.email,
        invite_token: token,
        portal_url: `/worker-portal/create-login?invite=${token}`,
        status: "sent"
      },
      setNotice
    );
    const invite = await fetch("/api/invite-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: next.email, name: next.name, token })
    }).then((response) => response.json());
    setNotice(invite.message ?? "Worker invite created.");
  }

  return (
    <AppShell title="Support Workers" eyebrow={notice}>
      <div className="mb-6 rounded border border-gumleaf/25 bg-gumleaf/5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Invite workflow</h2>
            <p className="mt-1 text-sm text-slate-600">
              Adding a worker creates an invitation record and sends them to a portal page where they create login details.
            </p>
          </div>
          <Link href={inviteLink} className="inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <KeyRound className="h-4 w-4" />
            Open invite link
          </Link>
        </div>
      </div>

      <RecordForm submitLabel="Add worker and send invite" onSubmit={submit}>
        <Field name="name" label="Staff profile" defaultValue="Harper Singh" />
        <Field name="email" label="Email invite address" type="email" defaultValue="harper.singh@example.com" />
        <Field name="role" label="Role" defaultValue="Disability Support Worker" />
        <Field name="availability" label="Availability" defaultValue="Mon to Fri" />
        <Area name="qualifications" label="Qualifications" defaultValue="Cert III Individual Support, First Aid, CPR, manual handling" />
        <Field name="compliance" label="Compliance documents" defaultValue="Clear" />
      </RecordForm>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {workers.map((worker) => (
          <article key={`${worker.name}-${worker.role}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">{worker.name}</h2>
            <p className="text-sm text-slate-500">{worker.role}</p>
            <Info label="Invite email" value={worker.email} />
            <Info label="Availability" value={worker.availability} />
            <Info label="Qualifications" value={worker.qualifications} />
            <Info label="Compliance" value={worker.compliance} />
            <Info label="Assigned shifts" value={`${worker.assigned} this fortnight`} />
          </article>
        ))}
      </div>
    </AppShell>
  );
}

export function WorkerPortalPage() {
  return (
    <AppShell title="Worker Portal" eyebrow="Shift details, participant information, progress notes, and incidents.">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">My assigned shifts</h2>
                <p className="mt-1 text-sm text-slate-500">Workers see date, time, client, location, and shift status.</p>
              </div>
              <Link href="/worker-portal/create-login" className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Create login
              </Link>
            </div>
            <div className="mt-4">
              <ShiftTable shifts={todayShifts.filter((shift) => shift.worker !== "Unfilled")} />
            </div>
          </section>

          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Client information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {seedParticipants.slice(0, 2).map((participant) => (
                <article key={participant.ndis} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-ink">{participant.name}</p>
                  <Info label="NDIS" value={participant.ndis} />
                  <Info label="Support needs" value={participant.needs} />
                  <Info label="Emergency contact" value={participant.emergency} />
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <WorkerProgressNoteForm />
          <WorkerIncidentForm />
          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Important worker reminders</h2>
            <div className="mt-4 grid gap-3">
              {["Complete progress notes before shift end", "Call coordinator for medication or behaviour changes", "Submit incidents immediately for review"].map((item) => (
                <div key={item} className="flex gap-3 rounded border border-slate-200 p-3 text-sm text-slate-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-gumleaf" />
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export function WorkerCreateLoginPage() {
  const [notice, setNotice] = useState("Create login details from your invite email.");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(form: FormData) {
    if (!isSupabaseConfigured || !supabase) {
      setNotice("Demo login created on screen. Add Supabase keys to create a real auth user.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: get(form, "email"),
      password: get(form, "password"),
      options: {
        data: {
          full_name: get(form, "name"),
          role: "support_worker",
          invite_token: get(form, "invite")
        }
      }
    });
    setNotice(error ? error.message : "Login created. Check your email confirmation settings.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-gumleaf">CareOS worker invite</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create login details</h1>
        <p className="mt-3 text-sm text-slate-600">{notice}</p>
        <RecordForm submitLabel="Create worker login" onSubmit={submit}>
          <Field name="invite" label="Invite code" defaultValue="demo-invite" />
          <Field name="name" label="Full name" defaultValue="Asha Patel" />
          <Field name="email" label="Email address" type="email" defaultValue="asha.patel@example.com" />
          <PasswordField name="password" label="Password" defaultValue="CareOS-demo-123" show={showPassword} setShow={setShowPassword} />
        </RecordForm>
        <Link href="/worker-portal" className="mt-5 inline-flex font-semibold text-gumleaf hover:text-ink">
          Open worker portal
        </Link>
      </div>
    </main>
  );
}

export function RosteringPage() {
  const [shifts, setShifts] = useState(todayShifts);
  const [notice, setNotice] = useState("Create and assign shifts.");

  async function submit(form: FormData) {
    const start = get(form, "start");
    const end = get(form, "end");
    const next = {
      participant: shortName(get(form, "participant")),
      worker: get(form, "worker"),
      location: get(form, "location"),
      status: get(form, "status"),
      time: `${timeOnly(start)} - ${timeOnly(end)}`
    };
    setShifts([next, ...shifts]);
    await persist("shifts", { participant_name: get(form, "participant"), support_worker_name: next.worker, location: next.location, starts_at: start, ends_at: end, status: next.status }, setNotice);
  }

  return (
    <AppShell title="Rostering / Shifts" eyebrow={notice}>
      <RecordForm submitLabel="Save shift" onSubmit={submit}>
        <Select name="participant" label="Participant" options={seedParticipants.map((participant) => participant.name)} />
        <Select name="worker" label="Assign support worker" options={seedWorkers.map((worker) => worker.name)} />
        <Field name="location" label="Location" defaultValue="Parramatta NSW" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="start" label="Start time" type="datetime-local" defaultValue="2026-05-31T07:00" />
          <Field name="end" label="End time" type="datetime-local" defaultValue="2026-05-31T11:00" />
        </div>
        <Select name="status" label="Shift status" options={statuses} />
      </RecordForm>
      <div className="mt-6">
        <ShiftTable shifts={shifts} />
      </div>
    </AppShell>
  );
}

export function SimpleModulePage({ kind }: { kind: "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings" }) {
  const [notice, setNotice] = useState("Ready.");
  const content = {
    timesheets: {
      title: "Timesheets",
      eyebrow: "Approve staff time and allowances.",
      items: ["11 pending approval", "3 kilometre claims", "2 overnight allowances flagged"]
    },
    notes: {
      title: "Progress Notes",
      eyebrow: "Record goals, outcomes, and daily support details.",
      items: ["42 notes this week", "8 require coordinator review", "31 linked to participant goals"]
    },
    incidents: {
      title: "Incident Reports",
      eyebrow: "Track incidents, review actions, and manager sign-off.",
      items: incidents.map((incident) => `${incident.priority}: ${incident.title} for ${incident.participant}`)
    },
    invoices: {
      title: "Invoices",
      eyebrow: "Prepare NDIS and plan manager billing.",
      items: ["$84,260 ready to export", "19 missing plan manager details", "Support catalogue mapping active"]
    },
    documents: {
      title: "Documents",
      eyebrow: "Store service agreements, care plans, and compliance evidence.",
      items: documents.map((doc) => `${doc.count} ${doc.name}`)
    },
    settings: {
      title: "Settings",
      eyebrow: "Configure provider operations.",
      items: ["Organisation branches and ABN", "NDIS catalogue and line items", "Supabase authentication and staff roles"]
    }
  }[kind];
  const [items, setItems] = useState(content.items);

  async function submit(form: FormData) {
    const title = get(form, "title");
    const details = get(form, "details");
    const display = details ? `${title}: ${details}` : title;
    setItems([display, ...items]);
    await persist(
      moduleRecordTable(),
      {
        module: kind,
        title,
        details,
        status: kind === "incidents" ? "submitted" : "active"
      },
      setNotice
    );
  }

  return (
    <AppShell title={content.title} eyebrow={`${content.eyebrow} ${notice}`}>
      <RecordForm submitLabel={submitLabelForKind(kind)} onSubmit={submit}>
        <Field name="title" label={titleLabelForKind(kind)} defaultValue={defaultTitleForKind(kind)} />
        <Area name="details" label="Details" defaultValue={defaultDetailsForKind(kind)} />
      </RecordForm>
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <ClipboardPlus className="h-5 w-5 text-gumleaf" />
            <p className="mt-4 font-medium text-ink">{item}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

function WorkerProgressNoteForm() {
  const [notes, setNotes] = useState(["Noah achieved community access goal with verbal prompting."]);
  const [notice, setNotice] = useState("Add an important progress note.");

  async function submit(form: FormData) {
    const note = get(form, "note");
    setNotes([note, ...notes]);
    await persist(
      "progress_notes",
      {
        participant_name: get(form, "participant"),
        worker_name: get(form, "worker"),
        note,
        is_important: get(form, "important") === "Important"
      },
      setNotice
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Progress note</h2>
      <RecordForm submitLabel="Add progress note" onSubmit={submit}>
        <Select name="participant" label="Client" options={seedParticipants.map((participant) => participant.name)} />
        <Select name="worker" label="Worker" options={seedWorkers.map((worker) => worker.name)} />
        <Select name="important" label="Priority" options={["Important", "Standard"]} />
        <Area name="note" label="Progress note details" defaultValue="Client completed personal care routine and attended community activity." />
      </RecordForm>
      <p className="mt-3 text-sm text-slate-500">{notice}</p>
      <div className="mt-3 grid gap-2">
        {notes.map((note) => (
          <p key={note} className="rounded bg-gumleaf/5 p-3 text-sm text-slate-700">{note}</p>
        ))}
      </div>
    </section>
  );
}

function WorkerIncidentForm() {
  const [reports, setReports] = useState(["Medication variance ready for coordinator review."]);
  const [notice, setNotice] = useState("Submit incidents for immediate review.");

  async function submit(form: FormData) {
    const summary = get(form, "summary");
    setReports([summary, ...reports]);
    await persist(
      "incident_reports",
      {
        participant_name: get(form, "participant"),
        worker_name: get(form, "worker"),
        priority: get(form, "priority"),
        summary
      },
      setNotice
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Incident report</h2>
      <RecordForm submitLabel="Submit incident" onSubmit={submit}>
        <Select name="participant" label="Client" options={seedParticipants.map((participant) => participant.name)} />
        <Select name="worker" label="Worker" options={seedWorkers.map((worker) => worker.name)} />
        <Select name="priority" label="Priority" options={["High", "Medium", "Low"]} />
        <Area name="summary" label="Incident details" defaultValue="Describe what happened, actions taken, witnesses, and follow-up required." />
      </RecordForm>
      <p className="mt-3 text-sm text-slate-500">{notice}</p>
      <div className="mt-3 grid gap-2">
        {reports.map((report) => (
          <p key={report} className="rounded bg-coral/5 p-3 text-sm text-slate-700">{report}</p>
        ))}
      </div>
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: "New progress note", icon: FilePlus2, href: "/progress-notes" },
    { label: "Log incident report", icon: AlertTriangle, href: "/incident-reports" },
    { label: "Approve timesheet", icon: CheckCircle2, href: "/timesheets" },
    { label: "Upload document", icon: Upload, href: "/documents" }
  ];
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Quick actions</h2>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="flex items-center justify-between rounded border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:border-gumleaf/40 hover:bg-gumleaf/5">
            <span className="flex items-center gap-3">
              <action.icon className="h-4 w-4 text-gumleaf" />
              {action.label}
            </span>
            <Plus className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShiftTable({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-ink">Today&apos;s shifts</h2>
        <CalendarPlus className="h-5 w-5 text-gumleaf" />
      </div>
      <div className="overflow-x-auto scrollbar-subtle">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Support worker</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((shift, index) => (
              <tr key={`${shift.time}-${index}`}>
                <td className="px-4 py-4 font-medium text-ink">{shift.time}</td>
                <td className="px-4 py-4 text-slate-700">{shift.participant}</td>
                <td className="px-4 py-4 text-slate-700">{shift.worker}</td>
                <td className="px-4 py-4 text-slate-700">{shift.location}</td>
                <td className="px-4 py-4"><span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecordForm({ children, submitLabel, onSubmit }: { children: React.ReactNode; submitLabel: string; onSubmit: (form: FormData) => Promise<void> }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(new FormData(event.currentTarget));
    event.currentTarget.reset();
  }
  return (
    <form onSubmit={handleSubmit} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">{children}</div>
      <button className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
        <Plus className="h-4 w-4" />
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function PasswordField({
  name,
  label,
  defaultValue,
  show,
  setShow
}: {
  name: string;
  label: string;
  defaultValue: string;
  show: boolean;
  setShow: (show: boolean) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
        <LockKeyhole className="h-5 w-5 text-slate-400" />
        <input name={name} type={show ? "text" : "password"} required minLength={6} defaultValue={defaultValue} className="w-full border-0 bg-transparent text-sm text-ink outline-none" />
        <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

function Area({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required rows={3} defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function moduleRecordTable() {
  return "module_records";
}

function submitLabelForKind(kind: "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings") {
  return {
    timesheets: "Add timesheet item",
    notes: "Add progress note",
    incidents: "Submit incident",
    invoices: "Add invoice item",
    documents: "Add document record",
    settings: "Save setting"
  }[kind];
}

function titleLabelForKind(kind: "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings") {
  return {
    timesheets: "Timesheet item",
    notes: "Progress note title",
    incidents: "Incident title",
    invoices: "Invoice title",
    documents: "Document title",
    settings: "Setting name"
  }[kind];
}

function defaultTitleForKind(kind: "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings") {
  return {
    timesheets: "Kilometre claim review",
    notes: "Community access progress",
    incidents: "Medication variance",
    invoices: "Plan manager invoice",
    documents: "Updated service agreement",
    settings: "Branch billing default"
  }[kind];
}

function defaultDetailsForKind(kind: "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings") {
  return {
    timesheets: "Review worker shift time, break, allowance, and travel claim.",
    notes: "Participant achieved agreed support goal with prompting and supervision.",
    incidents: "Describe incident, immediate action, people notified, and follow-up required.",
    invoices: "Prepare NDIS line items for plan manager review.",
    documents: "Attach or record document details for coordinator follow-up.",
    settings: "Update organisation setting for operations team review."
  }[kind];
}

async function persist(table: string, payload: Record<string, unknown>, setNotice: (message: string) => void) {
  if (!isSupabaseConfigured || !supabase) {
    setNotice("Saved on screen. Add Supabase keys to save to the database.");
    return;
  }
  const { error } = await supabase.from(table).insert(payload);
  setNotice(error ? `Saved on screen. Supabase needs checking: ${error.message}` : `Saved to ${table}.`);
}

function get(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function timeOnly(value: string) {
  return value.split("T")[1] || value;
}

function shortName(name: string) {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}
