"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, Gauge, Landmark, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { isAdminRole, roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ParticipantOption = {
  name: string;
  ndisNumber: string;
  planType: string;
};

type FundingRecord = {
  id: string;
  participantName: string;
  ndisNumber: string;
  planType: string;
  planStart: string;
  planEnd: string;
  planTotalBudget: number;
  supportCategory: string;
  serviceBookingReference: string;
  serviceBookingAmount: number;
  spentAmount: number;
  providerReference: string;
  notes: string;
  status: string;
  createdAt: string;
};

type FundingSummary = {
  participantName: string;
  planTotalBudget: number;
  serviceBookings: number;
  spentAmount: number;
  remainingBalance: number;
  utilisation: number;
  planEnd: string;
};

const supportCategories = [
  "Core - Assistance with Daily Life",
  "Core - Social and Community Participation",
  "Core - Transport",
  "Capacity Building - Improved Daily Living",
  "Capacity Building - Improved Relationships",
  "Capacity Building - Support Coordination",
  "Capital - Assistive Technology",
  "Capital - Home Modifications"
];

export function FundingManagementPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [records, setRecords] = useState<FundingRecord[]>([]);
  const [notice, setNotice] = useState("");

  const canManage = isAdminRole(role);
  const summaries = useMemo(() => summariseFunding(records), [records]);
  const totals = useMemo(() => {
    const planBudget = summaries.reduce((sum, row) => sum + row.planTotalBudget, 0);
    const bookings = summaries.reduce((sum, row) => sum + row.serviceBookings, 0);
    const spent = summaries.reduce((sum, row) => sum + row.spentAmount, 0);
    return {
      planBudget,
      bookings,
      spent,
      remaining: Math.max(0, planBudget - spent),
      utilisation: planBudget > 0 ? Math.round((spent / planBudget) * 100) : 0
    };
  }, [summaries]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) return;

    let resolvedRole = roleForUser(user.user_metadata?.role, user.email);
    if (!user.user_metadata?.role) {
      const profile = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      resolvedRole = roleForUser(profile.data?.role, user.email);
    }

    const [participantRows, fundingRows] = await Promise.all([
      supabase.from("participants").select("name, ndis_number, plan_type").order("name", { ascending: true }),
      supabase.from("ndis_funding_records").select("*").order("created_at", { ascending: false })
    ]);

    setRole(resolvedRole);
    setParticipants((participantRows.data ?? []).map((participant) => ({
      name: String(participant.name ?? ""),
      ndisNumber: String(participant.ndis_number ?? ""),
      planType: String(participant.plan_type ?? "")
    })).filter((participant) => participant.name));
    setRecords((fundingRows.data ?? []).map(mapFundingRecord));
    setNotice(fundingRows.data?.length ? "" : "No NDIS funding records yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedParticipant = participants.find((participant) => participant.name === String(form.get("participant")));
    const ok = await postFunding({
      participant_name: String(form.get("participant")),
      ndis_number: selectedParticipant?.ndisNumber || String(form.get("ndisNumber")),
      plan_type: selectedParticipant?.planType || String(form.get("planType")),
      plan_start: String(form.get("planStart")),
      plan_end: String(form.get("planEnd")),
      plan_total_budget: String(form.get("planTotalBudget")),
      support_category: String(form.get("supportCategory")),
      service_booking_reference: String(form.get("serviceBookingReference")),
      service_booking_amount: String(form.get("serviceBookingAmount")),
      spent_amount: String(form.get("spentAmount")),
      provider_reference: String(form.get("providerReference")),
      notes: String(form.get("notes")),
      status: String(form.get("status"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function postFunding(payload: Record<string, string>) {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return false;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving funding records.");
      return false;
    }
    const response = await fetch("/api/funding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Funding record could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="NDIS Funding" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Plan budgets" value={currency(totals.planBudget)} icon={WalletCards} />
        <Metric title="Service bookings" value={currency(totals.bookings)} icon={ClipboardPlus} />
        <Metric title="Spent" value={currency(totals.spent)} icon={Landmark} />
        <Metric title="Remaining" value={currency(totals.remaining)} icon={WalletCards} />
        <Metric title="Utilisation" value={`${totals.utilisation}%`} icon={Gauge} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {canManage ? (
          <Panel title="Add funding / service booking" icon={ClipboardPlus}>
            <form onSubmit={submit} className="grid gap-4">
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="ndisNumber" label="NDIS number" placeholder="Auto-filled if participant has one" required={false} />
                <Field name="planType" label="Plan type" placeholder="Plan managed, self managed, NDIA managed" required={false} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="planStart" label="Plan start" type="date" required={false} />
                <Field name="planEnd" label="Plan end" type="date" required={false} />
              </div>
              <Field name="planTotalBudget" label="Plan total budget" type="number" min="0" step="0.01" placeholder="0.00" />
              <Select name="supportCategory" label="Support category" options={supportCategories} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="serviceBookingReference" label="Service booking reference" placeholder="Booking reference" required={false} />
                <Field name="providerReference" label="Provider reference" placeholder="Internal reference" required={false} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="serviceBookingAmount" label="Service booking amount" type="number" min="0" step="0.01" placeholder="0.00" />
                <Field name="spentAmount" label="Spent amount" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
              <Select name="status" label="Status" options={["active", "exhausted", "closed"]} />
              <Area name="notes" label="Funding notes" placeholder="Plan manager notes, budget alerts, service booking conditions, or review actions." required={false} />
              <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">Save funding record</button>
            </form>
          </Panel>
        ) : (
          <Panel title="Read-only funding view" icon={WalletCards}>
            <p className="text-sm leading-6 text-slate-600">Team leaders can review funding utilisation. Only admin users can create or change funding records.</p>
          </Panel>
        )}

        <section className="space-y-6">
          <Panel title="Participant funding utilisation" icon={Gauge}>
            {summaries.length ? (
              <div className="grid gap-4">
                {summaries.map((summary) => (
                  <article key={summary.participantName} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{summary.participantName}</h3>
                        <p className="mt-1 text-sm text-slate-500">{currency(summary.remainingBalance)} remaining from {currency(summary.planTotalBudget)}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className={`rounded px-2.5 py-1 text-xs font-semibold ${summary.utilisation >= 90 ? "bg-coral/10 text-coral" : summary.utilisation >= 70 ? "bg-banksia/20 text-banksia" : "bg-gumleaf/10 text-gumleaf"}`}>
                          {summary.utilisation}% used
                        </span>
                        {summary.planEnd ? (() => {
                          const days = Math.ceil((new Date(summary.planEnd).getTime() - Date.now()) / 86400000);
                          if (days < 0) return <span className="rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">Plan expired</span>;
                          if (days <= 30) return <span className="rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">{days}d left in plan</span>;
                          if (days <= 90) return <span className="rounded bg-banksia/20 px-2.5 py-1 text-xs font-semibold text-banksia">{days}d to plan end</span>;
                          return null;
                        })() : null}
                      </div>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full transition-all ${summary.utilisation >= 90 ? "bg-coral" : summary.utilisation >= 70 ? "bg-banksia" : "bg-gumleaf"}`} style={{ width: `${Math.min(100, summary.utilisation)}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <Info label="Service bookings" value={currency(summary.serviceBookings)} />
                      <Info label="Spent" value={currency(summary.spentAmount)} />
                      <Info label="Remaining" value={currency(summary.remainingBalance)} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No funding summaries" message="Funding utilisation appears after service booking records are saved." />
            )}
          </Panel>

          <Panel title="Service booking register" icon={ClipboardPlus}>
            {records.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Participant</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Booking</th>
                      <th className="px-3 py-3">Spent</th>
                      <th className="px-3 py-3">Remaining</th>
                      <th className="px-3 py-3">Utilisation</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => {
                      const remaining = Math.max(0, record.serviceBookingAmount - record.spentAmount);
                      const utilisation = record.serviceBookingAmount > 0 ? Math.round((record.spentAmount / record.serviceBookingAmount) * 100) : 0;
                      return (
                        <tr key={record.id}>
                          <td className="px-3 py-3 font-medium text-ink">{record.participantName}</td>
                          <td className="px-3 py-3 text-slate-700">{record.supportCategory}</td>
                          <td className="px-3 py-3 text-slate-700">{currency(record.serviceBookingAmount)}</td>
                          <td className="px-3 py-3 text-slate-700">{currency(record.spentAmount)}</td>
                          <td className="px-3 py-3 text-slate-700">{currency(remaining)}</td>
                          <td className="px-3 py-3 text-slate-700">{utilisation}%</td>
                          <td className="px-3 py-3"><span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{record.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No service bookings" message="Service bookings and balances will appear here after records are saved." />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function summariseFunding(records: FundingRecord[]): FundingSummary[] {
  const grouped = new Map<string, FundingRecord[]>();
  records.forEach((record) => grouped.set(record.participantName, [...(grouped.get(record.participantName) ?? []), record]));
  return Array.from(grouped.entries()).map(([participantName, rows]) => {
    const planTotalBudget = Math.max(...rows.map((row) => row.planTotalBudget), 0);
    const serviceBookings = rows.reduce((sum, row) => sum + row.serviceBookingAmount, 0);
    const spentAmount = rows.reduce((sum, row) => sum + row.spentAmount, 0);
    const remainingBalance = Math.max(0, planTotalBudget - spentAmount);
    const utilisation = planTotalBudget > 0 ? Math.round((spentAmount / planTotalBudget) * 100) : 0;
    const planEnd = rows.map((r) => r.planEnd).filter(Boolean).sort().at(-1) ?? "";
    return { participantName, planTotalBudget, serviceBookings, spentAmount, remainingBalance, utilisation, planEnd };
  });
}

function mapFundingRecord(row: Record<string, unknown>): FundingRecord {
  return {
    id: String(row.id ?? ""),
    participantName: String(row.participant_name ?? ""),
    ndisNumber: String(row.ndis_number ?? ""),
    planType: String(row.plan_type ?? ""),
    planStart: String(row.plan_start ?? ""),
    planEnd: String(row.plan_end ?? ""),
    planTotalBudget: Number(row.plan_total_budget ?? 0),
    supportCategory: String(row.support_category ?? ""),
    serviceBookingReference: String(row.service_booking_reference ?? ""),
    serviceBookingAmount: Number(row.service_booking_amount ?? 0),
    spentAmount: Number(row.spent_amount ?? 0),
    providerReference: String(row.provider_reference ?? ""),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "active"),
    createdAt: String(row.created_at ?? "")
  };
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof WalletCards }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <Icon className="h-5 w-5 text-gumleaf" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof WalletCards; children: React.ReactNode }) {
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

function Field({ name, label, placeholder = "", type = "text", required = true, min, step }: { name: string; label: string; placeholder?: string; type?: string; required?: boolean; min?: string; step?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} min={min} step={step} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
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

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{value}</p>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value || 0);
}
