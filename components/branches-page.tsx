"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Clock3, HeartHandshake, ReceiptText, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager_name: string;
  manager_email: string;
  status: string;
};

type PersonRecord = {
  id: string;
  name: string;
  email?: string;
  branch_id: string | null;
};

type BranchReport = {
  branchId: string;
  participantCount: number;
  workerCount: number;
  serviceHours: number;
  openIncidents: number;
  outstandingInvoices: number;
  invoiceTotal: number;
};

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [participants, setParticipants] = useState<PersonRecord[]>([]);
  const [workers, setWorkers] = useState<PersonRecord[]>([]);
  const [reports, setReports] = useState<BranchReport[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const branchOptions = useMemo(() => branches.map((branch) => ({ label: branch.name, value: branch.id })), [branches]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase credentials are not configured.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in to view branches.");
      return;
    }
    const response = await fetch("/api/branches", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Branch records could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setBranches(result.branches ?? []);
    setParticipants(result.participants ?? []);
    setWorkers(result.workers ?? []);
    setReports(result.reports ?? []);
    setCanManage(Boolean(result.canManage));
    setNotice(result.branches?.length ? "" : "No branches created yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit({
      action: "save",
      name: String(form.get("name")),
      address: String(form.get("address")),
      phone: String(form.get("phone")),
      manager_name: String(form.get("managerName")),
      manager_email: String(form.get("managerEmail")),
      status: String(form.get("status"))
    });
    event.currentTarget.reset();
  }

  async function assignBranch(event: FormEvent<HTMLFormElement>, targetType: "participant" | "worker") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit({
      action: "assign",
      target_type: targetType,
      target_id: String(form.get("targetId")),
      branch_id: String(form.get("branchId"))
    });
  }

  async function submit(payload: Record<string, string>) {
    if (!supabase) return;
    setSaving(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving.");
      setSaving(false);
      return;
    }
    const response = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Branch update failed." }));
    setNotice(result.message);
    setSaving(false);
    if (response.ok) await refresh();
  }

  return (
    <AppShell title="Branches" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Branches" value={String(branches.length)} icon={Building2} />
        <Metric title="Participants" value={String(participants.length)} icon={HeartHandshake} />
        <Metric title="Support workers" value={String(workers.length)} icon={Users} />
        <Metric title="Open incidents" value={String(reports.reduce((sum, row) => sum + row.openIncidents, 0))} icon={AlertTriangle} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="space-y-6">
          {canManage ? (
            <Panel title="Create branch" icon={Building2}>
              <form onSubmit={saveBranch} className="grid gap-4">
                <Field name="name" label="Branch name" placeholder="Parramatta office" />
                <Field name="address" label="Address" placeholder="Street address, suburb, state" required={false} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="phone" label="Phone" placeholder="02 0000 0000" required={false} />
                  <Select name="status" label="Status" options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="managerName" label="Manager name" required={false} />
                  <Field name="managerEmail" label="Manager email" type="email" required={false} />
                </div>
                <button disabled={saving} className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:cursor-not-allowed disabled:opacity-60">
                  Save branch
                </button>
              </form>
            </Panel>
          ) : (
            <Panel title="Branch access" icon={Building2}>
              <p className="text-sm leading-6 text-slate-600">Team leaders can view branch reporting. Only admin users can create branches or assign records.</p>
            </Panel>
          )}

          {canManage ? (
            <Panel title="Assign records" icon={Users}>
              <div className="grid gap-5">
                <AssignForm title="Assign participant" records={participants} branches={branchOptions} saving={saving} onSubmit={(event) => assignBranch(event, "participant")} />
                <AssignForm title="Assign support worker" records={workers} branches={branchOptions} saving={saving} onSubmit={(event) => assignBranch(event, "worker")} />
              </div>
            </Panel>
          ) : null}
        </section>

        <section className="space-y-6">
          <Panel title="Branch reporting" icon={ReceiptText}>
            {branches.length ? (
              <div className="grid gap-4">
                {branches.map((branch) => {
                  const report = reports.find((item) => item.branchId === branch.id);
                  return (
                    <article key={branch.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-ink">{branch.name}</h3>
                          <p className="mt-1 text-sm text-slate-600">{branch.address || "Address not recorded"}</p>
                          <p className="mt-1 text-xs text-slate-500">{branch.manager_name || "No manager"} {branch.manager_email ? `| ${branch.manager_email}` : ""}</p>
                        </div>
                        <span className="rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf">{branch.status}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Info label="Participants" value={String(report?.participantCount ?? 0)} />
                        <Info label="Workers" value={String(report?.workerCount ?? 0)} />
                        <Info label="Service hours" value={String(report?.serviceHours ?? 0)} />
                        <Info label="Open incidents" value={String(report?.openIncidents ?? 0)} />
                        <Info label="Outstanding invoices" value={String(report?.outstandingInvoices ?? 0)} />
                        <Info label="Invoice total" value={currency(report?.invoiceTotal ?? 0)} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty title="No branches" message="Create office branches to separate staff, participants, and reporting." />
            )}
          </Panel>

          <Panel title="Unassigned records" icon={Clock3}>
            <div className="grid gap-4 md:grid-cols-2">
              <RecordList title="Participants" records={participants.filter((record) => !record.branch_id)} />
              <RecordList title="Support workers" records={workers.filter((record) => !record.branch_id)} />
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function AssignForm({ title, records, branches, saving, onSubmit }: { title: string; records: PersonRecord[]; branches: Array<{ label: string; value: string }>; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="rounded border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Select name="targetId" label="Record" options={records.map((record) => ({ label: record.email ? `${record.name} (${record.email})` : record.name, value: record.id }))} />
        <Select name="branchId" label="Branch" required={false} options={[{ label: "Unassigned", value: "" }, ...branches]} />
        <button disabled={saving || !records.length} className="self-end rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          Assign
        </button>
      </div>
    </form>
  );
}

function RecordList({ title, records }: { title: string; records: PersonRecord[] }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {records.length ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {records.slice(0, 8).map((record) => (
            <li key={record.id}>{record.name}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No unassigned records.</p>
      )}
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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

function Field({ name, label, defaultValue = "", placeholder = "", type = "text", required = true }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, required = true }: { name: string; label: string; options: Array<{ label: string; value: string }>; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required={required} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {options.map((option) => (
          <option key={`${name}-${option.value || "none"}`} value={option.value}>{option.label}</option>
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
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value || 0);
}
