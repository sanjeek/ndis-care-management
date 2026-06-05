"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Database, Globe, KeyRound, Palette, RefreshCw, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type SettingRecord = {
  id: string;
  setting_category: string;
  setting_key: string;
  setting_value: string;
  details: string;
  status: string;
  is_sensitive: boolean;
  updated_by_email: string;
  updated_at: string;
};

const settingAreas = [
  { category: "Organisation Settings", key: "provider_profile", title: "Organisation profile", detail: "Provider name, ABN, NDIS registration notes, head office, and contact information.", icon: Building2 },
  { category: "Organisation Branding", key: "brand_theme", title: "White label branding", detail: "Logo, colour preference, footer wording, and portal display name.", icon: Palette },
  { category: "Domain Administration", key: "custom_domain", title: "Custom domain", detail: "Track requested custom domains, DNS owner, SSL status, and go-live notes.", icon: Globe },
  { category: "Environment Configuration", key: "environment_health", title: "Environment configuration", detail: "Supabase URL, Vercel deployment, cron status, backup bucket, and integration keys status.", icon: KeyRound },
  { category: "Subscription Billing", key: "subscription_status", title: "Subscription billing", detail: "Plan status, billing contact, renewal notes, and paid feature readiness.", icon: WalletCards },
  { category: "Provider Onboarding", key: "onboarding_checklist", title: "Provider onboarding", detail: "Implementation checklist for branches, users, participants, RLS, and documents.", icon: CheckCircle2 },
  { category: "Data Import", key: "import_plan", title: "Data import", detail: "CSV import plan for participants, workers, shifts, invoices, and documents.", icon: Database },
  { category: "Integrations", key: "xero_google_sms", title: "Xero, Google Calendar, and SMS", detail: "Record connection status and required credentials before enabling external integrations.", icon: Smartphone },
  { category: "Security Review", key: "security_review", title: "Security review", detail: "Access control, RLS, audit logs, document privacy, backup, and incident workflow checks.", icon: ShieldCheck },
  { category: "Production Readiness", key: "production_readiness", title: "Production readiness", detail: "Performance, disaster recovery, release checklist, support process, and compliance sign-off.", icon: RefreshCw }
];

export function SettingsConsolePage() {
  const [records, setRecords] = useState<SettingRecord[]>([]);
  const [notice, setNotice] = useState("Loading organisation settings.");
  const [selectedArea, setSelectedArea] = useState(settingAreas[0]);
  const [canManage, setCanManage] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening settings.");
      return;
    }
    const response = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Could not load settings." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setRecords(result.records ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice((result.records ?? []).length ? "Organisation settings loaded from Supabase." : "No organisation settings saved yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentRecord = useMemo(() => {
    return records.find((record) => record.setting_category === selectedArea.category && record.setting_key === selectedArea.key);
  }, [records, selectedArea]);

  const stats = useMemo(() => {
    const active = records.filter((record) => record.status === "active").length;
    const planned = records.filter((record) => ["planned", "coming_soon"].includes(record.status)).length;
    const sensitive = records.filter((record) => record.is_sensitive).length;
    return [
      { label: "Settings", value: String(records.length) },
      { label: "Active", value: String(active) },
      { label: "Planned", value: String(planned) },
      { label: "Sensitive", value: String(sensitive) }
    ];
  }, [records]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || !supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving settings.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        setting_category: selectedArea.category,
        setting_key: selectedArea.key,
        setting_value: String(form.get("settingValue") ?? ""),
        details: String(form.get("details") ?? ""),
        status: String(form.get("status") ?? "active"),
        is_sensitive: form.get("isSensitive") === "on"
      })
    });
    const result = await response.json().catch(() => ({ message: "Could not save setting." }));
    setNotice(result.message);
    if (response.ok) await refresh();
  }

  return (
    <AppShell title="Settings" eyebrow={notice}>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <section key={stat.label} className="rounded-lg border border-indigo-100 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{stat.value}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-indigo-100 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Configuration areas</h2>
              <p className="mt-1 text-sm text-slate-500">Select an area, update the status, and record operational notes.</p>
            </div>
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-indigo-100 p-2 text-gumleaf hover:bg-indigo-50" aria-label="Refresh settings">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            {settingAreas.map((area) => {
              const Icon = area.icon;
              const record = records.find((item) => item.setting_category === area.category && item.setting_key === area.key);
              const active = selectedArea.key === area.key;
              return (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => setSelectedArea(area)}
                  className={`rounded-lg border p-4 text-left transition ${active ? "border-indigo-200 bg-indigo-50/70" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-white p-2 text-gumleaf ring-1 ring-indigo-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{area.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">{area.detail}</span>
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{record?.status ?? "not saved"}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-indigo-100 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <h2 className="font-semibold text-ink">{selectedArea.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{selectedArea.detail}</p>
          <form key={selectedArea.key} onSubmit={submit} className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Setting value</span>
              <input
                name="settingValue"
                required
                defaultValue={currentRecord?.setting_value ?? ""}
                placeholder="Current value, target state, or configuration status"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Details</span>
              <textarea
                name="details"
                rows={6}
                required
                defaultValue={currentRecord?.details ?? ""}
                placeholder="Record owner, notes, evidence, credentials status, risk, next action, and review date."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select name="status" required defaultValue={currentRecord?.status ?? "planned"} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="coming_soon">Coming soon</option>
                  <option value="disabled">Disabled</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                <input name="isSensitive" type="checkbox" defaultChecked={Boolean(currentRecord?.is_sensitive)} className="h-4 w-4 rounded border-slate-300 text-gumleaf focus:ring-gumleaf" />
                Sensitive setting
              </label>
            </div>
            <button disabled={!canManage} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:opacity-50">
              Save setting
            </button>
            {!canManage ? <p className="text-sm text-slate-500">Team leaders can review settings. Admin access is required to update them.</p> : null}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
