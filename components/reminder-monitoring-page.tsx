"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, ShieldAlert, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ExpiryAlert = {
  workerName: string;
  workerEmail: string;
  documentType: string;
  expiryDate: string;
  days: number;
};

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  recipient_email: string | null;
  created_at: string;
};

const expiryFields = [
  ["Police check", "police_check_expiry"],
  ["NDIS worker screening", "ndis_worker_screening_expiry"],
  ["First aid certificate", "first_aid_expiry"],
  ["CPR", "cpr_expiry"],
  ["Driver's licence", "drivers_licence_expiry"]
] as const;

export function ReminderMonitoringPage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notice, setNotice] = useState("Loading reminder monitoring.");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const [workersResult, notificationsResult] = await Promise.all([
      supabase
        .from("support_workers")
        .select("name, email, police_check_expiry, ndis_worker_screening_expiry, first_aid_expiry, cpr_expiry, drivers_licence_expiry")
        .order("name", { ascending: true }),
      supabase
        .from("app_notifications")
        .select("id, notification_type, title, body, recipient_email, created_at")
        .in("notification_type", ["shift_reminder", "missed_clock_in", "document_expiry", "shift_acceptance"])
        .order("created_at", { ascending: false })
        .limit(25)
    ]);

    const rows = (workersResult.data ?? []).flatMap((worker) =>
      expiryFields
        .map(([documentType, field]) => ({
          workerName: String(worker.name ?? ""),
          workerEmail: String(worker.email ?? ""),
          documentType,
          expiryDate: String(worker[field] ?? ""),
          days: daysUntil(String(worker[field] ?? ""))
        }))
        .filter((item) => item.days !== null && item.days <= 30)
        .map((item) => ({ ...item, days: item.days ?? 0 }))
    );
    rows.sort((a, b) => a.days - b.days || a.workerName.localeCompare(b.workerName));
    setAlerts(rows);
    setNotifications((notificationsResult.data ?? []) as NotificationRow[]);
    setNotice(`${rows.length} compliance expiry alerts. ${notificationsResult.data?.length ?? 0} reminder notifications loaded.`);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runCheck(path: string) {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Sign in again before running reminder checks.");
      return;
    }
    setNotice("Running reminder check.");
    const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Reminder check failed." }));
    setNotice(result.message ?? (response.ok ? "Reminder check complete." : "Reminder check failed."));
    await refresh();
  }

  return (
    <AppShell title="Reminder Monitoring" eyebrow={notice}>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Expiry alerts" value={String(alerts.length)} icon={ShieldAlert} />
        <Metric title="Reminder events" value={String(notifications.length)} icon={Bell} />
        <Metric title="Monitoring window" value="30 days" icon={CalendarClock} />
      </div>

      <section className="mt-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Run reminder checks</h2>
            <p className="mt-1 text-sm text-slate-500">Creates in-app notifications and email logs where configured.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void runCheck("/api/notifications/shifts")} className="rounded bg-[#354aa3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#283a82]">
              Run shift reminders
            </button>
            <button onClick={() => void runCheck("/api/notifications/document-expiry")} className="rounded bg-gumleaf px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d625d]">
              Run expiry alerts
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Document expiry alerts</h2>
          <p className="mt-1 text-sm text-slate-500">Police checks, NDIS screening, first aid, CPR, and driver licence records due within 30 days.</p>
          <div className="mt-4 grid gap-3">
            {alerts.length ? alerts.map((alert) => (
              <article key={`${alert.workerEmail}-${alert.documentType}`} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{alert.workerName}</p>
                    <p className="mt-1 text-slate-600">{alert.documentType} | {alert.expiryDate || "Not recorded"}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${alert.days < 0 ? "bg-coral/10 text-coral" : "bg-banksia/20 text-ink"}`}>
                    {friendlyDays(alert.days)}
                  </span>
                </div>
              </article>
            )) : <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No document expiry alerts due.</p>}
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Recent reminder notifications</h2>
          <p className="mt-1 text-sm text-slate-500">Shift reminders, missed clock-ins, accepted shifts, and document expiry events.</p>
          <div className="mt-4 grid gap-3">
            {notifications.length ? notifications.map((notification) => (
              <article key={notification.id} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{notification.title}</p>
                    <p className="mt-1 text-slate-600">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-500">{notification.recipient_email || "No recipient"} | {dateTime(notification.created_at)}</p>
                  </div>
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">{notification.notification_type}</span>
                </div>
              </article>
            )) : <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No reminder notifications recorded yet.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className="rounded bg-gumleaf/10 p-3 text-gumleaf">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}

function daysUntil(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function friendlyDays(days: number) {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}
