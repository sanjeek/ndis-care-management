"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, Download, FileSignature, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { isAdminRole, roleForUser, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ParticipantOption = {
  name: string;
  ndisNumber: string;
};

type ServiceAgreement = {
  id: string;
  agreementGroupId: string;
  participantName: string;
  ndisNumber: string;
  title: string;
  versionNumber: number;
  status: string;
  startDate: string;
  endDate: string;
  renewalReminderAt: string;
  supportCategories: string;
  fundingSummary: string;
  terms: string;
  participantSignature: string;
  participantSignedAt: string;
  signedByName: string;
  pdfGeneratedAt: string;
  createdAt: string;
};

const supportCategories = [
  "Core supports",
  "Capacity building",
  "Capital supports",
  "Support coordination",
  "Personal care",
  "Community access",
  "Transport",
  "Domestic assistance"
];

export function ServiceAgreementsPage() {
  const [role, setRole] = useState<UserRole>("support_worker");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [signingAgreement, setSigningAgreement] = useState<ServiceAgreement | null>(null);
  const [notice, setNotice] = useState("");

  const canManage = isAdminRole(role);
  const renewalDue = useMemo(() => agreements.filter(isRenewalDue), [agreements]);
  const signed = agreements.filter((agreement) => agreement.status === "signed").length;

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

    const [participantRows, agreementRows] = await Promise.all([
      supabase.from("participants").select("name, ndis_number").order("name", { ascending: true }),
      supabase.from("service_agreements").select("*").order("created_at", { ascending: false })
    ]);

    setRole(resolvedRole);
    setParticipants((participantRows.data ?? []).map((participant) => ({
      name: String(participant.name ?? ""),
      ndisNumber: String(participant.ndis_number ?? "")
    })).filter((participant) => participant.name));
    setAgreements((agreementRows.data ?? []).map(mapAgreement));
    setNotice(agreementRows.data?.length ? "" : "No service agreements yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const participant = participants.find((item) => item.name === String(form.get("participant")));
    const ok = await postAgreement({
      action: "create",
      participant_name: String(form.get("participant")),
      ndis_number: participant?.ndisNumber || String(form.get("ndisNumber")),
      title: String(form.get("title")),
      status: String(form.get("status")),
      start_date: String(form.get("startDate")),
      end_date: String(form.get("endDate")),
      renewal_reminder_at: String(form.get("renewalReminderAt")),
      support_categories: String(form.get("supportCategories")),
      funding_summary: String(form.get("fundingSummary")),
      terms: String(form.get("terms"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function submitSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signingAgreement) return;
    const form = new FormData(event.currentTarget);
    const ok = await postAgreement({
      action: "sign",
      id: signingAgreement.id,
      participant_signature: String(form.get("participantSignature")),
      signed_by_name: String(form.get("signedByName"))
    });
    if (ok) {
      setSigningAgreement(null);
      await refresh();
    }
  }

  async function createVersion(agreement: ServiceAgreement) {
    const ok = await postAgreement({
      action: "version",
      source_id: agreement.id,
      title: agreement.title,
      start_date: agreement.startDate,
      end_date: agreement.endDate,
      renewal_reminder_at: agreement.renewalReminderAt,
      support_categories: agreement.supportCategories,
      funding_summary: agreement.fundingSummary,
      terms: agreement.terms
    });
    if (ok) await refresh();
  }

  async function downloadPdf(agreement: ServiceAgreement) {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before downloading the agreement PDF.");
      return;
    }
    const response = await fetch(`/api/service-agreements/${agreement.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ message: "PDF could not be generated." }));
      setNotice(result.message);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${agreement.participantName}-${agreement.title}-v${agreement.versionNumber}.pdf`.replace(/[^a-z0-9.-]+/gi, "-");
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Agreement PDF generated and downloaded.");
  }

  async function postAgreement(payload: Record<string, string>) {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return false;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving service agreements.");
      return false;
    }
    const response = await fetch("/api/service-agreements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Service agreement could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Service Agreements" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Agreements" value={String(agreements.length)} icon={FileSignature} />
        <Metric title="Signed" value={String(signed)} icon={ShieldCheck} />
        <Metric title="Renewal reminders" value={String(renewalDue.length)} icon={RefreshCw} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        {canManage ? (
          <Panel title="Create agreement" icon={ClipboardPlus}>
            <form onSubmit={submitAgreement} className="grid gap-4">
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              <Field name="ndisNumber" label="NDIS number" placeholder="Auto-filled if participant has one" required={false} />
              <Field name="title" label="Agreement title" placeholder="NDIS service agreement" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="startDate" label="Start date" type="date" required={false} />
                <Field name="endDate" label="End date" type="date" required={false} />
              </div>
              <Field name="renewalReminderAt" label="Renewal reminder date" type="date" required={false} />
              <Select name="status" label="Status" options={["draft", "active", "signed", "renewal_due", "closed"]} />
              <MultiSelectText name="supportCategories" label="Support categories" options={supportCategories} />
              <Area name="fundingSummary" label="Funding summary" placeholder="Budget categories, service booking references, plan manager, and claim conditions." required={false} />
              <Area name="terms" label="Agreement terms" placeholder="Services, responsibilities, cancellation notice, feedback, complaints, privacy, fees, and exit arrangements." />
              <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">Save agreement</button>
            </form>
          </Panel>
        ) : (
          <Panel title="Read-only agreements" icon={FileSignature}>
            <p className="text-sm leading-6 text-slate-600">Team leaders can view agreements and download PDFs. Only admin users can create versions or capture signatures.</p>
          </Panel>
        )}

        <section className="space-y-6">
          <Panel title="Renewal reminders" icon={RefreshCw}>
            {renewalDue.length ? (
              <div className="grid gap-3">
                {renewalDue.map((agreement) => {
                  const refDate = agreement.renewalReminderAt || agreement.endDate;
                  const daysLeft = refDate ? Math.ceil((new Date(`${refDate}T00:00:00`).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <article key={agreement.id} className="rounded border border-coral/20 bg-coral/5 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{agreement.participantName}</p>
                          <p className="mt-1 text-slate-600">{agreement.title} v{agreement.versionNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">End date: {agreement.endDate || "not recorded"}</p>
                        </div>
                        {daysLeft !== null && (
                          <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${daysLeft < 0 ? "bg-coral/20 text-coral" : daysLeft <= 7 ? "bg-coral/10 text-coral" : "bg-banksia/20 text-banksia"}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty title="No renewal reminders due" message="Renewal reminders appear 30 days before the reminder date or agreement end date." />
            )}
          </Panel>

          <Panel title="Agreement register" icon={FileSignature}>
            {agreements.length ? (
              <div className="grid gap-4">
                {agreements.map((agreement) => (
                  <article key={agreement.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{agreement.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{agreement.participantName} | Version {agreement.versionNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">{agreement.startDate || "No start"} to {agreement.endDate || "No end"} | reminder {agreement.renewalReminderAt || "not set"}</p>
                      </div>
                      <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${agreement.status === "signed" ? "bg-gumleaf/10 text-gumleaf" : isRenewalDue(agreement) ? "bg-coral/10 text-coral" : "bg-slate-100 text-slate-700"}`}>
                        {isRenewalDue(agreement) ? "renewal due" : agreement.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <Info label="Signature" value={agreement.participantSignedAt ? `Signed ${dateLabel(agreement.participantSignedAt)}` : "Not signed"} />
                      <Info label="PDF" value={agreement.pdfGeneratedAt ? `Generated ${dateLabel(agreement.pdfGeneratedAt)}` : "Not generated"} />
                      <Info label="Categories" value={agreement.supportCategories || "Not recorded"} />
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{agreement.terms}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void downloadPdf(agreement)} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      {canManage ? (
                        <>
                          <button type="button" onClick={() => setSigningAgreement(agreement)} className="inline-flex items-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/20">
                            <FileSignature className="h-3.5 w-3.5" />
                            Capture signature
                          </button>
                          <button type="button" onClick={() => void createVersion(agreement)} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            <RefreshCw className="h-3.5 w-3.5" />
                            New version
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No service agreements" message="Service agreements will appear here after an admin creates one." />
            )}
          </Panel>
        </section>
      </div>

      {signingAgreement ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 py-4 sm:items-center">
          <div className="w-full max-w-xl rounded bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Participant signature</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{signingAgreement.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{signingAgreement.participantName} | Version {signingAgreement.versionNumber}</p>
              </div>
              <button type="button" onClick={() => setSigningAgreement(null)} className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
            </div>
            <form onSubmit={submitSignature} className="mt-5 grid gap-4">
              <Field name="signedByName" label="Signer full name" defaultValue={signingAgreement.signedByName || signingAgreement.participantName} />
              <Field name="participantSignature" label="Participant or representative signature" defaultValue={signingAgreement.participantSignature} placeholder="Type full name as signature" />
              <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">The signature is stored on the protected agreement record with timestamp and version details.</p>
              <button className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">Save signature</button>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function mapAgreement(row: Record<string, unknown>): ServiceAgreement {
  return {
    id: String(row.id ?? ""),
    agreementGroupId: String(row.agreement_group_id ?? ""),
    participantName: String(row.participant_name ?? ""),
    ndisNumber: String(row.ndis_number ?? ""),
    title: String(row.title ?? ""),
    versionNumber: Number(row.version_number ?? 1),
    status: String(row.status ?? "draft"),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    renewalReminderAt: String(row.renewal_reminder_at ?? ""),
    supportCategories: String(row.support_categories ?? ""),
    fundingSummary: String(row.funding_summary ?? ""),
    terms: String(row.terms ?? ""),
    participantSignature: String(row.participant_signature ?? ""),
    participantSignedAt: String(row.participant_signed_at ?? ""),
    signedByName: String(row.signed_by_name ?? ""),
    pdfGeneratedAt: String(row.pdf_generated_at ?? ""),
    createdAt: String(row.created_at ?? "")
  };
}

function isRenewalDue(agreement: ServiceAgreement) {
  const reminderDate = agreement.renewalReminderAt || agreement.endDate;
  if (!reminderDate || agreement.status === "closed") return false;
  const due = new Date(`${reminderDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return due.getTime() - Date.now() <= thirtyDays;
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof FileSignature }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof FileSignature; children: React.ReactNode }) {
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

function Area({ name, label, placeholder = "", required = true }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required={required} rows={4} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectText({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required rows={3} defaultValue={options.slice(0, 3).join(", ")} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
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

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}
