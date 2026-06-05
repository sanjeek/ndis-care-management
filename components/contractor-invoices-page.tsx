"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Mail, ReceiptText, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { defaultContractorRates } from "@/lib/contractor-invoices";
import { isAdminRole, roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ContractorInvoice = {
  id: string;
  invoiceNumber: string;
  workerName: string;
  workerEmail: string;
  workerAbn: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  totalHours: number;
  totalAmount: number;
  status: string;
  emailTo: string;
  emailedAt: string;
  createdAt: string;
};

type ContractorInvoiceItem = {
  id: string;
  invoiceId: string;
  participantName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: string;
  shiftStatus: string;
  approvalStatus: string;
  dayType: string;
  publicHolidayName: string;
  hours: number;
  rate: number;
  amount: number;
};

type ApiRecords = {
  invoices: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
};

export function ContractorInvoicesPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [userEmail, setUserEmail] = useState("");
  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [items, setItems] = useState<ContractorInvoiceItem[]>([]);
  const [notice, setNotice] = useState("Loading contractor invoices.");
  const [busy, setBusy] = useState(false);

  const canGenerate = isAdminRole(role);
  const totals = useMemo(() => ({
    invoices: invoices.length,
    workers: new Set(invoices.map((invoice) => invoice.workerEmail)).size,
    hours: invoices.reduce((sum, invoice) => sum + invoice.totalHours, 0),
    amount: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    emailed: invoices.filter((invoice) => invoice.status === "emailed").length
  }), [invoices]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const session = (await supabase.auth.getSession()).data.session;
    const user = session?.user;
    if (!session || !user) return;
    let resolvedRole = roleForUser(user.user_metadata?.role, user.email);
    if (!user.user_metadata?.role) {
      const profile = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      resolvedRole = roleForUser(profile.data?.role, user.email);
    }
    setRole(resolvedRole);
    setUserEmail(user.email ?? "");

    const response = await fetch("/api/contractor-invoices", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const result = await response.json().catch(() => ({ message: "Contractor invoices could not be loaded.", invoices: [], items: [] }));
    if (!response.ok) {
      setNotice(String(result.message ?? "Contractor invoices could not be loaded."));
      return;
    }

    const records = result as ApiRecords;
    setInvoices((records.invoices ?? []).map(mapInvoice));
    setItems((records.items ?? []).map(mapItem));
    setNotice(records.invoices?.length ? "Showing contractor invoices from Supabase." : "No contractor invoices generated yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setNotice("Please sign in again before generating contractor invoices.");
      return;
    }

    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contractor-invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        period_start: String(form.get("periodStart")),
        period_end: String(form.get("periodEnd")),
        provider_email: String(form.get("providerEmail")),
        weekday_rate: String(form.get("weekdayRate")),
        saturday_rate: String(form.get("saturdayRate")),
        sunday_rate: String(form.get("sundayRate")),
        public_holiday_rate: String(form.get("publicHolidayRate")),
        send_email: form.get("sendEmail") === "on"
      })
    });
    const result = await response.json().catch(() => ({ message: "Contractor invoices could not be generated." }));
    setBusy(false);
    setNotice(String(result.message ?? "Contractor invoice action complete."));
    if (response.ok) await refresh();
  }

  return (
    <AppShell title="Contractor Invoices" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Invoices" value={String(totals.invoices)} icon={ReceiptText} />
        <Metric title="Workers" value={String(totals.workers)} icon={Users} />
        <Metric title="Scheduled hours" value={numberLabel(totals.hours)} icon={Clock3} />
        <Metric title="Total payable" value={currency(totals.amount)} icon={WalletCards} />
        <Metric title="Emailed" value={String(totals.emailed)} icon={Mail} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title={canGenerate ? "Generate weekly contractor invoices" : "Contractor invoice review"} icon={CalendarDays}>
          {canGenerate ? (
            <form onSubmit={generate} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="periodStart" label="Week start" type="date" defaultValue={completedWeek().periodStart} />
                <Field name="periodEnd" label="Week end" type="date" defaultValue={completedWeek().periodEnd} />
              </div>
              <Field name="providerEmail" label="Send invoice to provider email" type="email" defaultValue={userEmail} helper="Use comma separated emails for multiple recipients." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="weekdayRate" label="Normal hourly rate" type="number" min="0" step="0.01" defaultValue={String(defaultContractorRates.weekday)} />
                <Field name="saturdayRate" label="Saturday hourly rate" type="number" min="0" step="0.01" defaultValue={String(defaultContractorRates.saturday)} />
                <Field name="sundayRate" label="Sunday hourly rate" type="number" min="0" step="0.01" defaultValue={String(defaultContractorRates.sunday)} />
                <Field name="publicHolidayRate" label="Public holiday hourly rate" type="number" min="0" step="0.01" defaultValue={String(defaultContractorRates.publicHoliday)} />
              </div>
              <label className="flex items-start gap-3 rounded border border-indigo-100 bg-indigo-50/40 p-3 text-sm text-slate-700">
                <input name="sendEmail" type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded border-slate-300 text-gumleaf focus:ring-gumleaf" />
                <span>
                  <span className="font-semibold text-ink">Email invoices after generation</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">The support worker login email is included as reply-to. If Resend is not configured, invoices are saved and email status is logged as pending.</span>
                </span>
              </label>
              <p className="rounded border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">
                Contractor invoices use assigned scheduled shift hours for the selected week. Cancelled shifts and shifts already linked to a contractor invoice are skipped.
              </p>
              <button disabled={busy} className="min-h-12 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:opacity-70">
                {busy ? "Generating..." : "Generate and email invoices"}
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-600">Team leaders can review contractor invoices. Admin users can generate and email contractor invoices.</p>
          )}
        </Panel>

        <section className="space-y-6">
          <Panel title="Generated contractor invoices" icon={ReceiptText}>
            {invoices.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-indigo-50/50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Worker</Th>
                      <Th>ABN</Th>
                      <Th>Period</Th>
                      <Th>Hours</Th>
                      <Th>Total</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-slate-100">
                        <Td>
                          <span className="font-semibold text-ink">{invoice.invoiceNumber}</span>
                          <span className="mt-1 block text-xs text-slate-500">Issued {dateLabel(invoice.issueDate)}</span>
                        </Td>
                        <Td>
                          <span className="font-semibold text-ink">{invoice.workerName}</span>
                          <span className="mt-1 block text-xs text-slate-500">{invoice.workerEmail}</span>
                        </Td>
                        <Td>{invoice.workerAbn || "Not recorded"}</Td>
                        <Td>{dateLabel(invoice.periodStart)} to {dateLabel(invoice.periodEnd)}</Td>
                        <Td>{numberLabel(invoice.totalHours)}</Td>
                        <Td>{currency(invoice.totalAmount)}</Td>
                        <Td><StatusBadge status={invoice.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No contractor invoices" message="Weekly contractor invoices will appear here after generation." />
            )}
          </Panel>

          <Panel title="Invoice shift details" icon={Clock3}>
            {items.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-indigo-50/50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <Th>Date</Th>
                      <Th>Participant</Th>
                      <Th>Time</Th>
                      <Th>Location</Th>
                      <Th>Rate type</Th>
                      <Th>Hours</Th>
                      <Th>Rate</Th>
                      <Th>Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <Td>{dateLabel(item.shiftDate)}</Td>
                        <Td>{item.participantName}</Td>
                        <Td>{item.startTime} - {item.endTime}</Td>
                        <Td>{item.location || "Not recorded"}</Td>
                        <Td>{rateTypeLabel(item)}</Td>
                        <Td>{numberLabel(item.hours)}</Td>
                        <Td>{currency(item.rate)}</Td>
                        <Td>{currency(item.amount)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No invoice shift lines" message="Participant, hour, and rate details will appear here after generation." />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function mapInvoice(row: Record<string, unknown>): ContractorInvoice {
  return {
    id: String(row.id ?? ""),
    invoiceNumber: String(row.invoice_number ?? ""),
    workerName: String(row.worker_name ?? ""),
    workerEmail: String(row.worker_email ?? ""),
    workerAbn: String(row.worker_abn ?? ""),
    periodStart: String(row.period_start ?? ""),
    periodEnd: String(row.period_end ?? ""),
    issueDate: String(row.issue_date ?? ""),
    dueDate: String(row.due_date ?? ""),
    totalHours: Number(row.total_hours ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    status: String(row.status ?? "generated"),
    emailTo: String(row.email_to ?? ""),
    emailedAt: String(row.emailed_at ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function mapItem(row: Record<string, unknown>): ContractorInvoiceItem {
  return {
    id: String(row.id ?? ""),
    invoiceId: String(row.contractor_invoice_id ?? ""),
    participantName: String(row.participant_name ?? ""),
    shiftDate: String(row.shift_date ?? ""),
    startTime: String(row.start_time ?? ""),
    endTime: String(row.end_time ?? ""),
    location: String(row.location ?? ""),
    shiftStatus: String(row.shift_status ?? ""),
    approvalStatus: String(row.approval_status ?? ""),
    dayType: String(row.day_type ?? ""),
    publicHolidayName: String(row.public_holiday_name ?? ""),
    hours: Number(row.hours ?? 0),
    rate: Number(row.rate ?? 0),
    amount: Number(row.amount ?? 0)
  };
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof ReceiptText }) {
  return (
    <article className="rounded border border-indigo-100 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="rounded-lg bg-indigo-50 p-2 text-gumleaf">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof ReceiptText; children: React.ReactNode }) {
  return (
    <section className="rounded border border-indigo-100 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.045)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <span className="rounded-lg bg-indigo-50 p-2 text-gumleaf">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {children}
    </section>
  );
}

function Field({ name, label, defaultValue = "", type = "text", min, step, helper }: { name: string; label: string; defaultValue?: string; type?: string; min?: string; step?: string; helper?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label} <span className="text-rose-500">*</span></span>
      <input name={name} type={type} required defaultValue={defaultValue} min={min} step={step} className="w-full rounded border border-indigo-100 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-indigo-100 px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ") || "generated";
  const tone = status === "emailed" ? "bg-emerald-50 text-emerald-700" : status === "email_pending" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-gumleaf";
  return <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-indigo-200 bg-indigo-50/30 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function completedWeek() {
  const today = new Date();
  const day = today.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday - 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { periodStart: dateValue(monday), periodEnd: dateValue(sunday) };
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rateTypeLabel(item: ContractorInvoiceItem) {
  if (item.dayType === "public_holiday") return item.publicHolidayName ? `Public holiday - ${item.publicHolidayName}` : "Public holiday";
  if (item.dayType === "saturday") return "Saturday";
  if (item.dayType === "sunday") return "Sunday";
  return "Normal";
}

function dateLabel(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(value || 0);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value || 0);
}
