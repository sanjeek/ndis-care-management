"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardPlus,
  FilePlus2,
  Menu,
  Plus,
  Search,
  Upload,
  X
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import {
  documents,
  incidents,
  metrics as baseMetrics,
  navItems,
  participants as initialParticipants,
  todayShifts as initialShifts,
  workers as initialWorkers
} from "@/lib/data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Participant = (typeof initialParticipants)[number];
type Worker = (typeof initialWorkers)[number];
type Shift = (typeof initialShifts)[number];
type ModalKind = "participant" | "worker" | "shift" | "note" | "incident" | "timesheet" | "document" | null;

const rosterStatuses = ["Draft", "Offered", "Confirmed", "In progress", "Completed"];

const emptyShift = {
  participant: "",
  worker: "",
  location: "",
  start: "",
  end: "",
  status: "Draft"
};

export function CareApp() {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [modal, setModal] = useState<ModalKind>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("Ready. New records update this workspace immediately.");

  const metrics = useMemo(
    () =>
      baseMetrics.map((metric) => {
        if (metric.label === "Today's shifts") return { ...metric, value: String(shifts.length) };
        if (metric.label === "Active participants") return { ...metric, value: String(participants.length) };
        if (metric.label === "Staff on duty") return { ...metric, value: String(workers.length) };
        return metric;
      }),
    [participants.length, shifts.length, workers.length]
  );

  const filteredParticipants = participants.filter((participant) =>
    [participant.name, participant.ndis, participant.plan, participant.needs].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const filteredWorkers = workers.filter((worker) =>
    [worker.name, worker.role, worker.availability, worker.qualifications].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  async function persist(table: string, payload: Record<string, unknown>) {
    if (!isSupabaseConfigured || !supabase) {
      setNotice("Saved on screen. Add Supabase keys and run the schema to save to the database.");
      return;
    }

    const { error } = await supabase.from(table).insert(payload);
    setNotice(error ? `Saved on screen. Supabase insert needs checking: ${error.message}` : `Saved to ${table}.`);
  }

  async function addParticipant(form: FormData) {
    const next: Participant = {
      name: value(form, "name"),
      ndis: value(form, "ndis"),
      plan: value(form, "plan"),
      emergency: value(form, "emergency"),
      needs: value(form, "needs"),
      docs: 0,
      notes: 0
    };
    setParticipants((current) => [next, ...current]);
    setModal(null);
    await persist("participants", {
      name: next.name,
      ndis_number: next.ndis,
      plan_type: next.plan,
      emergency_contact: next.emergency,
      support_needs: next.needs
    });
  }

  async function addWorker(form: FormData) {
    const next: Worker = {
      name: value(form, "name"),
      email: value(form, "email") || `${value(form, "name").toLowerCase().replaceAll(" ", ".")}@example.com`,
      role: value(form, "role"),
      availability: value(form, "availability"),
      qualifications: value(form, "qualifications"),
      compliance: value(form, "compliance"),
      assigned: 0
    };
    setWorkers((current) => [next, ...current]);
    setModal(null);
    await persist("support_workers", {
      name: next.name,
      role: next.role,
      availability: next.availability,
      qualifications: next.qualifications,
      compliance_status: next.compliance
    });
  }

  async function addShift(form: FormData) {
    const start = value(form, "start");
    const end = value(form, "end");
    const participantName = value(form, "participant");
    const workerName = value(form, "worker");
    const worker = workers.find((item) => item.name === workerName);
    const next: Shift = {
      participant: shortName(participantName),
      participantName,
      worker: workerName,
      workerEmail: worker?.email ?? "",
      location: value(form, "location"),
      status: value(form, "status"),
      time: `${timeOnly(start)} - ${timeOnly(end)}`
    };
    setShifts((current) => [next, ...current]);
    setModal(null);
    await persist("shifts", {
      participant_name: participantName,
      support_worker_name: next.worker,
      location: next.location,
      starts_at: start,
      ends_at: end,
      status: next.status
    });
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col bg-slate-50 lg:flex-row">
      <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-4">
          <a href="#dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-ink text-sm font-bold text-gumleaf">CO</span>
            <span>
              <span className="block text-base font-semibold text-ink">CareOS</span>
              <span className="block text-xs text-slate-500">NDIS operations</span>
            </span>
          </a>
          <button className="rounded border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open navigation" onClick={() => setNavOpen(!navOpen)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className={`${navOpen ? "grid" : "hidden"} mt-5 gap-1 lg:grid`}>
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="sticky top-[65px] z-10 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur lg:top-0 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-medium text-gumleaf">Sunday, 31 May 2026</p>
              <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Provider operations dashboard</h2>
              <p className="mt-1 text-sm text-slate-500">{notice}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-72">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search participants, staff, shifts"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button className="inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => setModal("shift")}>
                <Plus className="h-4 w-4" />
                Quick add shift
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-8 px-4 py-6 lg:px-8">
          <section id="dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <TodayShifts shifts={shifts} onCreate={() => setModal("shift")} />
            <QuickActions setModal={setModal} />
          </section>

          <section id="participants">
            <SectionHeader title="Participants" action="Add participant" onAction={() => setModal("participant")} />
            <div className="grid gap-4 lg:grid-cols-3">
              {filteredParticipants.map((participant) => (
                <ParticipantCard key={`${participant.ndis}-${participant.name}`} participant={participant} />
              ))}
            </div>
          </section>

          <section id="workers">
            <SectionHeader title="Support Workers" action="Add worker" onAction={() => setModal("worker")} />
            <div className="grid gap-4 xl:grid-cols-3">
              {filteredWorkers.map((worker) => (
                <WorkerCard key={`${worker.name}-${worker.role}`} worker={worker} />
              ))}
            </div>
          </section>

          <Rostering shifts={shifts} participants={participants} workers={workers} addShift={addShift} />

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel id="timesheets" title="Timesheets" items={[]} />
            <Panel id="notes" title="Progress Notes" items={[]} />
            <IncidentReports />
            <Panel
              id="invoices"
              title="Invoices"
              items={[]}
            />
          </section>

          <section id="documents" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {documents.map((doc) => (
              <article key={doc.name} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                <doc.icon className="h-5 w-5 text-gumleaf" />
                <p className="mt-4 text-2xl font-semibold text-ink">{doc.count}</p>
                <p className="text-sm text-slate-500">{doc.name}</p>
              </article>
            ))}
          </section>

          <section id="settings" className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-ink">Settings</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Setting title="Organisation" value="Branches, ABN, billing defaults" />
              <Setting title="NDIS catalogue" value="Price limits and support item mapping" />
              <Setting title="Security" value="Supabase authentication and staff roles" />
            </div>
          </section>
        </div>
      </div>

      {modal === "participant" && (
        <RecordModal title="Add participant" submitLabel="Save participant" onClose={() => setModal(null)} onSubmit={addParticipant}>
          <TextField name="name" label="Participant name" defaultValue="" />
          <TextField name="ndis" label="NDIS number" defaultValue="" />
          <TextField name="plan" label="Plan type" defaultValue="" />
          <TextField name="emergency" label="Emergency contact" defaultValue="" />
          <TextArea name="needs" label="Support needs" defaultValue="" />
        </RecordModal>
      )}

      {modal === "worker" && (
        <RecordModal title="Add support worker" submitLabel="Save worker" onClose={() => setModal(null)} onSubmit={addWorker}>
          <TextField name="name" label="Staff name" defaultValue="" />
          <TextField name="role" label="Role" defaultValue="" />
          <TextField name="availability" label="Availability" defaultValue="" />
          <TextArea name="qualifications" label="Qualifications" defaultValue="" />
          <TextField name="compliance" label="Compliance status" defaultValue="" />
        </RecordModal>
      )}

      {modal === "shift" && (
        <RecordModal title="Create shift" submitLabel="Save shift" onClose={() => setModal(null)} onSubmit={addShift}>
          <SelectField name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={emptyShift.participant} />
          <SelectField name="worker" label="Assign support worker" options={workers.map((worker) => worker.name)} defaultValue={emptyShift.worker} />
          <TextField name="location" label="Location" defaultValue={emptyShift.location} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="start" label="Start time" type="datetime-local" defaultValue={emptyShift.start} />
            <TextField name="end" label="End time" type="datetime-local" defaultValue={emptyShift.end} />
          </div>
          <SelectField name="status" label="Shift status" options={rosterStatuses} defaultValue={emptyShift.status} />
        </RecordModal>
      )}

      {modal && !["participant", "worker", "shift"].includes(modal) && (
        <RecordModal
          title="Quick action"
          submitLabel="Save item"
          onClose={() => setModal(null)}
          onSubmit={async () => {
            setNotice("Quick action saved on screen. Connect its table in Supabase when ready.");
            setModal(null);
          }}
        >
          <TextField name="title" label="Title" defaultValue="New care record" />
          <TextArea name="details" label="Details" defaultValue="Record details and follow-up notes." />
        </RecordModal>
      )}
    </section>
  );
}

function TodayShifts({ shifts, onCreate }: { shifts: Shift[]; onCreate: () => void }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-ink">Today&apos;s shifts</h3>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <CalendarPlus className="h-4 w-4" />
          Create shift
        </button>
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
              <tr key={`${shift.time}-${shift.participant}-${index}`} className="align-top">
                <td className="px-4 py-4 font-medium text-ink">{shift.time}</td>
                <td className="px-4 py-4 text-slate-700">{shift.participant}</td>
                <td className="px-4 py-4 text-slate-700">{shift.worker}</td>
                <td className="px-4 py-4 text-slate-700">{shift.location}</td>
                <td className="px-4 py-4">
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuickActions({ setModal }: { setModal: (kind: ModalKind) => void }) {
  const actions = [
    { label: "New progress note", icon: FilePlus2, modal: "note" as const },
    { label: "Log incident report", icon: AlertTriangle, modal: "incident" as const },
    { label: "Approve timesheet", icon: CheckCircle2, modal: "timesheet" as const },
    { label: "Upload document", icon: Upload, modal: "document" as const }
  ];

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-ink">Quick actions</h3>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => setModal(action.modal)}
            className="flex items-center justify-between rounded border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:border-gumleaf/40 hover:bg-gumleaf/5"
          >
            <span className="flex items-center gap-3">
              <action.icon className="h-4 w-4 text-gumleaf" />
              {action.label}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Rostering({
  shifts,
  participants,
  workers,
  addShift
}: {
  shifts: Shift[];
  participants: Participant[];
  workers: Worker[];
  addShift: (form: FormData) => Promise<void>;
}) {
  return (
    <section id="rostering" className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <form
        className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void addShift(new FormData(event.currentTarget));
          event.currentTarget.reset();
        }}
      >
        <h3 className="font-semibold text-ink">Create shift</h3>
        <div className="mt-4 grid gap-4">
          <SelectField name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={emptyShift.participant} />
          <SelectField name="worker" label="Assign support worker" options={workers.map((worker) => worker.name)} defaultValue={emptyShift.worker} />
          <TextField name="location" label="Location" defaultValue={emptyShift.location} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="start" label="Start time" type="datetime-local" defaultValue={emptyShift.start} />
            <TextField name="end" label="End time" type="datetime-local" defaultValue={emptyShift.end} />
          </div>
          <SelectField name="status" label="Shift status" options={rosterStatuses} defaultValue={emptyShift.status} />
          <button className="inline-flex items-center justify-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">
            <CalendarPlus className="h-4 w-4" />
            Save shift
          </button>
        </div>
      </form>

      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-ink">Rostering board</h3>
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
          {["Morning", "Afternoon", "Evening"].map((period, index) => (
            <div key={period} className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-700">{period}</p>
              <div className="mt-3 rounded bg-white p-3 text-sm shadow-sm">
                <p className="font-medium text-ink">{shifts[index]?.participant ?? "Unfilled"}</p>
                <p className="mt-1 text-slate-500">{shifts[index]?.time ?? "No shift"}</p>
                <p className="mt-2 text-slate-700">{shifts[index]?.worker ?? "Assign worker"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{participant.name}</h3>
          <p className="text-sm text-slate-500">NDIS {participant.ndis}</p>
        </div>
        <span className="rounded bg-harbour/10 px-2 py-1 text-xs font-semibold text-harbour">{participant.plan}</span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Emergency contact" value={participant.emergency} />
        <Row label="Support needs" value={participant.needs} />
        <Row label="Documents" value={`${participant.docs} files`} />
        <Row label="Progress notes" value={`${participant.notes} notes`} />
      </dl>
    </article>
  );
}

function WorkerCard({ worker }: { worker: Worker }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded bg-banksia/15 font-semibold text-banksia">
          {worker.name.split(" ").map((part) => part[0]).join("")}
        </span>
        <div>
          <h3 className="font-semibold text-ink">{worker.name}</h3>
          <p className="text-sm text-slate-500">{worker.role}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Availability" value={worker.availability} />
        <Row label="Qualifications" value={worker.qualifications} />
        <Row label="Compliance" value={worker.compliance} />
        <Row label="Assigned shifts" value={`${worker.assigned} this fortnight`} />
      </dl>
    </article>
  );
}

function IncidentReports() {
  return (
    <div id="incidents" className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-ink">Incident Reports</h3>
      <div className="mt-4 space-y-3">
        {incidents.map((incident) => (
          <div key={incident.title} className="rounded border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{incident.title}</p>
                <p className="mt-1 text-sm text-slate-500">{incident.participant}</p>
              </div>
              <span className="rounded bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">{incident.priority}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{incident.due}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <button onClick={onAction} className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        <Plus className="h-4 w-4" />
        {action}
      </button>
    </div>
  );
}

function RecordModal({
  title,
  submitLabel,
  children,
  onClose,
  onSubmit
}: {
  title: string;
  submitLabel: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(new FormData(event.currentTarget));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 p-0 sm:items-center sm:justify-center sm:p-6">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full overflow-y-auto rounded-t bg-white p-5 shadow-panel sm:max-w-xl sm:rounded">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 py-4">{children}</div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button className="rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-2 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

function TextField({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
      />
    </label>
  );
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        required
        rows={3}
        defaultValue={defaultValue}
        className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
      />
    </label>
  );
}

function SelectField({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        required
        defaultValue={defaultValue}
        className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

function Panel({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <div id={id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <ClipboardPlus className="h-4 w-4 text-gumleaf" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Setting({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function timeOnly(value: string) {
  return value.split("T")[1] || value;
}

function shortName(name: string) {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}
