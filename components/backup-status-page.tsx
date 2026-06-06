"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, HardDrive, Mail, PlayCircle, RefreshCw, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type BackupLog = {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  file_name: string | null;
  size_bytes: number | null;
  table_counts: Record<string, number> | null;
  started_by: string | null;
  error_message: string | null;
};

type RestorePlan = {
  backupId: string;
  fileName: string | null;
  schemaVersion: number | null;
  tableCounts: Record<string, number>;
  restoreOrder: string[];
  procedure: string[];
};

export function BackupStatusPage() {
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [message, setMessage] = useState("Loading backup status.");
  const [loading, setLoading] = useState(false);
  const [restorePlan, setRestorePlan] = useState<RestorePlan | null>(null);
  const [setupMsg, setSetupMsg] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`
    };
  }, []);

  const loadBackups = useCallback(async () => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/admin/backups", {
      headers: await authHeaders()
    });
    const result = await response.json().catch(() => ({ message: "Could not load backups." }));
    setLoading(false);
    if (!response.ok) {
      setMessage(result.message);
      return;
    }
    setBackups(result.backups ?? []);
    setMessage(result.backups?.length ? "Showing latest database backup runs." : "No database backups have run yet.");
  }, [authHeaders]);

  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  async function setupStorage() {
    setSetupLoading(true);
    setSetupMsg(null);
    const response = await fetch("/api/admin/setup-storage", {
      method: "POST",
      headers: await authHeaders()
    });
    const result = await response.json().catch(() => ({ message: "Setup failed." }));
    setSetupLoading(false);
    setSetupMsg(result.message);
    if (response.ok) await loadBackups();
  }

  async function runBackup() {
    setLoading(true);
    setMessage("Running database backup. This can take a moment.");
    const response = await fetch("/api/admin/backups/run", {
      method: "POST",
      headers: await authHeaders()
    });
    const result = await response.json().catch(() => ({ message: "Backup failed." }));
    setLoading(false);
    setMessage(result.message);
    await loadBackups();
  }

  async function downloadBackup(id: string) {
    const response = await fetch(`/api/admin/backups/${id}/download`, {
      headers: await authHeaders()
    });
    const result = await response.json().catch(() => ({ message: "Could not create download link." }));
    if (!response.ok || !result.url) {
      setMessage(result.message);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function loadRestorePlan(id: string) {
    setRestorePlan(null);
    const response = await fetch(`/api/admin/backups/${id}/restore-plan`, {
      headers: await authHeaders()
    });
    const result = await response.json().catch(() => ({ message: "Could not load restore plan." }));
    if (!response.ok) {
      setMessage(result.message);
      return;
    }
    setRestorePlan(result);
    setMessage("Restore plan validated for selected backup.");
  }

  const latest = backups[0];

  return (
    <AppShell title="Database Backups" eyebrow={message}>
      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard label="Latest status" value={latest?.status ?? "No backup"} detail={latest?.completed_at ? formatDate(latest.completed_at) : "No completed backup yet"} good={latest?.status === "completed"} />
        <StatusCard label="Latest size" value={latest?.size_bytes ? formatBytes(latest.size_bytes) : "0 KB"} detail={latest?.file_name ?? "No backup file"} good={Boolean(latest?.size_bytes)} />
        <StatusCard label="Automation" value="Daily" detail="Vercel cron calls the backup endpoint once per day." good />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-gumleaf" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink text-sm">Storage bucket setup</p>
            <p className="mt-0.5 text-xs text-slate-500">Backups require a <code>database-backups</code> bucket in Supabase Storage. Click to create it if backups are failing.</p>
            {setupMsg ? <p className="mt-1 text-xs font-medium text-gumleaf">{setupMsg}</p> : null}
            <button onClick={() => void setupStorage()} disabled={setupLoading} className="mt-2 inline-flex items-center gap-1.5 rounded bg-gumleaf px-3 py-1.5 text-xs font-semibold text-white hover:bg-gumleaf/90 disabled:opacity-60">
              {setupLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
              {setupLoading ? "Creating…" : "Create storage bucket"}
            </button>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-banksia" />
          <div>
            <p className="font-semibold text-ink text-sm">Email notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">Backup failure alerts are sent via Resend. Add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> to Vercel environment variables to enable them.</p>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Backup runs</h2>
            <p className="mt-1 text-sm text-slate-500">Backups are JSON snapshots stored in private Supabase storage. Download links expire after 2 minutes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadBackups} disabled={loading} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={runBackup} disabled={loading} className="inline-flex items-center gap-2 rounded bg-gumleaf px-3 py-2 text-sm font-semibold text-white hover:bg-gumleaf/90 disabled:opacity-60">
              <PlayCircle className="h-4 w-4" />
              Run backup now
            </button>
          </div>
        </div>

        {backups.length ? (
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Tables</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((backup) => (
                  <tr key={backup.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-ink">{formatDate(backup.created_at)}</p>
                      <p className="text-xs text-slate-500">{backup.started_by ?? "unknown"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${backup.status === "completed" ? "bg-gumleaf/10 text-gumleaf" : backup.status === "failed" ? "bg-coral/10 text-coral" : "bg-banksia/20 text-slate-700"}`}>
                        {backup.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : backup.status === "failed" ? <AlertTriangle className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {backup.status}
                      </span>
                      {backup.error_message ? <p className="mt-2 text-xs text-coral">{backup.error_message}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <p className="font-medium text-ink">{backup.file_name ?? "No file"}</p>
                      <p className="text-xs text-slate-500">{backup.size_bytes ? formatBytes(backup.size_bytes) : "No size recorded"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatTableCounts(backup.table_counts)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button disabled={backup.status !== "completed"} onClick={() => void downloadBackup(backup.id)} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        <button disabled={backup.status !== "completed"} onClick={() => void loadRestorePlan(backup.id)} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore plan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-600">Backup history will appear after the first scheduled or manual backup run.</div>
        )}
      </section>

      {restorePlan ? (
        <section className="mt-6 rounded border border-banksia/40 bg-banksia/10 p-5">
          <h2 className="font-semibold text-ink">Restore procedure</h2>
          <p className="mt-1 text-sm text-slate-600">{restorePlan.fileName} validated. Use this procedure before restoring data.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="font-semibold text-ink">Restore order</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {restorePlan.restoreOrder.map((table) => <li key={table}>{table} ({restorePlan.tableCounts[table] ?? 0} rows)</li>)}
              </ol>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="font-semibold text-ink">Procedure</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {restorePlan.procedure.map((step) => <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function StatusCard({ label, value, detail, good }: { label: string; value: string; detail: string; good: boolean }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      <p className={`mt-1 text-sm ${good ? "text-gumleaf" : "text-slate-500"}`}>{detail}</p>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatTableCounts(counts: Record<string, number> | null) {
  if (!counts) return "No table counts";
  return Object.entries(counts).map(([table, count]) => `${table}: ${count}`).join(" | ");
}
