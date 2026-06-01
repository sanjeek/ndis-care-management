"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type AuditLog = {
  id: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  record_label: string | null;
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("Loading audit trail from Supabase.");

  useEffect(() => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    supabase
      .from("audit_logs")
      .select("id, created_at, user_email, user_name, user_role, action, table_name, record_id, record_label")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        setLogs(data ?? []);
        setMessage(data?.length ? "Showing the latest 100 audit events." : "No audit events recorded yet.");
      });
  }, []);

  return (
    <AppShell title="Audit Logs" eyebrow={message}>
      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-ink">Security audit trail</h2>
          <p className="mt-1 text-sm text-slate-500">Login, logout, create, update, incident, participant, and invoice actions are recorded here.</p>
        </div>
        {logs.length ? (
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Affected record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-4 font-medium text-ink">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <p className="font-medium text-ink">{log.user_name || log.user_email || "Unknown user"}</p>
                      <p className="text-xs text-slate-500">{log.user_email}</p>
                      <p className="mt-1 inline-flex rounded bg-gumleaf/10 px-2 py-0.5 text-xs font-semibold text-gumleaf">{log.user_role || "role unknown"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{log.action}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <p className="font-medium text-ink">{log.record_label || log.record_id || "Record not labelled"}</p>
                      <p className="text-xs text-slate-500">{log.table_name || "No table"} {log.record_id ? `| ${log.record_id}` : ""}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-600">Audit events will appear here after users perform tracked actions.</div>
        )}
      </section>
    </AppShell>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
