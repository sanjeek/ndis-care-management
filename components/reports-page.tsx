"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, TrendingUp, Users, WalletCards, ShieldCheck, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type WorkerStat = {
  name: string;
  email: string;
  totalShifts: number;
  completedShifts: number;
  scheduledHours: number;
  deliveredHours: number;
  attendanceRate: number;
};

type FundingStat = {
  participantName: string;
  planBudget: number;
  spent: number;
  remaining: number;
  utilisation: number;
  planEnd: string;
};

type ComplianceStat = {
  workerName: string;
  workerEmail: string;
  issue: string;
  status: string;
  dueDate: string;
};

export function ReportsPage() {
  const [workerStats, setWorkerStats] = useState<WorkerStat[]>([]);
  const [fundingStats, setFundingStats] = useState<FundingStat[]>([]);
  const [complianceStats, setComplianceStats] = useState<ComplianceStat[]>([]);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"workers" | "funding" | "compliance">("workers");

  const totals = useMemo(() => ({
    workers: workerStats.length,
    totalHours: Math.round(workerStats.reduce((s, w) => s + w.deliveredHours, 0) * 10) / 10,
    avgAttendance: workerStats.length ? Math.round(workerStats.reduce((s, w) => s + w.attendanceRate, 0) / workerStats.length) : 0,
    fundingParticipants: fundingStats.length,
    totalBudget: fundingStats.reduce((s, f) => s + f.planBudget, 0),
    totalSpent: fundingStats.reduce((s, f) => s + f.spent, 0),
    complianceIssues: complianceStats.length
  }), [workerStats, fundingStats, complianceStats]);

  const load = useCallback(async () => {
    if (!supabase) { setNotice("Supabase is not connected."); return; }
    setNotice("Loading reports...");

    const [shiftsRes, workersRes, fundingRes, complianceRes] = await Promise.all([
      supabase.from("shifts").select("support_worker_email, support_worker_name, status, approval_status, clock_in_at, clock_out_at, starts_at, ends_at"),
      supabase.from("support_workers").select("name, email, police_check_expiry, ndis_worker_screening_expiry, first_aid_expiry, cpr_expiry"),
      supabase.from("ndis_funding_records").select("participant_name, plan_total_budget, spent_amount, plan_end").order("participant_name"),
      supabase.from("support_workers").select("name, email, police_check_expiry, ndis_worker_screening_expiry, first_aid_expiry, cpr_expiry, drivers_licence_expiry")
    ]);

    // Worker utilisation
    const shifts = shiftsRes.data ?? [];
    const byWorker = new Map<string, typeof shifts>();
    shifts.forEach((s) => {
      const key = String(s.support_worker_email ?? "");
      if (!key) return;
      byWorker.set(key, [...(byWorker.get(key) ?? []), s]);
    });
    const stats: WorkerStat[] = (workersRes.data ?? []).map((w) => {
      const wShifts = byWorker.get(w.email ?? "") ?? [];
      const active = wShifts.filter((s) => !["cancelled", "canceled"].includes(String(s.status ?? "").toLowerCase()));
      const completed = active.filter((s) => Boolean(s.clock_out_at) || ["completed", "approved for payroll"].includes(String(s.status ?? "").toLowerCase()));
      const scheduledHours = active.reduce((sum, s) => sum + calcHours(String(s.starts_at ?? ""), String(s.ends_at ?? "")), 0);
      const deliveredHours = completed.reduce((sum, s) => sum + calcHours(String(s.starts_at ?? ""), String(s.ends_at ?? "")), 0);
      return {
        name: String(w.name ?? ""),
        email: String(w.email ?? ""),
        totalShifts: active.length,
        completedShifts: completed.length,
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        deliveredHours: Math.round(deliveredHours * 10) / 10,
        attendanceRate: active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0
      };
    }).filter((w) => w.name);
    setWorkerStats(stats.sort((a, b) => b.deliveredHours - a.deliveredHours));

    // Funding by participant
    type FundingRow = NonNullable<typeof fundingRes.data>[number];
    const fundingByParticipant = new Map<string, FundingRow[]>();
    (fundingRes.data ?? []).forEach((f) => {
      const key = String(f.participant_name ?? "");
      fundingByParticipant.set(key, [...(fundingByParticipant.get(key) ?? []), f]);
    });
    const fStats: FundingStat[] = Array.from(fundingByParticipant.entries()).map(([name, rows]) => {
      const planBudget = Math.max(...rows.map((r) => Number(r.plan_total_budget ?? 0)), 0);
      const spent = rows.reduce((s, r) => s + Number(r.spent_amount ?? 0), 0);
      const planEnd = rows.map((r) => String(r.plan_end ?? "")).filter(Boolean).sort().at(-1) ?? "";
      return { participantName: name, planBudget, spent, remaining: Math.max(0, planBudget - spent), utilisation: planBudget > 0 ? Math.round((spent / planBudget) * 100) : 0, planEnd };
    });
    setFundingStats(fStats.sort((a, b) => b.utilisation - a.utilisation));

    // Compliance issues
    const now = Date.now();
    const soon = now + 90 * 86400000;
    const issues: ComplianceStat[] = [];
    (complianceRes.data ?? []).forEach((w) => {
      const checks = [
        { label: "Police check", date: w.police_check_expiry },
        { label: "NDIS screening", date: w.ndis_worker_screening_expiry },
        { label: "First aid", date: w.first_aid_expiry },
        { label: "CPR", date: w.cpr_expiry },
        { label: "Driver licence", date: w.drivers_licence_expiry }
      ];
      checks.forEach(({ label, date }) => {
        if (!date) { issues.push({ workerName: String(w.name ?? ""), workerEmail: String(w.email ?? ""), issue: label, status: "missing", dueDate: "" }); return; }
        const ts = new Date(String(date)).getTime();
        if (ts < now) issues.push({ workerName: String(w.name ?? ""), workerEmail: String(w.email ?? ""), issue: label, status: "expired", dueDate: String(date) });
        else if (ts < soon) issues.push({ workerName: String(w.name ?? ""), workerEmail: String(w.email ?? ""), issue: label, status: "due_soon", dueDate: String(date) });
      });
    });
    setComplianceStats(issues.sort((a, b) => (a.status === "expired" ? -1 : b.status === "expired" ? 1 : 0)));

    setNotice("");
  }, []);

  useEffect(() => { void load(); }, [load]);

  function exportCsv() {
    if (tab === "workers") {
      const rows = [["Name", "Email", "Shifts", "Completed", "Scheduled Hours", "Delivered Hours", "Attendance %"], ...workerStats.map((w) => [w.name, w.email, w.totalShifts, w.completedShifts, w.scheduledHours, w.deliveredHours, w.attendanceRate])];
      downloadCsv("worker-utilisation.csv", rows);
    } else if (tab === "funding") {
      const rows = [["Participant", "Plan Budget", "Spent", "Remaining", "Utilisation %", "Plan End"], ...fundingStats.map((f) => [f.participantName, f.planBudget, f.spent, f.remaining, f.utilisation, f.planEnd])];
      downloadCsv("funding-utilisation.csv", rows);
    } else {
      const rows = [["Worker", "Email", "Issue", "Status", "Due Date"], ...complianceStats.map((c) => [c.workerName, c.workerEmail, c.issue, c.status, c.dueDate])];
      downloadCsv("compliance-issues.csv", rows);
    }
  }

  return (
    <AppShell title="Reports" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active workers", value: String(totals.workers), icon: Users, tone: "bg-gumleaf/10 text-gumleaf" },
          { label: "Total hours delivered", value: `${totals.totalHours}h`, icon: Clock, tone: "bg-harbour/10 text-harbour" },
          { label: "Avg attendance rate", value: `${totals.avgAttendance}%`, icon: TrendingUp, tone: "bg-gumleaf/10 text-gumleaf" },
          { label: "Compliance issues", value: String(totals.complianceIssues), icon: ShieldCheck, tone: totals.complianceIssues > 0 ? "bg-coral/10 text-coral" : "bg-gumleaf/10 text-gumleaf" }
        ].map((stat) => (
          <section key={stat.label} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <span className={`rounded p-2 ${stat.tone}`}><stat.icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-ink">{stat.value}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex gap-1">
            {([["workers", "Worker Utilisation", Users], ["funding", "Funding Summary", WalletCards], ["compliance", "Compliance Issues", ShieldCheck]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition ${tab === key ? "bg-gumleaf/10 text-gumleaf" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {tab === "workers" && (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Shifts</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Sched. Hours</th>
                  <th className="px-4 py-3">Del. Hours</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerStats.length ? workerStats.map((w) => (
                  <tr key={w.email} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-ink">{w.name}</p><p className="text-xs text-slate-500">{w.email}</p></td>
                    <td className="px-4 py-3 text-slate-700">{w.totalShifts}</td>
                    <td className="px-4 py-3 text-slate-700">{w.completedShifts}</td>
                    <td className="px-4 py-3 text-slate-700">{w.scheduledHours}h</td>
                    <td className="px-4 py-3 text-slate-700">{w.deliveredHours}h</td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${w.attendanceRate >= 90 ? "bg-gumleaf/10 text-gumleaf" : w.attendanceRate >= 70 ? "bg-banksia/20 text-banksia" : "bg-coral/10 text-coral"}`}>{w.attendanceRate}%</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${w.scheduledHours > 0 && w.deliveredHours / w.scheduledHours >= 0.9 ? "bg-gumleaf" : "bg-harbour"}`} style={{ width: `${w.scheduledHours > 0 ? Math.min(100, Math.round((w.deliveredHours / w.scheduledHours) * 100)) : 0}%` }} /></div>
                        <span className="text-xs text-slate-500">{w.scheduledHours > 0 ? Math.min(100, Math.round((w.deliveredHours / w.scheduledHours) * 100)) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No worker data available.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "funding" && (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Plan Budget</th>
                  <th className="px-4 py-3">Spent</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Plan End</th>
                  <th className="px-4 py-3">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fundingStats.length ? fundingStats.map((f) => {
                  const daysLeft = f.planEnd ? Math.ceil((new Date(f.planEnd).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={f.participantName} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-ink">{f.participantName}</td>
                      <td className="px-4 py-3 text-slate-700">{curr(f.planBudget)}</td>
                      <td className="px-4 py-3 text-slate-700">{curr(f.spent)}</td>
                      <td className="px-4 py-3 text-slate-700">{curr(f.remaining)}</td>
                      <td className="px-4 py-3">
                        {f.planEnd ? <div className="flex flex-col gap-1"><span className="text-slate-700">{fmtDate(f.planEnd)}</span>{daysLeft !== null && daysLeft <= 90 ? <span className={`w-fit rounded px-1.5 py-0.5 text-xs font-semibold ${daysLeft < 0 ? "bg-coral/10 text-coral" : daysLeft <= 30 ? "bg-coral/10 text-coral" : "bg-banksia/20 text-banksia"}`}>{daysLeft < 0 ? "Expired" : `${daysLeft}d left`}</span> : null}</div> : <span className="text-slate-400">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${f.utilisation >= 90 ? "bg-coral" : f.utilisation >= 70 ? "bg-banksia" : "bg-gumleaf"}`} style={{ width: `${Math.min(100, f.utilisation)}%` }} /></div>
                          <span className={`text-xs font-semibold ${f.utilisation >= 90 ? "text-coral" : f.utilisation >= 70 ? "text-banksia" : "text-slate-600"}`}>{f.utilisation}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No funding data available.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "compliance" && (
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Compliance Item</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due / Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complianceStats.length ? complianceStats.map((c, i) => (
                  <tr key={`${c.workerEmail}-${c.issue}-${i}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-ink">{c.workerName}</p><p className="text-xs text-slate-500">{c.workerEmail}</p></td>
                    <td className="px-4 py-3 text-slate-700">{c.issue}</td>
                    <td className="px-4 py-3"><span className={`rounded px-2.5 py-1 text-xs font-semibold ${c.status === "expired" ? "bg-coral/10 text-coral" : c.status === "missing" ? "bg-slate-200 text-slate-600" : "bg-banksia/20 text-banksia"}`}>{c.status === "due_soon" ? "Due soon" : c.status}</span></td>
                    <td className="px-4 py-3 text-slate-700">{c.dueDate ? fmtDate(c.dueDate) : "—"}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gumleaf">No compliance issues found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Reports reflect all-time records. Worker utilisation counts only active (non-cancelled) shifts. Compliance checks police check, NDIS screening, first aid, CPR, and driver licence fields.
      </div>
    </AppShell>
  );
}

function calcHours(start: string, end: string) {
  if (!start || !end) return 0;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  return diff > 0 ? diff : 0;
}

function curr(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
}

function fmtDate(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: (string | number | (string | number)[])[]) {
  const csv = rows.map((row) => (Array.isArray(row) ? row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") : String(row))).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
