"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Handshake, Network, Phone, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type Participant = { name: string; ndis_number: string; plan_type: string };
type Worker = { name: string; email: string };
type Goal = { id: string; participant_name: string; title: string; current_progress_percent: number; status: string };
type Contact = { id: string; participant_name: string; provider_name: string; service_type: string; contact_name: string; phone: string; email: string; status: string; notes: string };
type Booking = { id: string; participant_name: string; provider_name: string; support_category: string; line_item: string; booking_reference: string; start_date: string; end_date: string; budget_amount: number; used_amount: number; status: string };
type Meeting = { id: string; participant_name: string; meeting_date: string; meeting_type: string; attendees: string; summary: string; decisions: string; next_steps: string; status: string };
type Action = { id: string; participant_name: string; goal_id: string | null; title: string; description: string; assigned_to_name: string; assigned_to_email: string; due_date: string; priority: string; status: string };

const supportCategories = [
  "Core - Assistance with Daily Life",
  "Core - Social and Community Participation",
  "Capacity Building - Support Coordination",
  "Capacity Building - Improved Daily Living",
  "Capital - Assistive Technology"
];

export function SupportCoordinationPage() {
  const [notice, setNotice] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  const summary = useMemo(() => ({
    goals: goals.filter((goal) => goal.status !== "archived").length,
    contacts: contacts.filter((contact) => contact.status === "active").length,
    bookings: bookings.filter((booking) => booking.status === "active").length,
    openActions: actions.filter((action) => !["completed", "cancelled"].includes(action.status)).length
  }), [goals, contacts, bookings, actions]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening support coordination.");
      return;
    }
    const response = await fetch("/api/support-coordination", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Support coordination could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setCanManage(Boolean(result.canManage));
    setParticipants(result.participants ?? []);
    setWorkers(result.workers ?? []);
    setGoals(result.goals ?? []);
    setContacts(result.contacts ?? []);
    setBookings(result.bookings ?? []);
    setMeetings(result.meetings ?? []);
    setActions(result.actions ?? []);
    setNotice(result.actions?.length || result.contacts?.length ? "" : "No support coordination records yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = { action };
    form.forEach((value, key) => {
      payload[key] = String(value);
    });
    const ok = await post(payload);
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function updateAction(id: string, status: string) {
    const ok = await post({ action: "update_action", id, status });
    if (ok) await refresh();
  }

  async function post(payload: Record<string, string>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving.");
      return false;
    }
    const response = await fetch("/api/support-coordination", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Support coordination record could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Support Coordination" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Participant goals" value={summary.goals} icon={Target} />
        <Metric title="Provider contacts" value={summary.contacts} icon={Phone} />
        <Metric title="Active bookings" value={summary.bookings} icon={Handshake} />
        <Metric title="Open actions" value={summary.openActions} icon={ClipboardList} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="space-y-6">
          {canManage ? (
            <>
              <Panel title="Provider contact" icon={Phone}>
                <form onSubmit={(event) => submit(event, "contact")} className="grid gap-4">
                  <Select name="participant_name" label="Participant" options={participants.map((item) => item.name)} />
                  <Field name="provider_name" label="Provider name" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="service_type" label="Service type" required={false} />
                    <Field name="contact_name" label="Contact person" required={false} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="phone" label="Phone" required={false} />
                    <Field name="email" label="Email" type="email" required={false} />
                  </div>
                  <Area name="address" label="Address" required={false} rows={2} />
                  <Area name="notes" label="Notes" required={false} rows={3} />
                  <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf">Save provider contact</button>
                </form>
              </Panel>

              <Panel title="Service booking" icon={Handshake}>
                <form onSubmit={(event) => submit(event, "booking")} className="grid gap-4">
                  <Select name="participant_name" label="Participant" options={participants.map((item) => item.name)} />
                  <Field name="provider_name" label="Provider name" />
                  <Select name="support_category" label="Support category" options={supportCategories} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="line_item" label="NDIS line item" required={false} />
                    <Field name="booking_reference" label="Booking reference" required={false} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="start_date" label="Start date" type="date" required={false} />
                    <Field name="end_date" label="End date" type="date" required={false} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="budget_amount" label="Budget amount" type="number" min="0" step="0.01" defaultValue="0" />
                    <Field name="used_amount" label="Used amount" type="number" min="0" step="0.01" defaultValue="0" />
                  </div>
                  <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf">Save booking</button>
                </form>
              </Panel>

              <Panel title="Case meeting and action" icon={CalendarDays}>
                <form onSubmit={(event) => submit(event, "meeting")} className="grid gap-4">
                  <Select name="participant_name" label="Participant" options={participants.map((item) => item.name)} />
                  <Field name="meeting_date" label="Meeting date and time" type="datetime-local" />
                  <Field name="meeting_type" label="Meeting type" defaultValue="review" />
                  <Area name="attendees" label="Attendees" required={false} rows={2} />
                  <Area name="summary" label="Summary" required={false} rows={3} />
                  <Area name="decisions" label="Decisions" required={false} rows={3} />
                  <Area name="next_steps" label="Next steps" required={false} rows={3} />
                  <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf">Save meeting</button>
                </form>
                <form onSubmit={(event) => submit(event, "coordination_action")} className="mt-6 grid gap-4 border-t border-slate-200 pt-5">
                  <Select name="participant_name" label="Participant" options={participants.map((item) => item.name)} />
                  <Select name="goal_id" label="Linked goal" options={goals.map((goal) => `${goal.id}|${goal.participant_name}: ${goal.title}`)} splitValue required={false} />
                  <Field name="title" label="Action title" />
                  <Area name="description" label="Action notes" required={false} rows={3} />
                  <Select name="assigned_to_email" label="Assign to" options={workers.map((worker) => `${worker.email}|${worker.name} (${worker.email})`)} splitValue required={false} />
                  <Field name="assigned_to_name" label="Assigned name" required={false} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="due_date" label="Due date" type="date" required={false} />
                    <Select name="priority" label="Priority" options={["low", "medium", "high", "critical"]} defaultValue="medium" />
                  </div>
                  <button className="min-h-12 rounded bg-ink px-4 py-3 text-sm font-semibold text-gumleaf">Save action</button>
                </form>
              </Panel>
            </>
          ) : (
            <Panel title="Assigned coordination" icon={Network}>
              <p className="text-sm leading-6 text-slate-600">You can view coordination records for participants assigned to you and update actions assigned to your account.</p>
            </Panel>
          )}
        </section>

        <section className="space-y-6">
          <Panel title="Participant goals" icon={Target}>
            <RecordGrid empty="No visible participant goals.">
              {goals.map((goal) => (
                <Card key={goal.id} title={goal.title} subtitle={goal.participant_name} badge={`${Math.round(Number(goal.current_progress_percent ?? 0))}% ${goal.status}`} />
              ))}
            </RecordGrid>
          </Panel>

          <Panel title="Provider contacts and bookings" icon={Handshake}>
            <RecordGrid empty="No provider contacts or service bookings.">
              {contacts.map((contact) => (
                <Card key={contact.id} title={contact.provider_name} subtitle={`${contact.participant_name} | ${contact.service_type || "Service not recorded"}`} badge={contact.status}>
                  <p className="mt-2 text-sm text-slate-600">{contact.contact_name || "No contact"} {contact.phone ? `| ${contact.phone}` : ""}</p>
                </Card>
              ))}
              {bookings.map((booking) => (
                <Card key={booking.id} title={booking.provider_name} subtitle={`${booking.participant_name} | ${booking.support_category}`} badge={booking.status}>
                  <p className="mt-2 text-sm text-slate-600">{booking.booking_reference || "No booking reference"} | {currency(booking.used_amount)} / {currency(booking.budget_amount)}</p>
                </Card>
              ))}
            </RecordGrid>
          </Panel>

          <Panel title="Case meetings" icon={CalendarDays}>
            <RecordGrid empty="No case meetings recorded.">
              {meetings.map((meeting) => (
                <Card key={meeting.id} title={meeting.meeting_type} subtitle={`${meeting.participant_name} | ${dateTime(meeting.meeting_date)}`} badge={meeting.status}>
                  {meeting.next_steps ? <p className="mt-2 text-sm text-slate-600">{meeting.next_steps}</p> : null}
                </Card>
              ))}
            </RecordGrid>
          </Panel>

          <Panel title="Action tracking" icon={ClipboardList}>
            <RecordGrid empty="No coordination actions.">
              {actions.map((action) => (
                <Card key={action.id} title={action.title} subtitle={`${action.participant_name} | Due ${dateOnly(action.due_date)}`} badge={action.status}>
                  <p className="mt-2 text-sm text-slate-600">{action.description || "No action notes."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.status !== "completed" ? <button type="button" onClick={() => void updateAction(action.id, "completed")} className="rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-xs font-semibold text-gumleaf">Mark complete</button> : null}
                    {action.status === "open" ? <button type="button" onClick={() => void updateAction(action.id, "in_progress")} className="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-ink">In progress</button> : null}
                  </div>
                </Card>
              ))}
            </RecordGrid>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: LucideIcon }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <Icon className="h-5 w-5 text-gumleaf" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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

function Field({ name, label, defaultValue = "", placeholder = "", type = "text", required = true, min, step }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean; min?: string; step?: string }) {
  return <label><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} min={min} step={step} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" /></label>;
}

function Area({ name, label, required = true, rows = 4 }: { name: string; label: string; required?: boolean; rows?: number }) {
  return <label><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><textarea name={name} required={required} rows={rows} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" /></label>;
}

function Select({ name, label, options, defaultValue = "", splitValue = false, required = true }: { name: string; label: string; options: string[]; defaultValue?: string; splitValue?: boolean; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={`${name}-${option}`} value={splitValue ? option.split("|")[0] : option}>{splitValue ? option.split("|").slice(1).join("|") : option}</option>)}
      </select>
    </label>
  );
}

function RecordGrid({ empty, children }: { empty: string; children: React.ReactNode }) {
  const list = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(list) && !list.length) return <Empty message={empty} />;
  return <div className="grid gap-3">{children}</div>;
}

function Card({ title, subtitle, badge, children }: { title: string; subtitle: string; badge: string; children?: React.ReactNode }) {
  return (
    <article className="rounded border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="w-fit rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold capitalize text-gumleaf">{badge}</span>
      </div>
      {children}
    </article>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{message}</div>;
}

function dateOnly(value: string) {
  if (!value) return "not set";
  return new Date(value).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function dateTime(value: string) {
  if (!value) return "not set";
  return new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value || 0));
}
