"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardPlus, Pill, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ParticipantOption = { name: string };

type MedicationRecord = {
  id: string;
  participantName: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  administrationTime: string;
  administrationInstructions: string;
  prescribingDoctor: string;
  startDate: string;
  endDate: string;
  status: string;
};

type MedicationEvent = {
  id: string;
  medicationId: string;
  participantName: string;
  medicationName: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  dosageGiven: string;
  reason: string;
  actionsTaken: string;
  severity: string;
  recordedByName: string;
  recordedByEmail: string;
  createdAt: string;
};

const statuses = ["active", "paused", "ceased"];
const routes = ["Oral", "Topical", "Inhaled", "Eye drops", "Ear drops", "Injection", "Other"];
const eventTypes = ["administered", "missed", "incident"];
const severities = ["Low", "Medium", "High", "Critical"];

export function MedicationManagementPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [events, setEvents] = useState<MedicationEvent[]>([]);
  const [notice, setNotice] = useState("Loading medication records.");

  const canManageMedicationList = role === "admin" || role === "team_leader";
  const activeMedications = useMemo(() => medications.filter((medication) => medication.status !== "ceased"), [medications]);
  const missedOrIncidentEvents = useMemo(() => events.filter((event) => event.eventType !== "administered"), [events]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) return;

    let resolvedRole = roleForUser(user.user_metadata?.role, user.email);
    if (!user.user_metadata?.role) {
      const profile = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
      resolvedRole = roleForUser(profile.data?.role, user.email);
    }

    const participantQuery = supabase.from("participants").select("name").order("name", { ascending: true });
    const medicationQuery = supabase.from("medication_records").select("*").order("participant_name", { ascending: true }).order("medication_name", { ascending: true });
    const eventQuery = supabase.from("medication_events").select("*").order("created_at", { ascending: false }).limit(100);
    const [participantRows, medicationRows, eventRows] = await Promise.all([participantQuery, medicationQuery, eventQuery]);

    setRole(resolvedRole);
    setParticipants((participantRows.data ?? []).map((participant) => ({ name: String(participant.name ?? "") })).filter((participant) => participant.name));
    setMedications((medicationRows.data ?? []).map(mapMedication));
    setEvents((eventRows.data ?? []).map(mapMedicationEvent));
    setNotice(medicationRows.data?.length ? "Showing medication records from Supabase." : "No medication records yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitMedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await postMedication({
      action: "record",
      participant_name: String(form.get("participant")),
      medication_name: String(form.get("medicationName")),
      dosage: String(form.get("dosage")),
      route: String(form.get("route")),
      frequency: String(form.get("frequency")),
      administration_time: String(form.get("administrationTime")),
      administration_instructions: String(form.get("instructions")),
      prescribing_doctor: String(form.get("doctor")),
      start_date: String(form.get("startDate")),
      end_date: String(form.get("endDate")),
      status: String(form.get("status"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = medications.find((medication) => medication.id === String(form.get("medicationId")));
    const ok = await postMedication({
      action: "event",
      medication_id: selected?.id ?? "",
      participant_name: selected?.participantName || String(form.get("participant")),
      medication_name: selected?.medicationName || String(form.get("medicationName")),
      event_type: String(form.get("eventType")),
      event_date: String(form.get("eventDate")),
      event_time: String(form.get("eventTime")),
      dosage_given: String(form.get("dosageGiven")),
      reason: String(form.get("reason")),
      actions_taken: String(form.get("actionsTaken")),
      severity: String(form.get("severity"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function postMedication(payload: Record<string, string>) {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return false;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving medication records.");
      return false;
    }
    const response = await fetch("/api/medications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Medication record could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Medication Management" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Active medications" value={String(activeMedications.length)} icon={Pill} />
        <Metric title="Missed reports" value={String(events.filter((event) => event.eventType === "missed").length)} icon={AlertTriangle} />
        <Metric title="Medication incidents" value={String(events.filter((event) => event.eventType === "incident").length)} icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-6">
          {canManageMedicationList ? (
            <Panel title="Add medication" icon={ClipboardPlus}>
              <form onSubmit={submitMedication} className="grid gap-4">
                <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
                <Field name="medicationName" label="Medication name" placeholder="Medication name" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="dosage" label="Dosage" placeholder="e.g. 500mg" />
                  <Select name="route" label="Route" options={routes} />
                </div>
                <Field name="frequency" label="Frequency" placeholder="Daily, twice daily, PRN" />
                <Field name="administrationTime" label="Administration time" placeholder="8:00 AM, 6:00 PM, or as charted" />
                <Area name="instructions" label="Administration instructions" placeholder="Prompting, with food, observation, PRN instructions, escalation requirements." />
                <Field name="doctor" label="Prescribing doctor" placeholder="Doctor or clinic" required={false} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="startDate" label="Start date" type="date" required={false} />
                  <Field name="endDate" label="End date" type="date" required={false} />
                </div>
                <Select name="status" label="Status" options={statuses} />
                <button className="rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">Save medication</button>
              </form>
            </Panel>
          ) : (
            <Panel title="Medication access" icon={Pill}>
              <p className="text-sm leading-6 text-slate-600">
                Medication list editing is restricted to admin and team leader users. Support workers can record administration, missed medication, and incidents for assigned participants.
              </p>
            </Panel>
          )}

          <Panel title="Record administration or issue" icon={AlertTriangle}>
            <form onSubmit={submitEvent} className="grid gap-4">
              {medications.length ? (
                <Select name="medicationId" label="Medication" options={medications.map((medication) => `${medication.id}|${medication.participantName} - ${medication.medicationName} (${medication.dosage})`)} splitValue />
              ) : (
                <>
                  <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
                  <Field name="medicationName" label="Medication name" placeholder="Medication name" />
                </>
              )}
              <Select name="eventType" label="Event type" options={eventTypes} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="eventDate" label="Date" type="date" />
                <Field name="eventTime" label="Time" type="time" />
              </div>
              <Field name="dosageGiven" label="Dosage given" placeholder="Dose given or scheduled dose" required={false} />
              <Select name="severity" label="Severity" options={severities} />
              <Area name="reason" label="Reason / details" placeholder="For missed medication: why it was missed. For incidents: describe what happened." required={false} />
              <Area name="actionsTaken" label="Actions taken" placeholder="Who was notified, first aid, observation, escalation, medication chart update, or follow-up." required={false} />
              <button className="rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">Save medication event</button>
            </form>
          </Panel>
        </section>

        <section className="space-y-6">
          <Panel title="Medication list" icon={Pill}>
            {medications.length ? (
              <div className="grid gap-3">
                {medications.map((medication) => (
                  <article key={medication.id} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink">{medication.medicationName}</p>
                        <p className="mt-1 text-slate-600">{medication.participantName} | {medication.dosage} | {medication.frequency}</p>
                      </div>
                      <span className="w-fit rounded bg-harbour/10 px-2.5 py-1 text-xs font-semibold text-harbour">{medication.status}</span>
                    </div>
                    <Info label="Route / time" value={`${medication.route || "Route not recorded"} | ${medication.administrationTime || "Time not recorded"}`} />
                    <Info label="Instructions" value={medication.administrationInstructions || "Not recorded"} />
                    <Info label="Prescribing doctor" value={medication.prescribingDoctor || "Not recorded"} />
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No medication records" message="Medication records will appear here after admin or team leader users add them." />
            )}
          </Panel>

          <Panel title="Missed medication and incidents" icon={AlertTriangle}>
            {missedOrIncidentEvents.length ? (
              <div className="grid gap-3">
                {missedOrIncidentEvents.map((event) => (
                  <article key={event.id} className="rounded border border-slate-200 bg-white p-4 text-sm shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink">{event.medicationName}</p>
                        <p className="mt-1 text-slate-600">{event.participantName} | {event.eventDate} {event.eventTime}</p>
                      </div>
                      <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${event.eventType === "incident" ? "bg-coral/10 text-coral" : "bg-banksia/30 text-ink"}`}>{event.eventType}</span>
                    </div>
                    <Info label="Reason / details" value={event.reason || "Not recorded"} />
                    <Info label="Actions taken" value={event.actionsTaken || "Not recorded"} />
                    <Info label="Recorded by" value={event.recordedByName || event.recordedByEmail || "Not recorded"} />
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No missed medication or incidents" message="Missed medication and medication incident reports will appear here." />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function mapMedication(row: Record<string, unknown>): MedicationRecord {
  return {
    id: String(row.id ?? ""),
    participantName: String(row.participant_name ?? ""),
    medicationName: String(row.medication_name ?? ""),
    dosage: String(row.dosage ?? ""),
    route: String(row.route ?? ""),
    frequency: String(row.frequency ?? ""),
    administrationTime: String(row.administration_time ?? ""),
    administrationInstructions: String(row.administration_instructions ?? ""),
    prescribingDoctor: String(row.prescribing_doctor ?? ""),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    status: String(row.status ?? "active")
  };
}

function mapMedicationEvent(row: Record<string, unknown>): MedicationEvent {
  return {
    id: String(row.id ?? ""),
    medicationId: String(row.medication_id ?? ""),
    participantName: String(row.participant_name ?? ""),
    medicationName: String(row.medication_name ?? ""),
    eventType: String(row.event_type ?? ""),
    eventDate: String(row.event_date ?? ""),
    eventTime: String(row.event_time ?? ""),
    dosageGiven: String(row.dosage_given ?? ""),
    reason: String(row.reason ?? ""),
    actionsTaken: String(row.actions_taken ?? ""),
    severity: String(row.severity ?? ""),
    recordedByName: String(row.recorded_by_name ?? ""),
    recordedByEmail: String(row.recorded_by_email ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Pill }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className="rounded bg-gumleaf/10 p-3 text-gumleaf"><Icon className="h-5 w-5" /></span>
      </div>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Pill; children: React.ReactNode }) {
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
      <textarea name={name} required={required} rows={3} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, splitValue = false }: { name: string; label: string; options: string[]; splitValue?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {options.map((option) => {
          const [value, labelText] = splitValue ? option.split("|") : [option, option];
          return <option key={option} value={value}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-slate-500">{message}</p>
    </div>
  );
}
