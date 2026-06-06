"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, ReceiptText, Route, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { isAdminRole, roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  participantName: string;
  ndisNumber: string;
  planType: string;
  fundingCategory: string;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  serviceAmount: number;
  travelAmount: number;
  createdAt: string;
};

type InvoiceItem = {
  id: string;
  invoiceId: string;
  participantName: string;
  workerName: string;
  serviceDate: string;
  description: string;
  ndisLineItem: string;
  fundingCategory: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: string;
};

const fundingCategories = [
  "Core - Assistance with Daily Life",
  "Core - Social and Community Participation",
  "Core - Transport",
  "Capacity Building - Improved Daily Living",
  "Capacity Building - Support Coordination",
  "Capital - Assistive Technology"
];

export function InvoiceManagementPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notice, setNotice] = useState("");

  const canManage = isAdminRole(role);
  const totals = useMemo(() => ({
    invoices: invoices.length,
    total: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    service: invoices.reduce((sum, invoice) => sum + invoice.serviceAmount, 0),
    travel: invoices.reduce((sum, invoice) => sum + invoice.travelAmount, 0)
  }), [invoices]);

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
    const [invoiceRows, itemRows] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("invoice_items").select("*").order("created_at", { ascending: false }).limit(200)
    ]);
    setRole(resolvedRole);
    setInvoices((invoiceRows.data ?? []).map(mapInvoice));
    setItems((itemRows.data ?? []).map(mapInvoiceItem));
    setNotice(invoiceRows.data?.length ? "" : "No generated invoices yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before generating invoices.");
      return;
    }
    const response = await fetch("/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ndis_line_item: String(form.get("ndisLineItem")),
        travel_line_item: String(form.get("travelLineItem")),
        funding_category: String(form.get("fundingCategory")),
        hourly_rate: String(form.get("hourlyRate")),
        travel_km: String(form.get("travelKm")),
        travel_rate: String(form.get("travelRate")),
        due_days: String(form.get("dueDays")),
        issue_date: String(form.get("issueDate"))
      })
    });
    const result = await response.json().catch(() => ({ message: "Invoices could not be generated." }));
    setNotice(result.message);
    if (response.ok) await refresh();
  }

  return (
    <AppShell title="Invoices" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Invoices" value={String(totals.invoices)} icon={ReceiptText} />
        <Metric title="Total" value={currency(totals.total)} icon={WalletCards} />
        <Metric title="Services" value={currency(totals.service)} icon={ClipboardPlus} />
        <Metric title="Travel" value={currency(totals.travel)} icon={Route} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        {canManage ? (
          <Panel title="Generate from approved shifts" icon={ReceiptText}>
            <form onSubmit={generate} className="grid gap-4">
              <Field name="ndisLineItem" label="NDIS line item" defaultValue="01_011_0107_1_1" />
              <Field name="travelLineItem" label="Travel NDIS line item" defaultValue="01_799_0107_1_1" />
              <Select name="fundingCategory" label="Participant funding category" options={fundingCategories} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="hourlyRate" label="Hourly service rate" type="number" min="0" step="0.01" defaultValue="67.56" />
                <Field name="dueDays" label="Due days" type="number" min="0" step="1" defaultValue="14" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="travelKm" label="Travel km per shift" type="number" min="0" step="0.1" defaultValue="0" />
                <Field name="travelRate" label="Travel rate per km" type="number" min="0" step="0.01" defaultValue="1.00" />
              </div>
              <Field name="issueDate" label="Issue date" type="date" required={false} />
              <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                The generator uses approved shifts only, skips shifts already linked to an invoice item, and uses participant funding records when available.
              </p>
              <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">Generate invoices</button>
            </form>
          </Panel>
        ) : (
          <Panel title="Read-only invoices" icon={ReceiptText}>
            <p className="text-sm leading-6 text-slate-600">Team leaders can review invoices. Only admin users can generate invoices from approved shifts.</p>
          </Panel>
        )}

        <section className="space-y-6">
          <Panel title="Generated invoices" icon={WalletCards}>
            {invoices.length ? (
              <div className="grid gap-4">
                {invoices.map((invoice) => (
                  <article key={invoice.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{invoice.invoiceNumber}</h3>
                        <p className="mt-1 text-sm text-slate-600">{invoice.participantName} | {invoice.fundingCategory || "Funding category not recorded"}</p>
                        <p className="mt-1 text-xs text-slate-500">Issue {invoice.issueDate || "not set"} | Due {invoice.dueDate || "not set"}</p>
                      </div>
                      <span className="rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf">{invoice.status}</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Info label="Service" value={currency(invoice.serviceAmount)} />
                      <Info label="Travel" value={currency(invoice.travelAmount)} />
                      <Info label="Total" value={currency(invoice.totalAmount)} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No invoices generated" message="Approved shift invoices will appear here after generation." />
            )}
          </Panel>

          <Panel title="Invoice line items" icon={ClipboardPlus}>
            {items.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Participant</th>
                      <th className="px-3 py-3">Line item</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Qty</th>
                      <th className="px-3 py-3">Rate</th>
                      <th className="px-3 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-slate-700">{item.serviceDate || "Not recorded"}</td>
                        <td className="px-3 py-3 font-medium text-ink">{item.participantName}</td>
                        <td className="px-3 py-3 text-slate-700">{item.ndisLineItem}</td>
                        <td className="px-3 py-3 text-slate-700">{item.itemType}</td>
                        <td className="px-3 py-3 text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-3 text-slate-700">{currency(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-slate-700">{currency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No invoice items" message="Invoice line items will appear after generation." />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function mapInvoice(row: Record<string, unknown>): InvoiceRecord {
  return {
    id: String(row.id ?? ""),
    invoiceNumber: String(row.invoice_number ?? ""),
    participantName: String(row.participant_name ?? ""),
    ndisNumber: String(row.ndis_number ?? ""),
    planType: String(row.plan_type ?? ""),
    fundingCategory: String(row.funding_category ?? ""),
    issueDate: String(row.issue_date ?? ""),
    dueDate: String(row.due_date ?? ""),
    status: String(row.status ?? "draft"),
    totalAmount: Number(row.total_amount ?? 0),
    serviceAmount: Number(row.service_amount ?? 0),
    travelAmount: Number(row.travel_amount ?? 0),
    createdAt: String(row.created_at ?? "")
  };
}

function mapInvoiceItem(row: Record<string, unknown>): InvoiceItem {
  return {
    id: String(row.id ?? ""),
    invoiceId: String(row.invoice_id ?? ""),
    participantName: String(row.participant_name ?? ""),
    workerName: String(row.worker_name ?? ""),
    serviceDate: String(row.service_date ?? ""),
    description: String(row.description ?? ""),
    ndisLineItem: String(row.ndis_line_item ?? ""),
    fundingCategory: String(row.funding_category ?? ""),
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    amount: Number(row.amount ?? 0),
    itemType: String(row.item_type ?? "service")
  };
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof ReceiptText }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof ReceiptText; children: React.ReactNode }) {
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

function Field({ name, label, defaultValue = "", placeholder = "", type = "text", required = true, min, step }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean; min?: string; step?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} min={min} step={step} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
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
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value || 0);
}
