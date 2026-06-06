"use client";

import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

const controls = [
  { area: "Participant data privacy", status: "Implemented", detail: "Private routes require Supabase sessions; support workers only read participants linked to their assigned shifts through route checks and RLS." },
  { area: "Role-based access control", status: "Implemented", detail: "Admin, team leader, and support worker roles have separate navigation and route permissions. Restricted access redirects to /unauthorised." },
  { area: "Database-level security", status: "Implemented", detail: "RLS is enabled and forced on operational tables; support worker policies are scoped by login email and assigned participant." },
  { area: "Audit logging", status: "Implemented", detail: "Login, logout, create, update, incidents, document access, shift workflow, backups, and restore-plan checks are recorded in audit_logs." },
  { area: "Document security", status: "Implemented", detail: "Documents and incident attachments are stored in private buckets and opened through short-lived, permission-checked signed URLs." },
  { area: "Incident management", status: "Implemented", detail: "Incident records capture severity, participant, staff, evidence, investigation notes, reportable incident type, notification due date, immediate support, involvement, guardian notification, and corrective actions." },
  { area: "Backups and restore procedure", status: "Implemented", detail: "Daily backup cron, private backup storage, backup status monitoring, secure downloads, and restore-plan validation are available to admin users only." },
  { area: "Provider procedures", status: "Organisation action required", detail: "The app supports records and controls, but the provider must maintain documented policies, worker training, reportable incident decisions, consent/access processes, and NDIS Commission notification outside the software." }
];

export function ComplianceReviewPage() {
  const [expiryResult, setExpiryResult] = useState("");
  const [expiryBusy, setExpiryBusy] = useState(false);

  async function runExpiryCheck() {
    if (!supabase) { setExpiryResult("Supabase is not connected."); return; }
    setExpiryBusy(true);
    setExpiryResult("Running check...");
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setExpiryBusy(false); setExpiryResult("Please sign in again."); return; }
    const res = await fetch("/api/notifications/document-expiry", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({ message: "Check failed." }));
    setExpiryBusy(false);
    setExpiryResult(String(data.message ?? "Check complete.") + (data.alerts ? ` ${data.alerts} items checked, ${data.notificationsCreated ?? 0} new notifications sent.` : ""));
  }

  function exportCsv() {
    const rows = [["Control Area", "Status", "Detail"], ...controls.map((c) => [c.area, c.status, c.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ndis-compliance-controls.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="NDIS Compliance Review" eyebrow="Operational controls for privacy, access, audit, documents, incidents, and backups.">
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Access control" value="Role based" icon={ShieldCheck} />
        <SummaryCard label="Documents" value="Private" icon={LockKeyhole} />
        <SummaryCard label="Audit trail" value="Enabled" icon={FileText} />
        <SummaryCard label="Actions required" value="Provider policy" icon={AlertTriangle} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Document expiry check</h2>
          <p className="mt-1 text-xs text-slate-500">Scans all support worker compliance documents expiring within 30 days and sends in-app notifications to admins.</p>
          <button onClick={() => void runExpiryCheck()} disabled={expiryBusy} className="mt-3 inline-flex items-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:opacity-60">
            <Bell className="h-4 w-4" />
            {expiryBusy ? "Checking..." : "Run expiry check"}
          </button>
          {expiryResult ? <p className="mt-2 text-xs text-slate-600">{expiryResult}</p> : null}
        </div>
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Export compliance controls</h2>
          <p className="mt-1 text-xs text-slate-500">Download the NDIS compliance control register as a CSV for audit records and external reporting.</p>
          <button onClick={exportCsv} className="mt-3 inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export controls CSV
          </button>
        </div>
      </div>

      <section className="mt-4 rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-ink">Compliance control review</h2>
          <p className="mt-1 text-sm text-slate-500">This page is an operational review aid, not legal certification. Keep provider policies and NDIS Commission reporting processes current.</p>
        </div>
        <div className="grid gap-3 p-4">
          {controls.map((control) => (
            <article key={control.area} className="rounded border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{control.area}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{control.detail}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${control.status === "Implemented" ? "bg-gumleaf/10 text-gumleaf" : "bg-banksia/20 text-slate-700"}`}>
                  {control.status === "Implemented" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {control.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="h-5 w-5 text-gumleaf" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </section>
  );
}
