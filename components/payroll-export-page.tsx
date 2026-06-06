"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type PayrollExport = {
  id: string;
  export_number: string;
  period_start: string;
  period_end: string;
  generated_by_email: string;
  shift_count: number;
  worker_count: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  travel_amount: number;
  payroll_amount: number;
  created_at: string;
};

type PayrollReadyShift = {
  id: string;
  participant_name: string;
  support_worker_name: string;
  support_worker_email: string;
  starts_at: string;
  ends_at: string;
  clock_in_at: string;
  clock_out_at: string;
  payroll_ready_at: string;
};

export function PayrollExportPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [exports, setExports] = useState<PayrollExport[]>([]);
  const [readyShifts, setReadyShifts] = useState<PayrollReadyShift[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const canGenerate = role === "admin";
  const totals = useMemo(() => ({
    exports: exports.length,
    shiftsReady: readyShifts.length,
    hours: readyShifts.reduce((sum, shift) => sum + shiftHours(shift), 0),
    latestAmount: exports[0]?.payroll_amount ?? 0
  }), [exports, readyShifts]);

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

    const [exportRows, shiftRows] = await Promise.all([
      supabase.from("payroll_exports").select("*").order("created_at", { ascending: false }).limit(20),
      supabase
        .from("shifts")
        .select("id, participant_name, support_worker_name, support_worker_email, starts_at, ends_at, clock_in_at, clock_out_at, payroll_ready_at")
        .eq("approval_status", "approved")
        .not("payroll_ready_at", "is", null)
        .order("starts_at", { ascending: false })
        .limit(100)
    ]);

    setRole(resolvedRole);
    setExports((exportRows.data ?? []) as PayrollExport[]);
    setReadyShifts((shiftRows.data ?? []) as PayrollReadyShift[]);
    setNotice(exportRows.data?.length ? "" : "No payroll exports generated yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before generating payroll.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/payroll/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        period_start: String(form.get("periodStart")),
        period_end: String(form.get("periodEnd")),
        hourly_rate: String(form.get("hourlyRate")),
        overtime_rate: String(form.get("overtimeRate")),
        overtime_after_hours: String(form.get("overtimeAfterHours")),
        travel_km_per_shift: String(form.get("travelKmPerShift")),
        travel_rate: String(form.get("travelRate"))
      })
    });
    const result = await response.json().catch(() => ({ message: "Payroll export failed." }));
    setNotice(result.message);
    setBusy(false);
    if (response.ok) {
      downloadCsv(`${result.exportNumber}.csv`, String(result.csv ?? ""));
      await refresh();
    }
  }

  return (
    <AppShell title="Payroll Export" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Exports" value={String(totals.exports)} icon={FileSpreadsheet} />
        <Metric title="Payroll-ready shifts" value={String(totals.shiftsReady)} icon={ShieldCheck} />
        <Metric title="Ready hours" value={numberLabel(totals.hours)} icon={CalendarDays} />
        <Metric title="Latest payroll amount" value={currency(totals.latestAmount)} icon={Download} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title={canGenerate ? "Generate payroll CSV" : "Payroll review"} icon={Download}>
          {canGenerate ? (
            <form onSubmit={generate} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="periodStart" label="Period start" type="date" defaultValue={startOfCurrentFortnight()} />
                <Field name="periodEnd" label="Period end" type="date" defaultValue={today()} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="hourlyRate" label="Base hourly rate" type="number" min="0" step="0.01" defaultValue="35.00" />
                <Field name="overtimeRate" label="Overtime rate" type="number" min="0" step="0.01" defaultValue="52.50" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="overtimeAfterHours" label="Overtime after hours" type="number" min="0" step="0.1" defaultValue="38" />
                <Field name="travelKmPerShift" label="Travel km per shift" type="number" min="0" step="0.1" defaultValue="0" />
                <Field name="travelRate" label="Travel rate per km" type="number" min="0" step="0.01" defaultValue="1.00" />
              </div>
              <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                Payroll exports use approved shifts only. Worker and participant signatures remain on the protected shift record for audit review.
              </p>
              <button disabled={busy} className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:cursor-not-allowed disabled:opacity-70">
                {busy ? "Generating..." : "Generate and download CSV"}
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-600">Team leaders can review payroll-ready shifts and generated exports. Only admin users can generate payroll export files.</p>
          )}
        </Panel>

        <section className="space-y-6">
          <Panel title="Export history" icon={FileSpreadsheet}>
            {exports.length ? (
              <div className="grid gap-4">
                {exports.map((item) => (
                  <article key={item.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{item.export_number}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.period_start} to {item.period_end}</p>
                        <p className="mt-1 text-xs text-slate-500">Generated by {item.generated_by_email || "system"} on {dateLabel(item.created_at)}</p>
                      </div>
                      <span className="rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf">{currency(item.payroll_amount)}</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <Info label="Shifts" value={String(item.shift_count)} />
                      <Info label="Workers" value={String(item.worker_count)} />
                      <Info label="Regular" value={`${numberLabel(item.regular_hours)} hrs`} />
                      <Info label="Overtime" value={`${numberLabel(item.overtime_hours)} hrs`} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No payroll exports" message="Generated payroll CSV files will be recorded here." />
            )}
          </Panel>

          <Panel title="Payroll-ready shifts" icon={Users}>
            {readyShifts.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Worker</th>
                      <th className="px-3 py-3">Participant</th>
                      <th className="px-3 py-3">Hours</th>
                      <th className="px-3 py-3">Payroll ready</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {readyShifts.map((shift) => (
                      <tr key={shift.id}>
                        <td className="px-3 py-3 text-slate-700">{dateLabel(shift.starts_at)}</td>
                        <td className="px-3 py-3 font-medium text-ink">{shift.support_worker_name}</td>
                        <td className="px-3 py-3 text-slate-700">{shift.participant_name}</td>
                        <td className="px-3 py-3 text-slate-700">{numberLabel(shiftHours(shift))}</td>
                        <td className="px-3 py-3 text-slate-700">{dateLabel(shift.payroll_ready_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No payroll-ready shifts" message="Approve submitted timesheets first, then generate payroll." />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Download }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Download; children: React.ReactNode }) {
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

function Field({ name, label, defaultValue = "", type = "text", min, step }: { name: string; label: string; defaultValue?: string; type?: string; min?: string; step?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required defaultValue={defaultValue} min={min} step={step} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
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

function shiftHours(shift: PayrollReadyShift) {
  const start = new Date(shift.clock_in_at || shift.starts_at);
  const end = new Date(shift.clock_out_at || shift.ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfCurrentFortnight() {
  const date = new Date();
  date.setDate(date.getDate() - 13);
  return date.toISOString().slice(0, 10);
}

function dateLabel(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value || 0);
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(value || 0);
}
