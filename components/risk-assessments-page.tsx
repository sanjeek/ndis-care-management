"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, FileCheck2, ShieldAlert, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ParticipantOption = {
  name: string;
  ndis_number: string;
  plan_type: string;
};

type RiskAssessment = {
  id: string;
  participant_name: string;
  assessor_name: string;
  assessor_email: string;
  assessment_date: string;
  review_date: string | null;
  overall_risk_level: string;
  environmental_risks: string;
  behavioural_risks: string;
  medication_risks: string;
  manual_handling_risks: string;
  control_measures: string;
  status: string;
  approved_at: string | null;
  created_at: string;
};

const riskLevels = ["low", "medium", "high", "critical"];
const statuses = ["draft", "review_required", "approved", "archived"];

export function RiskAssessmentsPage() {
  const [notice, setNotice] = useState("Loading participant risk assessments.");
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [editingId, setEditingId] = useState("");

  const editing = assessments.find((assessment) => assessment.id === editingId);
  const summary = useMemo(() => ({
    total: assessments.length,
    highRisk: assessments.filter((assessment) => ["high", "critical"].includes(assessment.overall_risk_level)).length,
    reviewDue: assessments.filter((assessment) => isReviewDue(assessment.review_date) && assessment.status !== "archived").length
  }), [assessments]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening risk assessments.");
      return;
    }

    const response = await fetch("/api/risk-assessments", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({ message: "Risk assessments could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setParticipants(result.participants ?? []);
    setAssessments(result.assessments ?? []);
    setNotice(result.assessments?.length ? "Risk assessments loaded from Supabase." : "No risk assessments recorded yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await postAssessment({
      action: editing ? "update" : "create",
      id: editing?.id ?? "",
      participant_name: String(form.get("participant")),
      assessment_date: String(form.get("assessmentDate")),
      review_date: String(form.get("reviewDate")),
      overall_risk_level: String(form.get("riskLevel")),
      environmental_risks: String(form.get("environmentalRisks")),
      behavioural_risks: String(form.get("behaviouralRisks")),
      medication_risks: String(form.get("medicationRisks")),
      manual_handling_risks: String(form.get("manualHandlingRisks")),
      control_measures: String(form.get("controlMeasures")),
      status: String(form.get("status"))
    });
    if (ok) {
      event.currentTarget.reset();
      setEditingId("");
      await refresh();
    }
  }

  async function postAssessment(payload: Record<string, string>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before saving risk assessments.");
      return false;
    }
    const response = await fetch("/api/risk-assessments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Risk assessment could not be saved." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Risk Assessments" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Assessments" value={summary.total} icon={ClipboardList} />
        <Metric title="High / critical" value={summary.highRisk} icon={ShieldAlert} tone="bg-coral/10 text-coral" />
        <Metric title="Review due" value={summary.reviewDue} icon={TriangleAlert} tone="bg-banksia/20 text-ink" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title={editing ? "Update risk assessment" : "New risk assessment"} icon={ClipboardList}>
          <form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4">
            <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={editing?.participant_name ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="assessmentDate" label="Assessment date" type="date" defaultValue={editing?.assessment_date ?? today()} />
              <Field name="reviewDate" label="Review date" type="date" defaultValue={editing?.review_date ?? ""} required={false} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select name="riskLevel" label="Overall risk level" options={riskLevels} defaultValue={editing?.overall_risk_level ?? "medium"} />
              <Select name="status" label="Status" options={statuses} defaultValue={editing?.status ?? "draft"} />
            </div>
            <Area name="environmentalRisks" label="Environmental risks" defaultValue={editing?.environmental_risks ?? ""} placeholder="Home access, trip hazards, transport, equipment, pets, community environment." />
            <Area name="behaviouralRisks" label="Behavioural risks" defaultValue={editing?.behavioural_risks ?? ""} placeholder="Known triggers, behaviours of concern, escalation signs, de-escalation support." />
            <Area name="medicationRisks" label="Medication risks" defaultValue={editing?.medication_risks ?? ""} placeholder="Medication storage, missed dose risk, administration support, allergies, monitoring." />
            <Area name="manualHandlingRisks" label="Manual handling risks" defaultValue={editing?.manual_handling_risks ?? ""} placeholder="Transfers, mobility aids, hoists, lifting restrictions, two-person support needs." />
            <Area name="controlMeasures" label="Controls and mitigation" defaultValue={editing?.control_measures ?? ""} placeholder="Controls, instructions, PPE, escalation process, review actions, staff training." />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
                <FileCheck2 className="h-4 w-4" />
                {editing ? "Update assessment" : "Save assessment"}
              </button>
              {editing ? (
                <button type="button" onClick={() => setEditingId("")} className="min-h-12 rounded border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel title="Assessment register" icon={ShieldAlert}>
          {assessments.length ? (
            <div className="grid gap-3">
              {assessments.map((assessment) => (
                <article key={assessment.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{assessment.participant_name}</h3>
                      <p className="mt-1 text-sm text-slate-600">Assessed by {assessment.assessor_name || assessment.assessor_email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge label={assessment.overall_risk_level} tone={riskTone(assessment.overall_risk_level)} />
                      <Badge label={assessment.status.replace(/_/g, " ")} tone={statusTone(assessment.status)} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Info label="Assessment date" value={dateLabel(assessment.assessment_date)} />
                    <Info label="Review date" value={dateLabel(assessment.review_date)} />
                    <Info label="Approved" value={dateLabel(assessment.approved_at)} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    <RiskBlock title="Environmental" value={assessment.environmental_risks} />
                    <RiskBlock title="Behavioural" value={assessment.behavioural_risks} />
                    <RiskBlock title="Medication" value={assessment.medication_risks} />
                    <RiskBlock title="Manual handling" value={assessment.manual_handling_risks} />
                    <RiskBlock title="Controls" value={assessment.control_measures} />
                  </div>
                  <button type="button" onClick={() => setEditingId(assessment.id)} className="mt-4 rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                    Edit assessment
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="No risk assessments" message="Create a participant risk assessment to document hazards, support controls, and review dates." />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon, tone = "bg-harbour/10 text-harbour" }: { title: string; value: number; icon: typeof ClipboardList; tone?: string }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`rounded p-2 ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </section>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof ClipboardList; children: React.ReactNode }) {
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

function Field({ name, label, type = "text", defaultValue = "", required = true }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({ name, label, options, defaultValue = "" }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Area({ name, label, defaultValue = "", placeholder = "" }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required rows={4} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function RiskBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded bg-white p-3 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isReviewDue(value?: string | null) {
  if (!value) return false;
  const reviewDate = new Date(`${value}T00:00:00`);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  return reviewDate <= todayDate;
}

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function riskTone(level: string) {
  if (level === "critical") return "bg-coral/10 text-coral";
  if (level === "high") return "bg-orange-100 text-orange-700";
  if (level === "low") return "bg-gumleaf/10 text-gumleaf";
  return "bg-harbour/10 text-harbour";
}

function statusTone(status: string) {
  if (status === "approved") return "bg-gumleaf/10 text-gumleaf";
  if (status === "review_required") return "bg-banksia/20 text-ink";
  if (status === "archived") return "bg-slate-200 text-slate-600";
  return "bg-harbour/10 text-harbour";
}
