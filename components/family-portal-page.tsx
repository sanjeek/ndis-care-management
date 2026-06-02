"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, FileText, HeartHandshake, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type FamilyParticipant = {
  name: string;
  ndisNumber: string;
  planType: string;
  goals: string;
  supportNeeds: string;
  communicationPreferences: string;
};

type FamilySchedule = {
  id: string;
  participantName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type FamilyNote = {
  id: string;
  participantName: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  category: string;
  note: string;
  outcomes: string;
  isImportant: boolean;
};

type FamilyGoal = {
  id: string;
  participantName: string;
  title: string;
  goals: string;
  supportInstructions: string;
  participantPreferences: string;
  reviewDate: string;
  status: string;
};

type ServiceUpdate = {
  id: string;
  participantName: string;
  title: string;
  detail: string;
  date: string;
};

type FamilyPortalData = {
  message: string;
  participants: FamilyParticipant[];
  schedules: FamilySchedule[];
  progressNotes: FamilyNote[];
  goals: FamilyGoal[];
  serviceUpdates: ServiceUpdate[];
};

export function FamilyPortalPage() {
  const [data, setData] = useState<FamilyPortalData>({
    message: "Loading family portal records.",
    participants: [],
    schedules: [],
    progressNotes: [],
    goals: [],
    serviceUpdates: []
  });

  useEffect(() => {
    let active = true;
    async function load() {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/family-portal", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!active) return;
      setData({
        message: result.message ?? "Family portal loaded.",
        participants: result.participants ?? [],
        schedules: result.schedules ?? [],
        progressNotes: result.progressNotes ?? [],
        goals: result.goals ?? [],
        serviceUpdates: result.serviceUpdates ?? []
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const upcomingSchedules = data.schedules.filter((schedule) => new Date(schedule.endsAt).getTime() >= Date.now()).slice(0, 8);

  return (
    <AppShell title="Family Portal" eyebrow={data.message}>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-5">
          <SummaryCard
            title="Participant access"
            icon={HeartHandshake}
            value={String(data.participants.length)}
            detail={data.participants.length ? "Approved family access" : "No approved participants assigned"}
          />
          {data.participants.length ? (
            <div className="grid gap-4">
              {data.participants.map((participant) => (
                <article key={participant.name} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gumleaf">Participant</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{participant.name}</h2>
                  <Info label="NDIS number" value={participant.ndisNumber || "Not recorded"} />
                  <Info label="Plan type" value={participant.planType || "Not recorded"} />
                  <Info label="Support needs" value={participant.supportNeeds || "Not recorded"} />
                  <Info label="Communication preferences" value={participant.communicationPreferences || "Not recorded"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No approved participant access" message="Ask the provider admin to approve your family portal access for a participant." />
          )}
        </section>

        <section className="space-y-5">
          <Panel title="Upcoming schedule" icon={CalendarDays}>
            {upcomingSchedules.length ? (
              <div className="grid gap-3">
                {upcomingSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink">{schedule.participantName}</p>
                        <p className="mt-1 text-slate-600">{dateTime(schedule.startsAt)} to {timeOnly(schedule.endsAt)}</p>
                        <p className="mt-1 text-slate-500">{schedule.location || "Location not recorded"}</p>
                      </div>
                      <span className="w-fit rounded bg-harbour/10 px-2.5 py-1 text-xs font-semibold text-harbour">{schedule.status || "Scheduled"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No upcoming services" message="Scheduled participant services will appear here when confirmed." />
            )}
          </Panel>

          <Panel title="Goals and care priorities" icon={Target}>
            {data.goals.length ? (
              <div className="grid gap-3">
                {data.goals.map((goal) => (
                  <article key={goal.id} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-ink">{goal.title || "Care plan"}</p>
                    <p className="mt-1 text-xs font-semibold text-gumleaf">{goal.participantName}</p>
                    <Info label="Goals" value={goal.goals || "Not recorded"} />
                    <Info label="Support instructions" value={goal.supportInstructions || "Not recorded"} />
                    <Info label="Preferences" value={goal.participantPreferences || "Not recorded"} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No goals published" message="Participant goals and care priorities will appear here when available." />
            )}
          </Panel>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Progress notes" icon={FileText}>
          {data.progressNotes.length ? (
            <div className="grid gap-3">
              {data.progressNotes.slice(0, 8).map((note) => (
                <article key={note.id} className="rounded border border-slate-200 bg-white p-4 text-sm shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{note.category || "Progress note"}</p>
                      <p className="mt-1 text-xs text-slate-500">{note.participantName} | {dateOnly(note.serviceDate)} | {timeRange(note.startTime, note.endTime)}</p>
                    </div>
                    {note.isImportant ? <span className="w-fit rounded bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Important</span> : null}
                  </div>
                  <Info label="Note" value={note.note || "Not recorded"} />
                  <Info label="Outcome" value={note.outcomes || "Not recorded"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No progress notes" message="Approved family-visible progress notes will appear here." />
          )}
        </Panel>

        <Panel title="Service updates" icon={CheckCircle2}>
          {data.serviceUpdates.length ? (
            <div className="grid gap-3">
              {data.serviceUpdates.map((update) => (
                <article key={update.id} className="rounded border border-slate-200 bg-white p-4 text-sm shadow-sm">
                  <p className="font-semibold text-ink">{update.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{update.participantName} | {dateTime(update.date)}</p>
                  <p className="mt-2 leading-6 text-slate-700">{update.detail || "Update detail not recorded"}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No service updates" message="Schedule and progress updates will appear here." />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function SummaryCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof HeartHandshake }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
        <span className="rounded bg-gumleaf/10 p-3 text-gumleaf">
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <Icon className="h-5 w-5 text-gumleaf" />
      </div>
      {children}
    </section>
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

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-slate-500">{message}</p>
    </div>
  );
}

function dateOnly(value: string) {
  if (!value) return "Date not recorded";
  return new Date(value).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function dateTime(value: string) {
  if (!value) return "Date not recorded";
  return new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeOnly(value: string) {
  if (!value) return "end time";
  return new Date(value).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function timeRange(start: string, end: string) {
  return `${String(start || "").slice(0, 5) || "start"} - ${String(end || "").slice(0, 5) || "end"}`;
}
