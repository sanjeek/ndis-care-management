"use client";

import { AlertTriangle, CheckCircle2, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const controls = [
  {
    area: "Participant data privacy",
    status: "Implemented",
    detail: "Private routes require Supabase sessions; support workers only read participants linked to their assigned shifts through route checks and RLS."
  },
  {
    area: "Role-based access control",
    status: "Implemented",
    detail: "Admin, team leader, and support worker roles have separate navigation and route permissions. Restricted access redirects to /unauthorised."
  },
  {
    area: "Database-level security",
    status: "Implemented",
    detail: "RLS is enabled and forced on operational tables; support worker policies are scoped by login email and assigned participant."
  },
  {
    area: "Audit logging",
    status: "Implemented",
    detail: "Login, logout, create, update, incidents, document access, shift workflow, backups, and restore-plan checks are recorded in audit_logs."
  },
  {
    area: "Document security",
    status: "Implemented",
    detail: "Documents and incident attachments are stored in private buckets and opened through short-lived, permission-checked signed URLs."
  },
  {
    area: "Incident management",
    status: "Implemented",
    detail: "Incident records capture severity, participant, staff, evidence, investigation notes, reportable incident type, notification due date, immediate support, involvement, guardian notification, and corrective actions."
  },
  {
    area: "Backups and restore procedure",
    status: "Implemented",
    detail: "Daily backup cron, private backup storage, backup status monitoring, secure downloads, and restore-plan validation are available to admin users only."
  },
  {
    area: "Provider procedures",
    status: "Organisation action required",
    detail: "The app supports records and controls, but the provider must maintain documented policies, worker training, reportable incident decisions, consent/access processes, and NDIS Commission notification outside the software."
  }
];

export function ComplianceReviewPage() {
  return (
    <AppShell title="NDIS Compliance Review" eyebrow="Operational controls for privacy, access, audit, documents, incidents, and backups.">
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Access control" value="Role based" icon={ShieldCheck} />
        <SummaryCard label="Documents" value="Private" icon={LockKeyhole} />
        <SummaryCard label="Audit trail" value="Enabled" icon={FileText} />
        <SummaryCard label="Actions required" value="Provider policy" icon={AlertTriangle} />
      </div>

      <section className="mt-6 rounded border border-slate-200 bg-white shadow-sm">
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
