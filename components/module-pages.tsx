"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Filter,
  KeyRound,
  LockKeyhole,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  X
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { InvoiceManagementPage } from "@/components/invoice-management-page";
import { StatCard } from "@/components/stat-card";
import { recordAudit, type AuditPayload } from "@/lib/audit";
import { roleForUser, type UserRole } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ParticipantRecord = {
  id: string;
  name: string;
  ndis: string;
  plan: string;
  dateOfBirth: string;
  emergency: string;
  emergencyContacts: string;
  needs: string;
  supportPlans: string;
  goals: string;
  riskInformation: string;
  medicalNotes: string;
  allergies: string;
  communicationPreferences: string;
  docs: number;
  notes: number;
};

type ParticipantDocument = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type CarePlanRecord = {
  id: string;
  participantName: string;
  title: string;
  goals: string;
  supportInstructions: string;
  medicationInformation: string;
  mobilityRequirements: string;
  participantPreferences: string;
  reviewDate: string;
  status: string;
  createdAt: string;
};

type WorkerRecord = {
  name: string;
  email: string;
  role: string;
  availability: string;
  qualifications: string;
  compliance: string;
  policeCheckExpiry: string;
  ndisWorkerScreeningExpiry: string;
  firstAidExpiry: string;
  cprExpiry: string;
  driversLicenceExpiry: string;
  trainingCertificates: string;
  assigned: number;
};

type AvailabilityRecord = {
  id: string;
  workerName: string;
  workerEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
};

type LeaveRecord = {
  id: string;
  workerName: string;
  workerEmail: string;
  leaveType: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: string;
  reviewedByEmail: string;
  reviewedAt: string;
  reviewNotes: string;
};

type ShiftRecord = {
  id: string;
  time: string;
  participant: string;
  participantName: string;
  worker: string;
  workerEmail: string;
  location: string;
  status: string;
  startsAt?: string;
  endsAt?: string;
  approvalStatus: string;
  clockInAt: string;
  clockOutAt: string;
  allowedLatitude: string;
  allowedLongitude: string;
  allowedRadiusM: string;
  clockInLatitude: string;
  clockInLongitude: string;
  clockInDistanceM: string;
  clockOutLatitude: string;
  clockOutLongitude: string;
  clockOutDistanceM: string;
  recurrenceSeriesId: string;
  recurrenceType: string;
  recurrenceIntervalDays: string;
  recurrenceCount: string;
  recurrencePosition: string;
  submittedAt: string;
  submittedByEmail: string;
  approvedAt: string;
  approvedByEmail: string;
  rejectionReason: string;
  payrollReadyAt: string;
  workerSignature: string;
  workerSignedAt: string;
  participantSignature: string;
  participantSignedAt: string;
  signatureCapturedByEmail: string;
};

type ModuleItem = {
  id: string;
  title: string;
  details: string;
  status: string;
};

type ProgressNoteRecord = {
  id: string;
  participantGoalId: string;
  participantGoalTitle: string;
  completedActivity: boolean;
  goalProgressIncrement: number;
  participantName: string;
  workerName: string;
  workerEmail: string;
  templateName: string;
  templateValues: Record<string, string>;
  outcomeTracking: Record<string, string>;
  serviceDate: string;
  startTime: string;
  endTime: string;
  category: string;
  note: string;
  outcomes: string;
  signature: string;
  isImportant: boolean;
  createdAt: string;
};

type ParticipantGoalOption = {
  id: string;
  participantName: string;
  title: string;
  currentProgressPercent: number;
  status: string;
};

type ProgressTemplateField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type ProgressNoteTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  fieldSchema: ProgressTemplateField[];
  outcomeSchema: ProgressTemplateField[];
  requiresSignature: boolean;
  status: string;
};

type IncidentManagementRecord = {
  id: string;
  incidentNumber: string;
  participantName: string;
  workerName: string;
  workerEmail: string;
  staffInvolved: string;
  severity: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  summary: string;
  investigationNotes: string;
  reportableToCommission: boolean;
  reportableIncidentType: string;
  notificationDueAt: string;
  ndisNotifiedAt: string;
  immediateActions: string;
  impactedPersonSupported: string;
  participantInformed: string;
  guardianNotified: string;
  correctiveActions: string;
  escalationStatus: string;
  managerNotifiedAt: string;
  investigationCompletedAt: string;
  status: string;
  attachmentNames: string[];
  createdAt: string;
};

type DashboardMetrics = {
  activeParticipants: number;
  activeStaff: number;
  completedShifts: number;
  pendingIncidents: number;
  outstandingInvoices: number;
  serviceHoursDelivered: number;
  workerUtilisationPercent: number;
  fundingUsagePercent: number;
  attendanceRatePercent: number;
  scheduledShiftHours: number;
  deliveredShiftHours: number;
};

const statuses = ["Draft", "Offered", "Confirmed", "In progress", "Completed", "Cancelled"];
const availabilityStatuses = ["available", "preferred", "unavailable"];
const leaveTypes = ["Annual leave", "Sick leave", "Unavailable period"];
const recurrenceTypes = ["single", "daily", "weekly", "fortnightly", "custom"];
const incidentSeverities = ["Low", "Medium", "High", "Critical"];
const incidentStatuses = ["Submitted", "Under review", "Investigation", "Action required", "Closed"];
const reportableIncidentTypes = ["Not reportable", "Death", "Serious injury", "Abuse or neglect", "Unlawful sexual or physical contact", "Sexual misconduct", "Unauthorised restrictive practice"];
type ModuleKind = "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings";

export function DashboardPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeParticipants: 0,
    activeStaff: 0,
    completedShifts: 0,
    pendingIncidents: 0,
    outstandingInvoices: 0,
    serviceHoursDelivered: 0,
    workerUtilisationPercent: 0,
    fundingUsagePercent: 0,
    attendanceRatePercent: 0,
    scheduledShiftHours: 0,
    deliveredShiftHours: 0
  });
  const [notice, setNotice] = useState("Database records only.");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setNotice("Connect Supabase to show live records.");
        return;
      }
      const [loadedShifts, loadedMetrics] = await Promise.all([
        loadShifts(),
        loadDashboardMetrics()
      ]);
      if (!active) return;
      setShifts(loadedShifts);
      setMetrics(loadedMetrics);
      setNotice("Showing records from Supabase.");
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const todaysShifts = useMemo(() => shifts.filter(isTodayShift), [shifts]);
  const metricCards = [
    { label: "Service hours delivered", value: formatHours(metrics.serviceHoursDelivered), delta: metrics.serviceHoursDelivered ? `${formatHours(metrics.deliveredShiftHours)} completed or approved` : "No delivered service hours yet", tone: "gumleaf", icon: BarChart3 },
    { label: "Active participants", value: String(metrics.activeParticipants), delta: metrics.activeParticipants ? "Participant records in database" : "No active participants", tone: "harbour", icon: ShieldCheck },
    { label: "Worker utilisation", value: `${metrics.workerUtilisationPercent}%`, delta: `${formatHours(metrics.scheduledShiftHours)} rostered hours`, tone: "banksia", icon: TrendingUp },
    { label: "Incidents", value: String(metrics.pendingIncidents), delta: metrics.pendingIncidents ? "Open incident records" : "No pending incidents", tone: "coral", icon: AlertTriangle },
    { label: "Funding usage", value: `${metrics.fundingUsagePercent}%`, delta: metrics.fundingUsagePercent ? "NDIS funding utilised" : "No funding usage recorded", tone: "harbour", icon: ClipboardPlus },
    { label: "Attendance rate", value: `${metrics.attendanceRatePercent}%`, delta: metrics.completedShifts ? `${metrics.completedShifts} completed shifts` : "No completed shifts", tone: "gumleaf", icon: CheckCircle2 }
  ];

  return (
    <AppShell title="Dashboard" eyebrow={`${formatToday()} | ${notice}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <ShiftTable title="Today's shifts" shifts={todaysShifts} emptyMessage="No shifts are scheduled for today." />
        <QuickActions />
      </div>
      <ManagementAnalytics metrics={metrics} todaysShiftCount={todaysShifts.length} />
    </AppShell>
  );
}

function ManagementAnalytics({ metrics, todaysShiftCount }: { metrics: DashboardMetrics; todaysShiftCount: number }) {
  const rows = [
    {
      label: "Worker utilisation",
      value: metrics.workerUtilisationPercent,
      detail: `${formatHours(metrics.deliveredShiftHours)} delivered from ${formatHours(metrics.scheduledShiftHours)} rostered hours`
    },
    {
      label: "Attendance rate",
      value: metrics.attendanceRatePercent,
      detail: metrics.completedShifts ? `${metrics.completedShifts} shifts attended or completed` : "No attended shifts recorded"
    },
    {
      label: "Funding usage",
      value: metrics.fundingUsagePercent,
      detail: metrics.fundingUsagePercent ? "Based on NDIS funding records" : "No NDIS funding spend recorded"
    }
  ];

  return (
    <section className="mt-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Management analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Service delivery, workforce performance, risk, funding, and attendance from live records.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded bg-gumleaf/10 px-3 py-1.5 text-xs font-semibold text-gumleaf">
          <CalendarDays className="h-4 w-4" />
          {todaysShiftCount} today
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        <div className="space-y-4 lg:col-span-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-ink">{row.label}</p>
                <p className="font-semibold text-gumleaf">{row.value}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200">
                <div className="h-full bg-gumleaf" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{row.detail}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4">
          <AnalyticsMini title="Active participants" value={String(metrics.activeParticipants)} detail="Participant records" />
          <AnalyticsMini title="Active staff" value={String(metrics.activeStaff)} detail="Support worker records" />
          <AnalyticsMini title="Open incidents" value={String(metrics.pendingIncidents)} detail="Require follow-up" />
          <AnalyticsMini title="Outstanding invoices" value={String(metrics.outstandingInvoices)} detail="Not paid or closed" />
        </div>
      </div>
    </section>
  );
}

function AnalyticsMini({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [notice, setNotice] = useState("Loading participant records from Supabase.");
  const [canManageParticipants, setCanManageParticipants] = useState(false);

  const refresh = useCallback(async () => {
    const context = await getCurrentUserContext();
    setCanManageParticipants(context.role === "admin");
    const rows = context.role === "support_worker" && context.email
      ? await loadParticipantsForShifts(await loadShifts(context.email))
      : await loadParticipants();
    setParticipants(rows);
    setNotice(
      context.role === "support_worker"
        ? rows.length
          ? "Showing only participants assigned to your shifts."
          : "No participants are assigned to your shifts."
        : rows.length
          ? "Showing all participant records from the database."
          : "No participants yet. Add a participant to get started."
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const payload = {
      name: get(form, "name"),
      ndis_number: get(form, "ndis"),
      plan_type: get(form, "plan"),
      date_of_birth: get(form, "dateOfBirth"),
      emergency_contact: get(form, "emergency"),
      emergency_contacts: get(form, "emergencyContacts"),
      support_needs: get(form, "needs")
      ,
      support_plans: get(form, "supportPlans"),
      goals: get(form, "goals"),
      risk_information: get(form, "riskInformation"),
      medical_notes: get(form, "medicalNotes"),
      allergies: get(form, "allergies"),
      communication_preferences: get(form, "communicationPreferences")
    };
    const ok = await postJson("/api/participants", payload, setNotice);
    if (ok) await refresh();
  }

  return (
    <AppShell title="Participants" eyebrow={notice}>
      {canManageParticipants ? (
        <RecordForm submitLabel="Add participant" onSubmit={submit}>
          <Field name="name" label="Participant profile" placeholder="Full name" />
          <Field name="ndis" label="NDIS number" placeholder="NDIS participant number" />
          <Field name="plan" label="Plan type" placeholder="NDIS managed, plan managed, or self managed" />
          <Field name="dateOfBirth" label="Date of birth" type="date" />
          <Field name="emergency" label="Emergency contact" placeholder="Name and phone number" />
          <Area name="emergencyContacts" label="Emergency contacts" placeholder="Primary and secondary contacts, relationship, phone, and email" />
          <Area name="needs" label="Support needs" placeholder="Support needs, routines, risks, and goals" />
          <Area name="supportPlans" label="Support plans" placeholder="Current support plan details, routines, funded supports, and review dates" />
          <Area name="goals" label="Participant goals" placeholder="NDIS goals, short-term goals, and progress measures" />
          <Area name="riskInformation" label="Risk information" placeholder="Known risks, triggers, behaviour support, safeguarding, and mitigation actions" />
          <Area name="medicalNotes" label="Medical notes" placeholder="Medical conditions, medication notes, mobility, swallowing, seizures, or care alerts" />
          <Area name="allergies" label="Allergies" placeholder="Food, medication, environmental allergies, and response plan" />
          <Area name="communicationPreferences" label="Communication preferences" placeholder="Preferred language, communication method, interpreter needs, and decision supports" />
        </RecordForm>
      ) : (
        <section className="mb-6 rounded border border-gumleaf/25 bg-gumleaf/5 p-4 text-sm text-slate-700">
          Support worker access is restricted to participants linked to your assigned shifts. Add and edit controls are available to admin users only.
        </section>
      )}
      {participants.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {participants.map((participant) => (
            <article key={`${participant.ndis}-${participant.name}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{participant.name}</h2>
                  <p className="text-sm text-slate-500">NDIS {participant.ndis || "not recorded"}</p>
                </div>
                <span className="rounded bg-harbour/10 px-2 py-1 text-xs font-semibold text-harbour">{participant.plan || "Plan not recorded"}</span>
              </div>
              <Info label="Emergency contact" value={participant.emergency || "Not recorded"} />
              <Info label="Support needs" value={participant.needs || "Not recorded"} />
              <Info label="Goals" value={participant.goals || "Not recorded"} />
              <Info label="Documents / Notes" value={`${participant.docs} documents, ${participant.notes} progress notes`} />
              <Link href={`/participants/${participant.id}`} className="mt-4 inline-flex rounded border border-gumleaf/30 px-3 py-2 text-sm font-semibold text-gumleaf hover:bg-gumleaf/5">
                Open profile
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={canManageParticipants ? "No participants yet" : "No assigned participants"}
          message={canManageParticipants ? "Participant records will appear here after they are added to the database." : "Participant records appear here only when you are assigned to their shifts."}
        />
      )}
    </AppShell>
  );
}

export function ParticipantProfilePage({ participantId }: { participantId: string }) {
  const [participant, setParticipant] = useState<ParticipantRecord | null>(null);
  const [documents, setDocuments] = useState<ParticipantDocument[]>([]);
  const [notice, setNotice] = useState("Loading participant profile.");

  useEffect(() => {
    let active = true;
    async function load() {
      const row = await loadParticipantById(participantId);
      if (!active) return;
      setParticipant(row);
      if (!row) {
        setNotice("Participant not found or you do not have permission to view this profile.");
        return;
      }
      const docs = await loadParticipantDocuments(row.name);
      if (!active) return;
      setDocuments(docs);
      setNotice("Showing participant profile from Supabase.");
    }
    void load();
    return () => {
      active = false;
    };
  }, [participantId]);

  async function openDocument(documentId: string) {
    if (!supabase) {
      setNotice("Please sign in before opening documents.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening documents.");
      return;
    }
    const response = await fetch(`/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({ message: "Could not open document." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell title={participant?.name || "Participant Profile"} eyebrow={notice}>
      {participant ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-4">
            <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gumleaf">Participant profile</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink">{participant.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">NDIS {participant.ndis || "not recorded"}</p>
                </div>
                <span className="rounded bg-harbour/10 px-3 py-1 text-sm font-semibold text-harbour">{participant.plan || "Plan not recorded"}</span>
              </div>
              <Info label="Date of birth" value={participant.dateOfBirth ? dateOnly(participant.dateOfBirth) : "Not recorded"} />
              <Info label="Communication preferences" value={participant.communicationPreferences || "Not recorded"} />
              <Info label="Emergency contact" value={participant.emergency || "Not recorded"} />
              <Info label="Emergency contacts" value={participant.emergencyContacts || "Not recorded"} />
            </article>

            <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-ink">Uploaded documents</h2>
              <p className="mt-1 text-sm text-slate-500">Documents are stored privately and opened through permission-checked signed links.</p>
              {documents.length ? (
                <div className="mt-4 grid gap-3">
                  {documents.map((document) => (
                    <div key={document.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-ink">{document.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{document.fileName} | {formatBytes(document.sizeBytes)} | {dateTimeOrFallback(document.createdAt)}</p>
                        </div>
                        <button type="button" onClick={() => openDocument(document.id)} className="inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                          <Download className="h-4 w-4" />
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyWorkerState title="No uploaded documents" message="Documents linked to this participant will appear here after upload." />
              )}
            </article>
          </section>

          <section className="grid gap-4">
            <ProfileSection title="Support plans" value={participant.supportPlans} />
            <ProfileSection title="Participant goals" value={participant.goals} />
            <ProfileSection title="Support needs" value={participant.needs} />
            <ProfileSection title="Risk information" value={participant.riskInformation} tone="risk" />
            <ProfileSection title="Medical notes" value={participant.medicalNotes} />
            <ProfileSection title="Allergies" value={participant.allergies} tone="risk" />
          </section>
        </div>
      ) : (
        <EmptyState title="Participant profile unavailable" message="This participant could not be found, or your login does not have permission to view it." />
      )}
    </AppShell>
  );
}

export function CarePlansPage() {
  const [carePlans, setCarePlans] = useState<CarePlanRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [context, setContext] = useState<{ role: UserRole; email: string }>({ role: "support_worker", email: "" });
  const [notice, setNotice] = useState("Loading care plans from Supabase.");

  const refresh = useCallback(async () => {
    const userContext = await getCurrentUserContext();
    const assignedShifts = userContext.role === "support_worker" && userContext.email ? await loadShifts(userContext.email) : [];
    const [loadedPlans, loadedParticipants] = await Promise.all([
      loadCarePlans(),
      userContext.role === "support_worker" ? loadParticipantsForShifts(assignedShifts) : loadParticipants()
    ]);
    setContext(userContext);
    setCarePlans(loadedPlans);
    setParticipants(loadedParticipants);
    setNotice(
      loadedPlans.length
        ? userContext.role === "support_worker"
          ? "Showing read-only care plans for your assigned participants."
          : "Showing provider care plans from the database."
        : "No care plans have been created yet."
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const ok = await postJson(
      "/api/care-plans",
      {
        participant_name: get(form, "participant"),
        title: get(form, "title"),
        goals: get(form, "goals"),
        support_instructions: get(form, "supportInstructions"),
        medication_information: get(form, "medicationInformation"),
        mobility_requirements: get(form, "mobilityRequirements"),
        participant_preferences: get(form, "participantPreferences"),
        review_date: get(form, "reviewDate"),
        status: get(form, "status")
      },
      setNotice
    );
    if (ok) await refresh();
  }

  const canManage = context.role === "admin";

  return (
    <AppShell title="Care Plans" eyebrow={notice}>
      {canManage ? (
        <RecordForm submitLabel="Create care plan" onSubmit={submit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
            <Field name="title" label="Care plan title" placeholder="Daily support plan, community access plan, medication support plan" />
          </div>
          <Area name="goals" label="Goals" placeholder="Participant goals, NDIS outcomes, short-term objectives, and progress measures" />
          <Area name="supportInstructions" label="Support instructions" placeholder="Step-by-step support instructions, routines, prompts, behaviour supports, and safeguarding instructions" />
          <Area name="medicationInformation" label="Medication information" placeholder="Medication prompts, administration boundaries, allergies, escalation instructions, and medication chart notes" />
          <Area name="mobilityRequirements" label="Mobility requirements" placeholder="Transfers, equipment, mobility aids, manual handling, transport, and access needs" />
          <Area name="participantPreferences" label="Participant preferences" placeholder="Communication, cultural, personal care, meal, activity, and routine preferences" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Field name="reviewDate" label="Review date" type="date" />
            <Select name="status" label="Status" options={["active", "draft", "review_due", "archived"]} />
          </div>
        </RecordForm>
      ) : (
        <div className="mb-5 rounded border border-gumleaf/25 bg-gumleaf/5 p-4 text-sm text-slate-700">
          Support worker access is read-only and limited to care plans for participants assigned to your shifts.
        </div>
      )}

      {carePlans.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {carePlans.map((plan) => (
            <article key={plan.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gumleaf">{plan.participantName}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{plan.title}</h2>
                </div>
                <span className="w-fit rounded bg-harbour/10 px-3 py-1 text-xs font-semibold uppercase text-harbour">{plan.status}</span>
              </div>
              <Info label="Review date" value={plan.reviewDate ? dateOnly(plan.reviewDate) : "Not recorded"} />
              <CarePlanDetail title="Goals" value={plan.goals} />
              <CarePlanDetail title="Support instructions" value={plan.supportInstructions} />
              <CarePlanDetail title="Medication information" value={plan.medicationInformation} tone="risk" />
              <CarePlanDetail title="Mobility requirements" value={plan.mobilityRequirements} />
              <CarePlanDetail title="Participant preferences" value={plan.participantPreferences} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No care plans yet" message={canManage ? "Create a care plan for a participant to guide support delivery." : "Care plans for your assigned participants will appear here."} />
      )}
    </AppShell>
  );
}

export function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [notice, setNotice] = useState("Loading support worker records from Supabase.");
  const [inviteLink, setInviteLink] = useState("");

  const refresh = useCallback(async () => {
    const rows = await loadWorkers();
    setWorkers(rows);
    setNotice(rows.length ? "Showing support worker records from the database." : "No support workers yet. Add a worker to create an invite.");
  }, []);

  const complianceAlerts = useMemo(() => workers.flatMap(workerComplianceAlerts), [workers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const token = crypto.randomUUID();
    const next = {
      name: get(form, "name"),
      email: get(form, "email"),
      role: get(form, "role"),
      availability: get(form, "availability"),
      qualifications: get(form, "qualifications"),
      compliance_status: get(form, "compliance"),
      police_check_expiry: get(form, "policeCheckExpiry") || null,
      ndis_worker_screening_expiry: get(form, "ndisWorkerScreeningExpiry") || null,
      first_aid_expiry: get(form, "firstAidExpiry") || null,
      cpr_expiry: get(form, "cprExpiry") || null,
      drivers_licence_expiry: get(form, "driversLicenceExpiry") || null,
      training_certificates: get(form, "trainingCertificates")
    };
    const workerSaved = await persist("support_workers", next, setNotice, {
      action: "create",
      recordLabel: next.email,
      metadata: { recordType: "support_worker", name: next.name }
    });
    const portalUrl = `/worker-portal/create-login?invite=${token}`;
    setInviteLink(portalUrl);
    if (workerSaved) await refresh();
    await persist(
      "worker_invitations",
      {
        worker_name: next.name,
        worker_email: next.email,
        invite_token: token,
        portal_url: portalUrl,
        status: "sent"
      },
      setNotice,
      {
        action: "create",
        recordLabel: next.email,
        metadata: { recordType: "worker_invitation", workerName: next.name }
      }
    );
    const invite = await fetch("/api/invite-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: next.email, name: next.name, token })
    }).then((response) => response.json());
    setNotice(invite.message ?? "Worker invite created.");
  }

  return (
    <AppShell title="Support Workers" eyebrow={notice}>
      {inviteLink ? (
        <div className="mb-6 rounded border border-gumleaf/25 bg-gumleaf/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-ink">Latest invite link</h2>
              <p className="mt-1 text-sm text-slate-600">This link was created from the database invitation workflow.</p>
            </div>
            <Link href={inviteLink} className="inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              <KeyRound className="h-4 w-4" />
              Open invite link
            </Link>
          </div>
        </div>
      ) : null}

      <section className="mb-6 rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Compliance alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Alerts show expired records and records expiring within 60 days.</p>
          </div>
          <span className={`w-fit rounded px-3 py-1 text-sm font-semibold ${complianceAlerts.length ? "bg-coral/10 text-coral" : "bg-gumleaf/10 text-gumleaf"}`}>
            {complianceAlerts.length ? `${complianceAlerts.length} alert${complianceAlerts.length === 1 ? "" : "s"}` : "No alerts"}
          </span>
        </div>
        {complianceAlerts.length ? (
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {complianceAlerts.map((alert) => (
              <div key={`${alert.worker}-${alert.label}`} className={`rounded border p-3 text-sm ${alert.status === "expired" ? "border-coral/25 bg-coral/5" : "border-banksia/40 bg-banksia/10"}`}>
                <p className="font-semibold text-ink">{alert.worker}</p>
                <p className="mt-1 text-slate-700">{alert.label}: {alert.message}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <RecordForm submitLabel="Add worker and send invite" onSubmit={submit}>
        <Field name="name" label="Staff profile" placeholder="Full name" />
        <Field name="email" label="Email invite address" type="email" placeholder="worker@example.com" />
        <Field name="role" label="Role" placeholder="Disability Support Worker" />
        <Field name="availability" label="Availability" placeholder="Available days and hours" />
        <Area name="qualifications" label="Qualifications" placeholder="Qualifications, training, clearances, and checks" />
        <Field name="compliance" label="Compliance documents" placeholder="Clear, pending, or renewal details" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Field name="policeCheckExpiry" label="Police check expiry" type="date" />
          <Field name="ndisWorkerScreeningExpiry" label="NDIS worker screening expiry" type="date" />
          <Field name="firstAidExpiry" label="First aid certificate expiry" type="date" />
          <Field name="cprExpiry" label="CPR expiry" type="date" />
          <Field name="driversLicenceExpiry" label="Driver's licence expiry" type="date" />
        </div>
        <Area name="trainingCertificates" label="Training certificates" placeholder="List training certificates, completion dates, renewal due dates, and evidence location" />
      </RecordForm>
      {workers.length ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {workers.map((worker) => (
            <article key={`${worker.email}-${worker.name}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-ink">{worker.name}</h2>
              <p className="text-sm text-slate-500">{worker.role || "Role not recorded"}</p>
              <Info label="Invite email" value={worker.email || "Not recorded"} />
              <Info label="Availability" value={worker.availability || "Not recorded"} />
              <Info label="Qualifications" value={worker.qualifications || "Not recorded"} />
              <Info label="Compliance" value={worker.compliance || "Not recorded"} />
              <ComplianceGrid worker={worker} />
              <Info label="Assigned shifts" value={`${worker.assigned} assigned shifts`} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No support workers yet" message="Support worker records will appear here after they are added to the database." />
      )}
    </AppShell>
  );
}

export function WorkerPortalPage() {
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerNameFromSession, setWorkerNameFromSession] = useState("");
  const [visibleShifts, setVisibleShifts] = useState<ShiftRecord[]>([]);
  const [visibleParticipants, setVisibleParticipants] = useState<ParticipantRecord[]>([]);
  const [workerNotes, setWorkerNotes] = useState<ProgressNoteRecord[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRecord[]>([]);
  const [signingShift, setSigningShift] = useState<ShiftRecord | null>(null);
  const [notice, setNotice] = useState("Loading your worker portal.");

  const refresh = useCallback(async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const email = user?.email ?? "";
      const name = String(user?.user_metadata?.full_name || user?.email || user?.id || "");
      const shifts = email ? await loadShifts(email) : [];
      const participants = await loadParticipantsForShifts(shifts);
      const [availabilityRows, leaveRows, noteRows] = email
        ? await Promise.all([loadWorkerAvailability(email), loadWorkerLeave(email), loadProgressNotes(email)])
        : [[], [], []];
      setWorkerEmail(email);
      setWorkerNameFromSession(name);
      setVisibleShifts(shifts);
      setVisibleParticipants(participants);
      setWorkerNotes(noteRows);
      setAvailability(availabilityRows);
      setLeaveRequests(leaveRows);
      setNotice(shifts.length ? "Clock shifts, submit notes, and report incidents from your phone." : "No assigned shifts are linked to this login yet.");
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const workerName = visibleShifts[0]?.worker || workerNameFromSession;

  async function clockShift(shiftId: string, action: "in" | "out") {
    const ok = await runShiftClock(shiftId, action, setNotice);
    if (ok) await refresh();
  }

  async function submitSignedShift(form: FormData) {
    if (!signingShift) return;
    const ok = await runShiftWorkflow(
      signingShift.id,
      "submit",
      setNotice,
      "",
      {
        workerSignature: get(form, "workerSignature"),
        participantSignature: get(form, "participantSignature")
      }
    );
    if (ok) {
      setSigningShift(null);
      await refresh();
    }
  }

  return (
    <AppShell title="Worker Portal" eyebrow={`${workerName || "Worker"} | ${notice}`}>
      <div className="mx-auto grid max-w-6xl gap-5">
        <WorkerShiftMobilePanel
          shifts={visibleShifts}
          participants={visibleParticipants}
          notes={workerNotes}
          onClock={clockShift}
          onSubmit={(shift) => setSigningShift(shift)}
        />
        <WorkerPortalQuickActions />
        <div className="space-y-6">
          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">Client information</h2>
                <p className="mt-1 text-sm text-slate-500">Only participants linked to your assigned shifts are shown.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-gumleaf" />
            </div>
            {visibleParticipants.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {visibleParticipants.map((participant) => (
                  <article key={`${participant.ndis}-${participant.name}`} className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-ink">{participant.name}</p>
                    <Info label="NDIS" value={participant.ndis || "Not recorded"} />
                    <Info label="Support needs" value={participant.needs || "Not recorded"} />
                    <Info label="Emergency contact" value={participant.emergency || "Not recorded"} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyWorkerState title="No linked participant information" message="Participant details only appear when you are assigned to that participant's shift." />
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <WorkerProgressNoteForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
          <WorkerIncidentForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <WorkerLeaveForm workerName={workerName} workerEmail={workerEmail} leaveRequests={leaveRequests} onSaved={refresh} setNotice={setNotice} />
          <WorkerAvailabilityForm workerName={workerName} workerEmail={workerEmail} availability={availability} onSaved={refresh} setNotice={setNotice} />
        </div>
        <div>
          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Important worker reminders</h2>
            <div className="mt-4 grid gap-3">
              {["Complete progress notes before shift end", "Call coordinator for medication or behaviour changes", "Submit incidents immediately for review"].map((item) => (
                <div key={item} className="flex gap-3 rounded border border-slate-200 p-3 text-sm text-slate-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-gumleaf" />
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      {signingShift ? <ShiftSignatureModal shift={signingShift} onClose={() => setSigningShift(null)} onSubmit={submitSignedShift} /> : null}
    </AppShell>
  );
}

export function MyShiftsPage() {
  const [workerName, setWorkerName] = useState("");
  const [visibleShifts, setVisibleShifts] = useState<ShiftRecord[]>([]);
  const [signingShift, setSigningShift] = useState<ShiftRecord | null>(null);
  const [notice, setNotice] = useState("Loading assigned shifts.");

  const refresh = useCallback(async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const email = user?.email ?? "";
      const name = String(user?.user_metadata?.full_name || user?.email || user?.id || "");
      const shifts = email ? await loadShifts(email) : [];
      setWorkerName(name);
      setVisibleShifts(shifts);
      setNotice(shifts.length ? "Only shifts assigned to your login email are shown here." : "You do not currently have any assigned shifts under this login.");
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  async function submitSignedShift(form: FormData) {
    if (!signingShift) return;
    const ok = await runShiftWorkflow(
      signingShift.id,
      "submit",
      setNotice,
      "",
      {
        workerSignature: get(form, "workerSignature"),
        participantSignature: get(form, "participantSignature")
      }
    );
    if (ok) {
      setSigningShift(null);
      await refresh();
    }
  }

  return (
    <AppShell title="My Shifts" eyebrow={`${workerName || "Worker"} assigned schedule only. ${notice}`}>
      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-ink">Assigned shifts</h2>
          <p className="mt-1 text-sm text-slate-500">Complete your shift, then submit it for team leader or admin approval before payroll.</p>
        </div>
        <ShiftTable
          title="Assigned shifts"
          shifts={visibleShifts}
          emptyMessage="You do not currently have any assigned shifts under this login."
          renderActions={(shift) => (
            <button
              type="button"
              disabled={!canSubmitShift(shift)}
              onClick={() => setSigningShift(shift)}
              className="rounded bg-gumleaf px-3 py-2 text-xs font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {shift.approvalStatus === "approved" ? "Approved" : shift.approvalStatus === "submitted" ? "Submitted" : "Sign and submit"}
            </button>
          )}
        />
      </section>
      {signingShift ? <ShiftSignatureModal shift={signingShift} onClose={() => setSigningShift(null)} onSubmit={submitSignedShift} /> : null}
    </AppShell>
  );
}

export function TimesheetsApprovalPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [context, setContext] = useState<{ role: UserRole; email: string }>({ role: "support_worker", email: "" });
  const [notice, setNotice] = useState("Loading shift approval queue.");

  const refresh = useCallback(async () => {
    const userContext = await getCurrentUserContext();
    const loadedShifts = await loadShifts();
    setContext(userContext);
    setShifts(loadedShifts);
    setNotice(loadedShifts.length ? "Review submitted shifts before payroll processing." : "No shifts have been created yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function approveShift(shiftId: string) {
    const ok = await runShiftWorkflow(shiftId, "approve", setNotice);
    if (ok) await refresh();
  }

  async function rejectShift(shiftId: string) {
    const reason = window.prompt("Reason for rejection");
    if (reason === null) return;
    const ok = await runShiftWorkflow(shiftId, "reject", setNotice, reason);
    if (ok) await refresh();
  }

  const pending = shifts.filter((shift) => shift.approvalStatus === "submitted");
  const approved = shifts.filter((shift) => shift.approvalStatus === "approved");
  const rejected = shifts.filter((shift) => shift.approvalStatus === "rejected");
  const canReview = context.role === "admin" || context.role === "team_leader";

  return (
    <AppShell title="Timesheets" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Submitted for approval" value={String(pending.length)} delta="Waiting for review" tone="banksia" icon={CheckCircle2} />
        <StatCard label="Payroll ready" value={String(approved.length)} delta="Approved shifts" tone="gumleaf" icon={ShieldCheck} />
        <StatCard label="Rejected" value={String(rejected.length)} delta="Returned to worker" tone="coral" icon={AlertTriangle} />
      </div>
      <section className="mt-6 rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-ink">Shift approval queue</h2>
          <p className="mt-1 text-sm text-slate-500">Support workers submit completed shifts here for team leader or admin approval before payroll processing.</p>
        </div>
        {canReview ? (
          <ShiftTable
            title="Submitted and approved shifts"
            shifts={shifts.filter((shift) => ["submitted", "approved", "rejected"].includes(shift.approvalStatus))}
            emptyMessage="No shifts are waiting for payroll approval."
            renderActions={(shift) =>
              shift.approvalStatus === "submitted" ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void approveShift(shift.id)} className="rounded bg-gumleaf px-3 py-2 text-xs font-semibold text-white hover:bg-[#1d625d]">Approve</button>
                  <button type="button" onClick={() => void rejectShift(shift.id)} className="rounded border border-coral/30 bg-coral/5 px-3 py-2 text-xs font-semibold text-coral hover:bg-coral/10">Reject</button>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-500">{shift.approvalStatus === "approved" ? "Payroll ready" : "Returned"}</span>
              )
            }
          />
        ) : (
          <EmptyState title="Reviewer access required" message="Only team leaders and admin users can approve shifts for payroll." />
        )}
      </section>
    </AppShell>
  );
}

export function WorkerCreateLoginPage() {
  const [notice, setNotice] = useState("Create login details from your invite email.");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(form: FormData) {
    const response = await fetch("/api/register-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: get(form, "email"),
        password: get(form, "password"),
        name: get(form, "name"),
        organisation: "Worker portal",
        role: "support_worker",
        invite: get(form, "invite")
      })
    });
    const result = await response.json();
    setNotice(result.message ?? (response.ok ? "Login created. You can now sign in." : "Could not create login."));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-gumleaf">CareOS worker invite</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create login details</h1>
        <p className="mt-3 text-sm text-slate-600">{notice}</p>
        <RecordForm submitLabel="Create worker login" onSubmit={submit}>
          <Field name="invite" label="Invite code" placeholder="Invite code from email" />
          <Field name="name" label="Full name" placeholder="Full name" />
          <Field name="email" label="Email address" type="email" placeholder="worker@example.com" />
          <PasswordField name="password" label="Password" placeholder="Create a password" show={showPassword} setShow={setShowPassword} />
        </RecordForm>
        <Link href="/worker-portal" className="mt-5 inline-flex font-semibold text-gumleaf hover:text-ink">
          Open worker portal
        </Link>
      </div>
    </main>
  );
}

export function RosteringPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRecord[]>([]);
  const [notice, setNotice] = useState("Loading scheduler records from Supabase.");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredShifts = useMemo(() => filterRosterShifts(shifts, searchTerm, statusFilter), [shifts, searchTerm, statusFilter]);

  const refresh = useCallback(async () => {
    const [loadedShifts, loadedParticipants, loadedWorkers, loadedAvailability, loadedLeave] = await Promise.all([loadShifts(), loadParticipants(), loadWorkers(), loadWorkerAvailability(), loadWorkerLeave()]);
    setShifts(loadedShifts);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setAvailability(loadedAvailability);
    setLeaveRequests(loadedLeave);
    setNotice(loadedShifts.length ? "Showing shifts from the database." : "No shifts yet. Add a shift to build the roster.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const start = get(form, "start");
    const end = get(form, "end");
    const workerEmail = get(form, "workerEmail").toLowerCase();
    const participantName = get(form, "participant");
    const worker = workers.find((item) => item.email.toLowerCase() === workerEmail);
    const ok = await postJson(
      "/api/shifts",
      {
        participant_name: participantName,
        support_worker_name: worker?.name ?? "",
        support_worker_email: worker?.email ?? workerEmail,
        location: get(form, "location"),
        starts_at: start,
        ends_at: end,
        status: get(form, "status"),
        allowed_latitude: get(form, "allowedLatitude"),
        allowed_longitude: get(form, "allowedLongitude"),
        allowed_radius_m: get(form, "allowedRadius"),
        recurrence_type: get(form, "recurrenceType"),
        recurrence_count: get(form, "recurrenceCount"),
        custom_interval_days: get(form, "customIntervalDays")
      },
      setNotice
    );
    if (ok) await refresh();
    setCreateOpen(false);
  }

  async function updateShift(form: FormData) {
    if (!editingShift) return;
    const workerEmail = get(form, "workerEmail").toLowerCase();
    const worker = workers.find((item) => item.email.toLowerCase() === workerEmail);
    const ok = await patchJson(
      "/api/shifts",
      {
        id: editingShift.id,
        participant_name: get(form, "participant"),
        support_worker_name: worker?.name ?? "",
        support_worker_email: worker?.email ?? workerEmail,
        location: get(form, "location"),
        starts_at: get(form, "start"),
        ends_at: get(form, "end"),
        status: get(form, "status"),
        allowed_latitude: get(form, "allowedLatitude"),
        allowed_longitude: get(form, "allowedLongitude"),
        allowed_radius_m: get(form, "allowedRadius")
      },
      setNotice
    );
    if (ok) {
      await refresh();
      setEditingShift(null);
    }
  }

  return (
    <AppShell title="Rostering / Shifts" eyebrow={notice}>
      <SchedulerGrid
        shifts={filteredShifts}
        allShifts={shifts}
        workers={workers}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onAddShift={() => setCreateOpen(true)}
        onEditShift={setEditingShift}
      />
      <RecurringSeriesPanel shifts={shifts} setNotice={setNotice} onSaved={refresh} />
      {createOpen ? <ShiftCreateModal participants={participants} workers={workers} availability={availability} leaveRequests={leaveRequests} onClose={() => setCreateOpen(false)} onSubmit={submit} /> : null}
      {editingShift ? <ShiftCreateModal participants={participants} workers={workers} availability={availability} leaveRequests={leaveRequests} initialShift={editingShift} onClose={() => setEditingShift(null)} onSubmit={updateShift} /> : null}
    </AppShell>
  );
}

export function ProgressNotesPage() {
  const [notes, setNotes] = useState<ProgressNoteRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [templates, setTemplates] = useState<ProgressNoteTemplate[]>([]);
  const [goals, setGoals] = useState<ParticipantGoalOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [context, setContext] = useState<{ role: UserRole; email: string; name: string }>({ role: "support_worker", email: "", name: "" });
  const [notice, setNotice] = useState("Loading progress notes from Supabase.");

  const refresh = useCallback(async () => {
    const userContext = await getCurrentUserContext();
    const userName = await getCurrentUserName();
    const assignedShifts = userContext.role === "support_worker" && userContext.email ? await loadShifts(userContext.email) : [];
    const [loadedNotes, loadedParticipants, loadedWorkers, loadedTemplates, loadedGoals] = await Promise.all([
      loadProgressNotes(userContext.role === "support_worker" ? userContext.email : undefined),
      userContext.role === "support_worker" ? loadParticipantsForShifts(assignedShifts) : loadParticipants(),
      userContext.role === "support_worker" ? Promise.resolve([]) : loadWorkers(),
      loadProgressNoteTemplates(),
      loadParticipantGoals(userContext.role === "support_worker" ? userContext.email : undefined)
    ]);
    setContext({ ...userContext, name: assignedShifts[0]?.worker || userName || userContext.email });
    setNotes(loadedNotes);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setTemplates(loadedTemplates);
    setGoals(loadedGoals);
    if (!selectedTemplateId && loadedTemplates[0]?.id) setSelectedTemplateId(loadedTemplates[0].id);
    setNotice(
      loadedNotes.length
        ? userContext.role === "support_worker"
          ? "Showing your submitted progress notes."
          : "Showing all progress notes from the database."
        : "No progress notes recorded yet."
    );
  }, [selectedTemplateId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const workerName = context.role === "support_worker" ? context.name : get(form, "worker");
    const workerEmail = context.role === "support_worker" ? context.email : workers.find((worker) => worker.name === workerName)?.email ?? "";
    const participant = get(form, "participant");
    const template = templates.find((item) => item.id === get(form, "templateId"));
    const templateValues = readTemplateValues(form, template?.fieldSchema ?? [], "template");
    const outcomeTracking = readTemplateValues(form, template?.outcomeSchema ?? [], "outcome");
    const templateSignature = templateValues.digital_signature || get(form, "signature");
    const ok = await persist(
      "progress_notes",
      {
        participant_name: participant,
        worker_name: workerName,
        worker_email: workerEmail,
        template_id: template?.id || null,
        template_name: template?.name || "",
        template_values: templateValues,
        outcome_tracking: outcomeTracking,
        service_date: get(form, "serviceDate"),
        start_time: get(form, "startTime"),
        end_time: get(form, "endTime"),
        category: template?.category || get(form, "category"),
        note: get(form, "note"),
        outcomes: get(form, "outcomes"),
        digital_signature: templateSignature,
        is_important: get(form, "important") === "Important",
        participant_goal_id: get(form, "goalId") || null,
        completed_activity: get(form, "completedActivity") === "Completed activity",
        goal_progress_increment: Number(get(form, "goalProgressIncrement") || 0)
      },
      setNotice,
      {
        action: "progress_note",
        recordLabel: participant,
        metadata: {
          serviceDate: get(form, "serviceDate"),
          workerName,
          templateName: template?.name || "Standard progress note",
          operation: "create"
        }
      }
    );
    if (ok) await refresh();
  }

  const canSubmit = participants.length > 0 && (context.role === "support_worker" || workers.length > 0);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  return (
    <AppShell title="Progress Notes" eyebrow={notice}>
      {context.role === "admin" ? <ProgressTemplateManager templates={templates} setNotice={setNotice} onSaved={refresh} /> : null}
      <section className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">New progress note</h2>
          <p className="text-sm text-slate-500">Record service delivery, template-required fields, outcomes, and a digital worker signature.</p>
        </div>
        {canSubmit ? (
          <RecordForm submitLabel="Save progress note" onSubmit={submit}>
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.length ? (
                <label className="lg:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Progress note template</span>
                  <select
                    name="templateId"
                    value={selectedTemplateId}
                    onChange={(event) => setSelectedTemplateId(event.target.value)}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  {selectedTemplate?.description ? <p className="mt-1 text-xs text-slate-500">{selectedTemplate.description}</p> : null}
                </label>
              ) : null}
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              {context.role === "support_worker" ? (
                <ReadOnlyField label="Support worker" value={context.name || context.email || "Current worker"} />
              ) : (
                <Select name="worker" label="Support worker" options={workers.map((worker) => worker.name)} />
              )}
              <Field name="serviceDate" label="Service date" type="date" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="startTime" label="Start time" type="time" />
                <Field name="endTime" label="End time" type="time" />
              </div>
              <Select name="category" label="Support category" options={["Self care", "Community access", "Medication prompt", "Meal preparation", "Behaviour support", "Transport assistance", "Domestic assistance"]} />
              <Select name="important" label="Priority" options={["Standard", "Important"]} />
              <Select name="goalId" label="Linked participant goal" options={["", ...goals.map((goal) => goal.id)]} required={false} renderLabel={(value) => goalLabel(goals, value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="completedActivity" label="Goal activity" options={["Not completed", "Completed activity"]} />
                <Field name="goalProgressIncrement" label="Goal progress increase %" type="number" min="0" max="100" placeholder="0" />
              </div>
              {selectedTemplate ? <TemplateFields template={selectedTemplate} /> : null}
              <div className="lg:col-span-2">
                <Area name="note" label="Notes" placeholder="Write what support was provided, observations, and participant response." />
              </div>
              <div className="lg:col-span-2">
                <Area name="outcomes" label="Outcomes" placeholder="Record achieved goals, progress, risks, follow-up, or coordinator actions." />
              </div>
              {selectedTemplate?.outcomeSchema.length ? <OutcomeTemplateFields template={selectedTemplate} /> : null}
              {!selectedTemplate?.requiresSignature ? (
                <div className="lg:col-span-2">
                  <Field name="signature" label="Digital signature" placeholder="Type full name as signature" />
                </div>
              ) : null}
            </div>
          </RecordForm>
        ) : (
          <EmptyState
            title="Progress note setup required"
            message={context.role === "support_worker" ? "You can add progress notes after a participant is assigned to one of your shifts." : "Add at least one participant and support worker before creating progress notes."}
          />
        )}
      </section>

      {notes.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {notes.map((note) => (
            <article key={note.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{note.participantName}</h2>
                  <p className="text-sm text-slate-500">{note.templateName || note.category || "Progress note"} by {note.workerName || note.workerEmail || "Worker"}</p>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{note.isImportant ? "Important" : "Standard"}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Info label="Service date" value={note.serviceDate || "Not recorded"} />
                <Info label="Start time" value={note.startTime || "Not recorded"} />
                <Info label="End time" value={note.endTime || "Not recorded"} />
              </div>
              <Info label="Notes" value={note.note || "Not recorded"} />
              <Info label="Outcomes" value={note.outcomes || "Not recorded"} />
              <Info label="Linked goal" value={note.participantGoalTitle || "Not linked"} />
              <Info label="Completed activity" value={note.completedActivity ? `Yes | +${note.goalProgressIncrement}%` : "No"} />
              {Object.keys(note.templateValues).length ? <JsonInfo title="Template fields" values={note.templateValues} /> : null}
              {Object.keys(note.outcomeTracking).length ? <JsonInfo title="Outcome tracking" values={note.outcomeTracking} /> : null}
              <Info label="Digital signature" value={note.signature || "Not signed"} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No progress notes yet" message="Structured progress notes will appear here after they are saved." />
      )}
    </AppShell>
  );
}

function ProgressTemplateManager({
  templates,
  setNotice,
  onSaved
}: {
  templates: ProgressNoteTemplate[];
  setNotice: (message: string) => void;
  onSaved: () => Promise<void>;
}) {
  async function submit(form: FormData) {
    const ok = await postJson(
      "/api/progress-note-templates",
      {
        name: get(form, "name"),
        description: get(form, "description"),
        category: get(form, "category"),
        required_fields: get(form, "requiredFields"),
        dropdown_label: get(form, "dropdownLabel"),
        dropdown_options: get(form, "dropdownOptions"),
        outcome_fields: get(form, "outcomeFields"),
        requires_signature: get(form, "requiresSignature") === "Yes",
        status: get(form, "status")
      },
      setNotice
    );
    if (ok) await onSaved();
  }

  return (
    <section className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Progress note templates</h2>
        <p className="text-sm text-slate-500">Create required fields, dropdown choices, signatures, and participant outcome tracking for consistent NDIS notes.</p>
      </div>
      <RecordForm submitLabel="Create template" onSubmit={submit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field name="name" label="Template name" placeholder="Community access progress note" />
          <Select name="category" label="Support category" options={["Self care", "Community access", "Medication prompt", "Meal preparation", "Behaviour support", "Transport assistance", "Domestic assistance", "General"]} />
          <OptionalArea name="description" label="Template description" placeholder="When this template should be used." />
          <OptionalArea name="requiredFields" label="Required fields" placeholder={"Enter one field per line, e.g.\nParticipant mood\nSupport provided\nObserved risks"} />
          <Field name="dropdownLabel" label="Dropdown label" required={false} placeholder="Participant engagement" />
          <OptionalArea name="dropdownOptions" label="Dropdown options" placeholder={"One option per line, e.g.\nIndependent\nPrompted\nAssisted\nDeclined"} />
          <OptionalArea name="outcomeFields" label="Outcome tracking fields" placeholder={"One outcome per line, e.g.\nNDIS goal progress\nFollow-up required"} />
          <Select name="requiresSignature" label="Require worker signature" options={["Yes", "No"]} />
          <Select name="status" label="Template status" options={["active", "archived"]} />
        </div>
      </RecordForm>
      {templates.length ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{template.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gumleaf">{template.category}</p>
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">{template.status}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{template.description || "No description recorded."}</p>
              <p className="mt-3 text-xs text-slate-500">
                {template.fieldSchema.length} fields, {template.outcomeSchema.length} outcome trackers
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No templates yet" message="Create a template to standardise required progress note fields." />
      )}
    </section>
  );
}

function TemplateFields({ template }: { template: ProgressNoteTemplate }) {
  if (!template.fieldSchema.length) return null;
  return (
    <div className="lg:col-span-2 rounded border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-ink">{template.name} required fields</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {template.fieldSchema.map((field) => (
          <TemplateInput key={field.id} field={field} name={`template_${field.id}`} />
        ))}
      </div>
    </div>
  );
}

function OutcomeTemplateFields({ template }: { template: ProgressNoteTemplate }) {
  if (!template.outcomeSchema.length) return null;
  return (
    <div className="lg:col-span-2 rounded border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-ink">Participant outcome tracking</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {template.outcomeSchema.map((field) => (
          <TemplateInput key={field.id} field={field} name={`outcome_${field.id}`} />
        ))}
      </div>
    </div>
  );
}

function TemplateInput({ field, name }: { field: ProgressTemplateField; name: string }) {
  if (field.type === "dropdown") {
    return (
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
        <select name={name} required={field.required} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
          <option value="">Select {field.label}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="lg:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
        <textarea name={name} required={field.required} rows={3} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
      </label>
    );
  }

  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
      <input name={name} required={field.required} placeholder={field.type === "signature" ? "Type full name as signature" : undefined} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function JsonInfo({ title, values }: { title: string; values: Record<string, string> }) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) return null;
  return (
    <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold text-slate-500">{humaniseKey(key)}</dt>
            <dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function IncidentManagementPage() {
  const [incidents, setIncidents] = useState<IncidentManagementRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [context, setContext] = useState<{ role: UserRole; email: string; name: string }>({ role: "support_worker", email: "", name: "" });
  const [incidentNumber, setIncidentNumber] = useState(() => generateIncidentNumber());
  const [notice, setNotice] = useState("Loading incident records from Supabase.");

  const refresh = useCallback(async () => {
    const userContext = await getCurrentUserContext();
    const userName = await getCurrentUserName();
    const assignedShifts = userContext.role === "support_worker" && userContext.email ? await loadShifts(userContext.email) : [];
    const [loadedIncidents, loadedParticipants, loadedWorkers] = await Promise.all([
      loadIncidentRecords(userContext.role === "support_worker" ? userContext.email : undefined),
      userContext.role === "support_worker" ? loadParticipantsForShifts(assignedShifts) : loadParticipants(),
      userContext.role === "support_worker" ? Promise.resolve([]) : loadWorkers()
    ]);
    setContext({ ...userContext, name: assignedShifts[0]?.worker || userName || userContext.email });
    setIncidents(loadedIncidents);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setNotice(
      loadedIncidents.length
        ? userContext.role === "support_worker"
          ? "Showing only incidents linked to your assigned participants."
          : "Showing all incident records from the database."
        : "No incident reports recorded yet."
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    if (!supabase) {
      setNotice("Supabase is not connected, so the incident was not saved.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before submitting an incident.");
      return;
    }

    const participantName = get(form, "participant");
    const staffName = context.role === "support_worker" ? context.name : get(form, "staff");
    const staffEmail = context.role === "support_worker" ? context.email : workers.find((worker) => worker.name === staffName)?.email ?? "";
    form.set("incidentNumber", incidentNumber);
    form.set("participantName", participantName);
    form.set("staffName", staffName);
    form.set("staffEmail", staffEmail);

    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const result = await response.json().catch(() => ({ message: "Incident could not be saved." }));
    setNotice(response.ok ? "Incident saved and status tracking started." : result.message);

    if (response.ok) {
      setIncidentNumber(generateIncidentNumber());
      await refresh();
    }
  }

  async function openAttachment(incidentId: string, index: number) {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening the attachment.");
      return;
    }
    const response = await fetch(`/api/incidents/${incidentId}/attachments/${index}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({ message: "Attachment could not be opened." }));
    if (!response.ok || !result.url) {
      setNotice(result.message);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function updateEscalation(event: FormEvent<HTMLFormElement>, incident: IncidentManagementRecord) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before updating the incident.");
      return;
    }
    const response = await fetch("/api/incidents", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: incident.id,
        status: get(form, "status"),
        investigationNotes: get(form, "investigationNotes"),
        impactedPersonSupported: get(form, "impactedPersonSupported"),
        correctiveActions: get(form, "correctiveActions")
      })
    });
    const result = await response.json().catch(() => ({ message: "Incident escalation could not be updated." }));
    setNotice(result.message);
    if (response.ok) await refresh();
  }

  const canSubmit = participants.length > 0 && (context.role === "support_worker" || workers.length > 0);
  const canManageEscalation = context.role === "admin" || context.role === "team_leader";

  return (
    <AppShell title="Incident Management" eyebrow={notice}>
      <section className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">New incident report</h2>
          <p className="text-sm text-slate-500">Generate an incident number, record severity, attach evidence, and track investigation status.</p>
        </div>
        {canSubmit ? (
          <RecordForm submitLabel="Save incident" onSubmit={submit}>
            <input type="hidden" name="incidentNumber" value={incidentNumber} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ReadOnlyField label="Incident number" value={incidentNumber} />
              <Select name="severity" label="Severity level" options={incidentSeverities} />
              <Select name="participant" label="Participant involved" options={participants.map((participant) => participant.name)} />
              {context.role === "support_worker" ? (
                <ReadOnlyField label="Staff involved" value={context.name || context.email || "Current worker"} />
              ) : (
                <Select name="staff" label="Staff involved" options={workers.map((worker) => worker.name)} />
              )}
              <Field name="incidentDate" label="Incident date" type="date" />
              <Field name="incidentTime" label="Incident time" type="time" />
              <Field name="location" label="Location" placeholder="Where the incident occurred" />
              <Select name="status" label="Status" options={incidentStatuses} />
              <Select name="reportableType" label="Reportable incident type" options={reportableIncidentTypes} />
              <Field name="notificationDueAt" label="NDIS notification due" type="datetime-local" />
              <div className="lg:col-span-2">
                <Area name="summary" label="Incident details" placeholder="Describe what happened, immediate response, people notified, and current risk." />
              </div>
              <div className="lg:col-span-2">
                <Area name="immediateActions" label="Immediate actions and safety response" placeholder="Record first aid, emergency services, risk controls, separation, supervision, and other immediate supports." />
              </div>
              <div className="lg:col-span-2">
                <Area name="impactedPersonSupported" label="Support provided to impacted person" placeholder="Record how the participant was made safe, respected, informed, and supported, including advocate access if relevant." />
              </div>
              <div className="lg:col-span-2">
                <Area name="participantInformed" label="Participant involvement and communication" placeholder="Record how the participant was involved in incident management and resolution." />
              </div>
              <div className="lg:col-span-2">
                <Area name="guardianNotified" label="Guardian/nominee/key contact notification" placeholder="Record who was notified, when, and by whom." />
              </div>
              <div className="lg:col-span-2">
                <Area name="investigationNotes" label="Investigation notes" placeholder="Record investigation findings, follow-up actions, and manager review notes." />
              </div>
              <div className="lg:col-span-2">
                <Area name="correctiveActions" label="Corrective actions" placeholder="Record actions required, responsible person, timeframe, and prevention measures." />
              </div>
              <div className="lg:col-span-2">
                <FileField name="attachments" label="Attachments" />
              </div>
            </div>
          </RecordForm>
        ) : (
          <EmptyState
            title="Incident setup required"
            message={context.role === "support_worker" ? "You can submit incidents after a participant is assigned to one of your shifts." : "Add at least one participant and support worker before creating incident records."}
          />
        )}
      </section>

      {incidents.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">{incident.incidentNumber || "Incident"}</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{incident.participantName || "Participant not recorded"}</h2>
                  <p className="text-sm text-slate-500">Staff: {incident.staffInvolved || incident.workerName || incident.workerEmail || "Not recorded"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">{incident.severity || "Severity not set"}</span>
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{incident.status || "Submitted"}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Info label="Date" value={incident.incidentDate || "Not recorded"} />
                <Info label="Time" value={incident.incidentTime || "Not recorded"} />
                <Info label="Location" value={incident.location || "Not recorded"} />
              </div>
              <Info label="Incident details" value={incident.summary || "Not recorded"} />
              <Info label="Reportable incident" value={incident.reportableToCommission ? `${incident.reportableIncidentType || "Reportable"} | Due ${dateTimeOrFallback(incident.notificationDueAt)}` : "Not marked as reportable"} />
              <Info label="Immediate actions" value={incident.immediateActions || "Not recorded"} />
              <Info label="Support provided" value={incident.impactedPersonSupported || "Not recorded"} />
              <Info label="Participant communication" value={incident.participantInformed || "Not recorded"} />
              <Info label="Guardian/key contact notification" value={incident.guardianNotified || "Not recorded"} />
              <Info label="Investigation notes" value={incident.investigationNotes || "Not recorded"} />
              <Info label="Corrective actions" value={incident.correctiveActions || "Not recorded"} />
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Escalation workflow</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{friendlyEscalationStatus(incident.escalationStatus)}</p>
                  </div>
                  {incident.severity.toLowerCase() === "critical" ? (
                    <span className="w-fit rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">Manager review required</span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Info label="Manager notified" value={dateTimeOrFallback(incident.managerNotifiedAt)} />
                  <Info label="Investigation completed" value={dateTimeOrFallback(incident.investigationCompletedAt)} />
                </div>
                {canManageEscalation ? (
                  <form onSubmit={(event) => void updateEscalation(event, incident)} className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                    <Select name="status" label="Manager status" options={incidentStatuses} required defaultValue={incident.status || "Under review"} />
                    <Area name="investigationNotes" label="Investigation notes" defaultValue={incident.investigationNotes} placeholder="Document investigation findings before closure." />
                    <Area name="impactedPersonSupported" label="Support provided to impacted person" defaultValue={incident.impactedPersonSupported} placeholder="Record support, communication, and safety actions for the participant." />
                    <Area name="correctiveActions" label="Corrective actions" defaultValue={incident.correctiveActions} placeholder="Record prevention actions, owner, and timeframe." />
                    <button className="w-fit rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                      Update escalation
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</p>
                {incident.attachmentNames.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {incident.attachmentNames.map((name, index) => (
                      <button
                        type="button"
                        key={`${incident.id}-${name}-${index}`}
                        onClick={() => void openAttachment(incident.id, index)}
                        className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-gumleaf/40 hover:bg-gumleaf/5"
                      >
                        <Download className="h-3.5 w-3.5 text-gumleaf" />
                        {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No attachments uploaded.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No incident records yet" message="Incident reports will appear here after they are saved." />
      )}
    </AppShell>
  );
}

export function SimpleModulePage({ kind }: { kind: ModuleKind }) {
  if (kind === "invoices") {
    return <InvoiceManagementPage />;
  }

  return <SimpleModuleContent kind={kind} />;
}

function SimpleModuleContent({ kind }: { kind: Exclude<ModuleKind, "invoices"> }) {
  const [notice, setNotice] = useState("Loading records from Supabase.");
  const [items, setItems] = useState<ModuleItem[]>([]);
  const [workerContext, setWorkerContext] = useState({ role: "support_worker" as UserRole, email: "", name: "" });
  const [workerShifts, setWorkerShifts] = useState<ShiftRecord[]>([]);
  const [workerParticipants, setWorkerParticipants] = useState<ParticipantRecord[]>([]);
  const content = moduleContent(kind);

  const refresh = useCallback(async () => {
    const rows = await loadModuleItems(kind);
    setItems(rows);
    setNotice(rows.length ? "Showing records from the database." : `No ${content.title.toLowerCase()} records yet.`);
  }, [kind, content.title]);

  useEffect(() => {
    let active = true;
    async function loadContext() {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const email = user?.email ?? "";
      const role = roleForUser(user?.user_metadata?.role, user?.email);
      const shifts = email ? await loadShifts(email) : [];
      const participants = await loadParticipantsForShifts(shifts);
      if (!active) return;
      setWorkerContext({
        role,
        email,
        name: String(user?.user_metadata?.full_name || user?.email || user?.id || "")
      });
      setWorkerShifts(shifts);
      setWorkerParticipants(participants);
    }
    void loadContext();
    void refresh();
    return () => {
      active = false;
    };
  }, [refresh]);

  async function submit(form: FormData) {
    const title = get(form, "title");
    const details = get(form, "details");
    const ok = await persist(
      "module_records",
      {
        module: kind,
        title,
        details,
        status: kind === "incidents" ? "submitted" : "active"
      },
      setNotice,
      {
        action: "create",
        recordLabel: title,
        metadata: { module: kind, operation: "create" }
      }
    );
    if (ok) await refresh();
  }

  return (
    <AppShell title={content.title} eyebrow={`${content.eyebrow} ${notice}`}>
      {workerContext.role === "support_worker" && kind === "notes" ? (
        <WorkerPrivacyLayout>
          <WorkerProgressNoteForm workerName={workerShifts[0]?.worker ?? workerContext.name} workerEmail={workerContext.email} participants={workerParticipants} />
        </WorkerPrivacyLayout>
      ) : workerContext.role === "support_worker" && kind === "incidents" ? (
        <WorkerPrivacyLayout>
          <WorkerIncidentForm workerName={workerShifts[0]?.worker ?? workerContext.name} workerEmail={workerContext.email} participants={workerParticipants} />
        </WorkerPrivacyLayout>
      ) : (
        <>
          <RecordForm submitLabel={submitLabelForKind(kind)} onSubmit={submit}>
            {kind === "notes" ? (
              <Select
                name="title"
                label="Progress note title"
                options={["Self care", "Community access progress", "Medication prompt", "Meal preparation", "Behaviour support", "Transport assistance", "Domestic assistance"]}
              />
            ) : (
              <Field name="title" label={titleLabelForKind(kind)} placeholder={titleLabelForKind(kind)} />
            )}
            <Area name="details" label="Details" placeholder={detailsPlaceholderForKind(kind)} />
          </RecordForm>
          {items.length ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                  <ClipboardPlus className="h-5 w-5 text-gumleaf" />
                  <p className="mt-4 font-medium text-ink">{item.title}</p>
                  {item.details ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.details}</p> : null}
                  <span className="mt-4 inline-flex rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={`No ${content.title.toLowerCase()} records yet`} message="Records will appear here after they are added to the database." />
          )}
        </>
      )}
    </AppShell>
  );
}

function WorkerProgressNoteForm({ workerName, workerEmail, participants }: { workerName: string; workerEmail: string; participants: ParticipantRecord[] }) {
  const [notes, setNotes] = useState<string[]>([]);
  const [notice, setNotice] = useState("Add an important progress note.");

  async function submit(form: FormData) {
    const note = get(form, "note");
    const ok = await persist(
      "progress_notes",
      {
        participant_name: get(form, "participant"),
        worker_name: workerName,
        worker_email: workerEmail,
        service_date: new Date().toISOString().slice(0, 10),
        category: get(form, "category"),
        note,
        outcomes: get(form, "outcomes"),
        digital_signature: get(form, "signature"),
        is_important: get(form, "important") === "Important"
      },
      setNotice,
      {
        action: "progress_note",
        recordLabel: get(form, "participant"),
        metadata: { category: get(form, "category"), operation: "create" }
      }
    );
    if (ok) setNotes([note, ...notes]);
  }

  return (
    <section id="worker-progress-note" className="scroll-mt-24 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Quick progress note</h2>
      {participants.length === 0 ? (
        <EmptyWorkerState title="No assigned participant" message="You can add progress notes only for participants linked to your assigned shifts." />
      ) : (
        <RecordForm submitLabel="Add progress note" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="participant" label="Client" options={participants.map((participant) => participant.name)} />
            <Select name="category" label="Support category" options={["Self care", "Community access", "Medication prompt", "Meal preparation", "Behaviour support", "Transport assistance"]} />
          </div>
          <ReadOnlyField label="Worker" value={workerName || "Current worker"} />
          <Select name="important" label="Priority" options={["Important", "Standard"]} />
          <Area name="note" label="Progress note details" placeholder="Write the support provided, outcomes, changes, and follow-up required." />
          <Area name="outcomes" label="Outcomes" placeholder="Record achieved goals, progress, risks, and follow-up actions." />
          <Field name="signature" label="Digital signature" placeholder="Type full name as signature" />
        </RecordForm>
      )}
      <p className="mt-3 text-sm text-slate-500">{notice}</p>
      <div className="mt-3 grid gap-2">
        {notes.map((note) => (
          <p key={note} className="rounded bg-gumleaf/5 p-3 text-sm text-slate-700">{note}</p>
        ))}
      </div>
    </section>
  );
}

function WorkerIncidentForm({ workerName, workerEmail, participants }: { workerName: string; workerEmail: string; participants: ParticipantRecord[] }) {
  const [reports, setReports] = useState<string[]>([]);
  const [notice, setNotice] = useState("Submit incidents for immediate review.");

  async function submit(form: FormData) {
    const summary = get(form, "summary");
    const ok = await persist(
      "incident_reports",
      {
        participant_name: get(form, "participant"),
        worker_name: workerName,
        worker_email: workerEmail,
        priority: get(form, "priority"),
        summary
      },
      setNotice,
      {
        action: "incident_report",
        recordLabel: get(form, "participant"),
        metadata: { priority: get(form, "priority"), operation: "create" }
      }
    );
    if (ok) setReports([summary, ...reports]);
  }

  return (
    <section id="worker-incident-report" className="scroll-mt-24 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Report incident</h2>
      {participants.length === 0 ? (
        <EmptyWorkerState title="No assigned participant" message="You can submit incidents only for participants linked to your assigned shifts." />
      ) : (
        <RecordForm submitLabel="Submit incident" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="participant" label="Client" options={participants.map((participant) => participant.name)} />
            <Select name="priority" label="Priority" options={["High", "Medium", "Low"]} />
          </div>
          <ReadOnlyField label="Worker" value={workerName || "Current worker"} />
          <Area name="summary" label="Incident details" placeholder="Describe what happened, actions taken, people notified, and follow-up required." />
        </RecordForm>
      )}
      <p className="mt-3 text-sm text-slate-500">{notice}</p>
      <div className="mt-3 grid gap-2">
        {reports.map((report) => (
          <p key={report} className="rounded bg-coral/5 p-3 text-sm text-slate-700">{report}</p>
        ))}
      </div>
    </section>
  );
}

function WorkerLeaveForm({
  workerName,
  workerEmail,
  leaveRequests,
  onSaved,
  setNotice
}: {
  workerName: string;
  workerEmail: string;
  leaveRequests: LeaveRecord[];
  onSaved: () => Promise<void>;
  setNotice: (message: string) => void;
}) {
  async function submit(form: FormData) {
    const ok = await postJson(
      "/api/leave",
      {
        worker_name: workerName,
        worker_email: workerEmail,
        leave_type: get(form, "leaveType"),
        starts_at: get(form, "startsAt"),
        ends_at: get(form, "endsAt"),
        reason: get(form, "reason")
      },
      setNotice
    );
    if (ok) await onSaved();
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Leave management</h2>
          <p className="mt-1 text-sm text-slate-500">Request annual leave, sick leave, or unavailable periods. Approved leave blocks scheduling.</p>
        </div>
        <CalendarPlus className="h-5 w-5 text-gumleaf" />
      </div>
      <RecordForm submitLabel="Submit leave request" onSubmit={submit}>
        <Select name="leaveType" label="Leave type" options={leaveTypes} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="startsAt" label="Start" type="datetime-local" />
          <Field name="endsAt" label="End" type="datetime-local" />
        </div>
        <OptionalArea name="reason" label="Reason / notes" placeholder="Annual leave, sick leave, appointment, training, or unavailable period details" />
      </RecordForm>
      {leaveRequests.length ? (
        <div className="grid gap-2">
          {leaveRequests.slice(0, 4).map((leave) => (
            <div key={leave.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink">{friendlyLeaveType(leave.leaveType)}</p>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${leaveStatusBadge(leave.status)}`}>{friendlyLeaveStatus(leave.status)}</span>
              </div>
              <p className="mt-1 text-slate-600">{dateTimeOrFallback(leave.startsAt)} to {dateTimeOrFallback(leave.endsAt)}</p>
              {leave.reason ? <p className="mt-1 text-xs text-slate-500">{leave.reason}</p> : null}
              {leave.reviewNotes ? <p className="mt-1 text-xs text-slate-500">Review: {leave.reviewNotes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No leave requests" message="Your annual leave, sick leave, and unavailable period requests will appear here." />
      )}
    </section>
  );
}

function WorkerAvailabilityForm({
  workerName,
  workerEmail,
  availability,
  onSaved,
  setNotice
}: {
  workerName: string;
  workerEmail: string;
  availability: AvailabilityRecord[];
  onSaved: () => Promise<void>;
  setNotice: (message: string) => void;
}) {
  async function submit(form: FormData) {
    const ok = await postJson(
      "/api/availability",
      {
        worker_name: workerName,
        worker_email: workerEmail,
        available_date: get(form, "availableDate"),
        start_time: get(form, "startTime"),
        end_time: get(form, "endTime"),
        availability_status: get(form, "status"),
        notes: get(form, "notes")
      },
      setNotice
    );
    if (ok) await onSaved();
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">My availability</h2>
          <p className="mt-1 text-sm text-slate-500">Submit available days and unavailable periods. The scheduler blocks shifts that overlap unavailable time.</p>
        </div>
        <CalendarDays className="h-5 w-5 text-gumleaf" />
      </div>
      <RecordForm submitLabel="Submit availability" onSubmit={submit}>
        <Field name="availableDate" label="Date" type="date" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="startTime" label="Start time" type="time" />
          <Field name="endTime" label="End time" type="time" />
        </div>
        <Select name="status" label="Availability type" options={availabilityStatuses} />
        <OptionalArea name="notes" label="Notes" placeholder="Available day, unavailable appointment, preferred locations, transport limits, or leave details" />
      </RecordForm>
      {availability.length ? (
        <div className="grid gap-2">
          {availability.slice(0, 4).map((slot) => (
            <div key={slot.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink">{formatDateLabel(slot.date)}</p>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${availabilityBadge(slot.status)}`}>{friendlyAvailability(slot.status)}</span>
              </div>
              <p className="mt-1 text-slate-600">{formatTimeRange(slot.startTime, slot.endTime)}</p>
              {slot.notes ? <p className="mt-1 text-xs text-slate-500">{slot.notes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No availability submitted" message="Your submitted availability will appear here." />
      )}
    </section>
  );
}

function WorkerShiftMobilePanel({
  shifts,
  participants,
  notes,
  onClock,
  onSubmit
}: {
  shifts: ShiftRecord[];
  participants: ParticipantRecord[];
  notes: ProgressNoteRecord[];
  onClock: (shiftId: string, action: "in" | "out") => Promise<void>;
  onSubmit: (shift: ShiftRecord) => void;
}) {
  const todaysShifts = shifts.filter(isTodayShift);
  const upcomingShifts = shifts.filter((shift) => !isTodayShift(shift)).slice(0, 5);
  const focusShift = todaysShifts.find((shift) => !shift.clockOutAt) ?? todaysShifts[0] ?? upcomingShifts[0] ?? shifts[0];
  const focusParticipant = participants.find((participant) => participant.name === focusShift?.participantName);
  const recentNotes = notes
    .filter((note) => !focusShift?.participantName || note.participantName === focusShift.participantName)
    .slice(0, 4);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      {focusShift ? (
        <article className="rounded border border-gumleaf/30 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">{isTodayShift(focusShift) ? "Today's shift" : "Next upcoming shift"}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{focusShift.participantName || focusShift.participant}</h2>
              <p className="mt-1 text-sm text-slate-600">{focusShift.time || "Time not recorded"} | {focusShift.location || "Location not recorded"}</p>
            </div>
            <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${approvalBadgeClass(focusShift.approvalStatus)}`}>{approvalLabel(focusShift.approvalStatus)}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={Boolean(focusShift.clockInAt)}
              onClick={() => void onClock(focusShift.id, "in")}
              className="min-h-16 rounded bg-[#354aa3] px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#283a82] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {focusShift.clockInAt ? `In ${timeOnly(focusShift.clockInAt)}` : "Clock in"}
            </button>
            <button
              type="button"
              disabled={!focusShift.clockInAt || Boolean(focusShift.clockOutAt)}
              onClick={() => void onClock(focusShift.id, "out")}
              className="min-h-16 rounded bg-gumleaf px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {focusShift.clockOutAt ? `Out ${timeOnly(focusShift.clockOutAt)}` : "Clock out"}
            </button>
          </div>

          <button
            type="button"
            disabled={!canSubmitShift(focusShift)}
            onClick={() => onSubmit(focusShift)}
            className="mt-3 min-h-12 w-full rounded border border-gumleaf/30 bg-gumleaf/5 px-4 py-3 text-base font-semibold text-gumleaf hover:bg-gumleaf/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          >
            Sign and submit completed shift
          </button>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">GPS radius</p>
              <p className="mt-1 font-medium text-slate-700">{focusShift.allowedRadiusM ? `${focusShift.allowedRadiusM}m` : "Not configured"}</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Participant alert</p>
              <p className="mt-1 font-medium text-slate-700">{focusParticipant?.riskInformation || focusParticipant?.needs || "No alert recorded"}</p>
            </div>
          </div>
          <ShiftSignatureSummary shift={focusShift} />
        </article>
      ) : (
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <EmptyWorkerState title="No assigned shifts" message="Assigned shifts will appear here when your coordinator adds them to the roster." />
        </section>
      )}

      <div className="grid gap-4">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Shift dashboard</h2>
              <p className="mt-1 text-sm text-slate-500">{todaysShifts.length} today, {upcomingShifts.length} upcoming</p>
            </div>
            <CalendarDays className="h-5 w-5 text-gumleaf" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-semibold text-ink">{todaysShifts.length}</p>
              <p className="text-xs text-slate-500">Today</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-semibold text-ink">{shifts.filter((shift) => shift.clockInAt && !shift.clockOutAt).length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-semibold text-ink">{shifts.filter((shift) => shift.approvalStatus === "submitted").length}</p>
              <p className="text-xs text-slate-500">Submitted</p>
            </div>
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Upcoming shifts</h2>
          {upcomingShifts.length ? (
            <div className="mt-3 grid gap-3">
              {upcomingShifts.map((shift) => (
                <article key={shift.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{shift.participantName || shift.participant}</p>
                      <p className="mt-1 text-slate-500">{dateOnly(shift.startsAt ?? "")} | {shift.time}</p>
                      <p className="mt-1 text-slate-600">{shift.location || "Location not recorded"}</p>
                    </div>
                    <span className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status || "Draft"}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyWorkerState title="No upcoming shifts" message="Future shifts will appear here after rostering." />
          )}
        </section>

        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Participant notes</h2>
          {recentNotes.length ? (
            <div className="mt-3 grid gap-3">
              {recentNotes.map((note) => (
                <article key={note.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{note.participantName}</p>
                    {note.isImportant ? <span className="rounded bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Important</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-3 leading-6 text-slate-600">{note.note || note.outcomes || "No note text recorded"}</p>
                  <p className="mt-2 text-xs text-slate-500">{dateTimeOrFallback(note.createdAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyWorkerState title="No recent notes" message="Progress notes for your assigned participants will appear here." />
          )}
        </section>
      </div>
    </section>
  );
}

function WorkerPortalQuickActions() {
  const actions = [
    { label: "Progress note", detail: "Record service notes", href: "#worker-progress-note", icon: FilePlus2 },
    { label: "Report incident", detail: "Escalate immediately", href: "#worker-incident-report", icon: AlertTriangle },
    { label: "My shifts", detail: "Full schedule", href: "/my-shifts", icon: CalendarDays }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {actions.map((action) => (
        <Link key={action.label} href={action.href} className="flex min-h-20 items-center gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm hover:border-gumleaf/40 hover:bg-gumleaf/5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gumleaf/10 text-gumleaf">
            <action.icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold text-ink">{action.label}</span>
            <span className="mt-1 block text-xs text-slate-500">{action.detail}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function ShiftSignatureModal({ shift, onClose, onSubmit }: { shift: ShiftRecord; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 py-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Completed shift signatures</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{shift.participantName || shift.participant}</h2>
            <p className="mt-1 text-sm text-slate-500">{shift.time} | {shift.location || "Location not recorded"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close signature dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <RecordForm submitLabel="Sign and submit for approval" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-ink">Secure signed record</p>
              <p className="mt-2 leading-6">
                These signatures confirm the shift was completed. They are stored on the protected shift record with timestamps and the signed shift details for audit and payroll review.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Info label="Clock in" value={shift.clockInAt ? dateTimeOrFallback(shift.clockInAt) : "Not clocked in"} />
                <Info label="Clock out" value={shift.clockOutAt ? dateTimeOrFallback(shift.clockOutAt) : "Not clocked out"} />
              </div>
            </div>
            <Field name="workerSignature" label="Support worker signature" defaultValue={shift.workerSignature} placeholder="Type support worker full name" />
            <Field name="participantSignature" label="Participant or representative signature" defaultValue={shift.participantSignature} placeholder="Type participant or representative full name" />
          </div>
        </RecordForm>
      </div>
    </div>
  );
}

function ShiftSignatureSummary({ shift }: { shift: ShiftRecord }) {
  return (
    <div className="mt-3 grid gap-2 rounded border border-slate-200 bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
      <span>Worker signature: {shift.workerSignedAt ? dateTimeOrFallback(shift.workerSignedAt) : "Required"}</span>
      <span>Participant signature: {shift.participantSignedAt ? dateTimeOrFallback(shift.participantSignedAt) : "Required"}</span>
    </div>
  );
}

function WorkerPrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_0.25fr]">
      <div>{children}</div>
      <section className="rounded border border-gumleaf/25 bg-gumleaf/5 p-4">
        <h2 className="font-semibold text-ink">Worker privacy</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This page only uses your login, your assigned shifts, and participants linked to those shifts. Admin records are hidden from support worker accounts.
        </p>
      </section>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-6 rounded border border-dashed border-slate-300 bg-white p-6 text-sm shadow-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function EmptyWorkerState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-4 rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "New progress note", icon: FilePlus2, href: "/progress-notes" },
    { label: "Log incident report", icon: AlertTriangle, href: "/incident-reports" },
    { label: "Approve timesheet", icon: CheckCircle2, href: "/timesheets" },
    { label: "Upload document", icon: Upload, href: "/documents" }
  ];
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Quick actions</h2>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="flex items-center justify-between rounded border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:border-gumleaf/40 hover:bg-gumleaf/5">
            <span className="flex items-center gap-3">
              <action.icon className="h-4 w-4 text-gumleaf" />
              {action.label}
            </span>
            <Plus className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShiftTable({ title, shifts, emptyMessage, renderActions }: { title: string; shifts: ShiftRecord[]; emptyMessage: string; renderActions?: (shift: ShiftRecord) => React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <CalendarPlus className="h-5 w-5 text-gumleaf" />
      </div>
      {shifts.length ? (
        <div className="overflow-x-auto scrollbar-subtle">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Support worker</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approval</th>
                {renderActions ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((shift, index) => (
                <tr key={`${shift.time}-${shift.participantName}-${index}`}>
                  <td className="px-4 py-4 font-medium text-ink">{shift.time}</td>
                  <td className="px-4 py-4 text-slate-700">{shift.participant}</td>
                  <td className="px-4 py-4 text-slate-700">{shift.worker || "Unassigned"}</td>
                  <td className="px-4 py-4 text-slate-700">{shift.location || "Not recorded"}</td>
                  <td className="px-4 py-4"><span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status || "Draft"}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${approvalBadgeClass(shift.approvalStatus)}`}>{approvalLabel(shift.approvalStatus)}</span>
                      {shift.submittedAt ? <span className="text-xs text-slate-500">Submitted {dateOnly(shift.submittedAt)}</span> : null}
                      {shift.approvedAt ? <span className="text-xs text-slate-500">Approved {dateOnly(shift.approvedAt)}</span> : null}
                      {shift.rejectionReason ? <span className="text-xs text-coral">{shift.rejectionReason}</span> : null}
                      <span className={`text-xs font-semibold ${shift.workerSignature && shift.participantSignature ? "text-gumleaf" : "text-coral"}`}>
                        {shift.workerSignature && shift.participantSignature ? "Signed by worker and participant" : "Signatures required"}
                      </span>
                    </div>
                  </td>
                  {renderActions ? <td className="px-4 py-4">{renderActions(shift)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <EmptyWorkerState title="No shift records" message={emptyMessage} />
        </div>
      )}
    </div>
  );
}

function SchedulerGrid({
  shifts,
  allShifts,
  workers,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onAddShift,
  onEditShift
}: {
  shifts: ShiftRecord[];
  allShifts: ShiftRecord[];
  workers: WorkerRecord[];
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onAddShift: () => void;
  onEditShift: (shift: ShiftRecord) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [showStaffList, setShowStaffList] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const days = weekDays(viewDate);
  const monthDays = monthCalendarDays(viewDate);
  const visibleWorkers = workers.filter((worker) => {
    if (!searchTerm.trim()) return true;
    const term = normaliseRosterText(searchTerm);
    return normaliseRosterText(`${worker.name} ${worker.email}`).includes(term) || shifts.some((shift) => shiftBelongsToWorker(shift, worker) && shiftMatchesSearch(shift, term));
  });
  const visiblePeriodShifts = viewMode === "weekly"
    ? shifts.filter((shift) => days.some((day) => day.key === dateKey(shift.startsAt)))
    : shifts.filter((shift) => sameMonth(shift.startsAt, viewDate));

  function goToday() {
    setViewDate(new Date());
  }

  function moveCalendar(direction: -1 | 1) {
    setViewDate((current) => {
      const next = new Date(current);
      if (viewMode === "monthly") {
        next.setMonth(current.getMonth() + direction);
      } else {
        next.setDate(current.getDate() + direction * 7);
      }
      return next;
    });
  }

  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowStaffList((current) => !current)}
            className={`inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-semibold hover:bg-slate-50 ${showStaffList ? "border-gumleaf/30 bg-gumleaf/5 text-gumleaf" : "border-slate-200 bg-white text-slate-700"}`}
          >
            <CalendarDays className="h-4 w-4 text-gumleaf" />
            Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStaffList(true);
              window.setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Filter scheduler"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button type="button" onClick={goToday} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
          <button type="button" onClick={() => moveCalendar(-1)} className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label={viewMode === "monthly" ? "Previous month" : "Previous week"}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => moveCalendar(1)} className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label={viewMode === "monthly" ? "Next month" : "Next week"}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-xl font-semibold text-ink">{monthYear(viewDate)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
            <option value="all">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="unfilled">Unfilled</option>
          </select>
          <select value={viewMode} onChange={(event) => setViewMode(event.target.value as "weekly" | "monthly")} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" aria-label="Roster view">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button onClick={onAddShift} className="inline-flex items-center gap-2 rounded bg-[#354aa3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#283a82]">
            <Plus className="h-4 w-4" />
            Add Shift
          </button>
          <button type="button" onClick={() => { onSearchChange(""); onStatusFilterChange("all"); }} className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Clear scheduler filters">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(!showStaffList || viewMode === "monthly") ? (
        <div className="border-b border-slate-200 bg-slate-50 p-3">
          <label className="flex max-w-xl items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input ref={searchInputRef} value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search by staff, participant, location or status ..." />
          </label>
        </div>
      ) : null}

      {workers.length ? (
        <div className={`grid border-b border-slate-200 ${showStaffList && viewMode === "weekly" ? "md:grid-cols-[310px_1fr]" : "grid-cols-1"}`}>
          {showStaffList && viewMode === "weekly" ? <div className="border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3">
              <label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input ref={searchInputRef} value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search by team, staff or client ..." />
              </label>
            </div>
            <VacantShiftRow shifts={allShifts} />
            {visibleWorkers.map((worker) => {
              const workerHours = visiblePeriodShifts.filter((shift) => shiftBelongsToWorker(shift, worker)).reduce((sum, shift) => sum + shiftDurationHours(shift), 0);
              return <StaffScheduleRow key={worker.email || worker.name} worker={worker} hours={workerHours} />;
            })}
            {!visibleWorkers.length ? <div className="p-4"><EmptyWorkerState title="No matching staff" message="Try another staff, participant, location, or status filter." /></div> : null}
          </div> : null}

          <div className="min-w-0">
            {viewMode === "weekly" ? (
              <div className="grid grid-cols-7">
                {days.map((day, index) => (
                  <div key={day.label} className={`min-w-0 border-b border-r border-slate-200 p-2 text-center sm:p-3 ${index === 0 ? "bg-banksia/15" : "bg-slate-50"}`}>
                    <p className="text-xs font-semibold uppercase text-slate-400">{day.label}</p>
                    <p className="font-semibold text-ink">{day.date}</p>
                  </div>
                ))}
                {visibleWorkers.map((worker) => (
                  <ScheduleRow key={worker.email || worker.name} worker={worker} shifts={visiblePeriodShifts} days={days} onEditShift={onEditShift} />
                ))}
              </div>
            ) : (
              <MonthSchedule days={monthDays} shifts={visiblePeriodShifts} onEditShift={onEditShift} />
            )}
          </div>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title="No support workers in the database" message="Add support workers before building the weekly roster." />
        </div>
      )}
    </section>
  );
}

function ScheduleRow({ worker, shifts, days, onEditShift }: { worker: WorkerRecord; shifts: ShiftRecord[]; days: Array<{ label: string; date: string; key: string }>; onEditShift: (shift: ShiftRecord) => void }) {
  const workerShifts = shifts.filter((shift) => shiftBelongsToWorker(shift, worker));
  return (
    <>
      {days.map((day, dayIndex) => {
        const dayShifts = workerShifts.filter((item) => dateKey(item.startsAt) === day.key);
        return (
          <div key={`${worker.email || worker.name}-${dayIndex}`} className={`min-h-[102px] border-b border-r border-slate-200 p-2 ${dayIndex === 0 ? "bg-banksia/15" : "bg-white"}`}>
            <div className="grid gap-2">
              {dayShifts.map((shift) => (
                <button key={shift.id} type="button" onClick={() => onEditShift(shift)} className="border-l-4 border-gumleaf bg-slate-50 px-2 py-2 text-left text-xs shadow-sm hover:bg-gumleaf/5">
                  <div className="mb-1 h-1 rounded-full bg-slate-400" />
                  <p className="font-semibold text-slate-600">{shift.time}</p>
                  <p className="mt-1 truncate font-semibold text-ink">{shift.participantName || shift.participant}</p>
                  <p className="mt-1 truncate text-slate-500">{shift.location || "No location"}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function MonthSchedule({ days, shifts, onEditShift }: { days: Array<{ label: string; date: string; key: string; currentMonth: boolean }>; shifts: ShiftRecord[]; onEditShift: (shift: ShiftRecord) => void }) {
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekdayLabels.map((label) => (
          <div key={label} className="border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold uppercase text-slate-400">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayShifts = shifts.filter((shift) => dateKey(shift.startsAt) === day.key);
          return (
            <div key={day.key} className={`min-h-[132px] min-w-0 border-b border-r border-slate-200 p-2 ${day.currentMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
              <p className="text-xs font-semibold">{day.date}</p>
              <div className="mt-2 grid gap-1.5">
                {dayShifts.slice(0, 4).map((shift) => (
                  <button key={shift.id} type="button" onClick={() => onEditShift(shift)} className="min-w-0 border-l-4 border-gumleaf bg-slate-50 px-2 py-1.5 text-left text-xs shadow-sm hover:bg-gumleaf/5">
                    <p className="truncate font-semibold text-slate-700">{shift.time}</p>
                    <p className="truncate text-ink">{shift.participantName || shift.participant}</p>
                    <p className="truncate text-slate-500">{shift.worker || "Unassigned"}</p>
                  </button>
                ))}
                {dayShifts.length > 4 ? <p className="text-xs font-semibold text-gumleaf">+{dayShifts.length - 4} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VacantShiftRow({ shifts }: { shifts: ShiftRecord[] }) {
  const vacant = shifts.filter((shift) => !shift.workerEmail && !shift.worker).length;
  if (!vacant) return null;

  return (
    <div className="flex min-h-[102px] items-center gap-3 border-b border-slate-200 px-3 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-semibold text-white">VS</span>
      <div className="min-w-0">
        <p className="font-semibold text-coral">Vacant Shift</p>
        <p className="text-xs text-slate-500">{vacant ? `${vacant} vacant shift records` : "No vacant shift records"}</p>
      </div>
    </div>
  );
}

function filterRosterShifts(shifts: ShiftRecord[], searchTerm: string, statusFilter: string) {
  const term = normaliseRosterText(searchTerm);
  return shifts.filter((shift) => {
    const status = normaliseRosterText(shift.status);
    const statusOk = statusFilter === "all" || status === normaliseRosterText(statusFilter) || (statusFilter === "unfilled" && !shift.workerEmail && !shift.worker);
    const searchOk = !term || shiftMatchesSearch(shift, term);
    return statusOk && searchOk;
  });
}

function shiftMatchesSearch(shift: ShiftRecord, normalisedTerm: string) {
  return normaliseRosterText(`${shift.participantName} ${shift.participant} ${shift.worker} ${shift.workerEmail} ${shift.location} ${shift.status}`).includes(normalisedTerm);
}

function shiftBelongsToWorker(shift: ShiftRecord, worker: WorkerRecord) {
  const shiftEmail = normaliseRosterText(shift.workerEmail);
  const workerEmail = normaliseRosterText(worker.email);
  if (shiftEmail && workerEmail) return shiftEmail === workerEmail;
  return normaliseRosterText(shift.worker) === normaliseRosterText(worker.name);
}

function normaliseRosterText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function shiftDurationHours(shift: ShiftRecord) {
  const start = shift.startsAt ? new Date(shift.startsAt) : null;
  const end = shift.endsAt ? new Date(shift.endsAt) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
}

function toDateTimeLocalValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function RecurringSeriesPanel({ shifts, setNotice, onSaved }: { shifts: ShiftRecord[]; setNotice: (message: string) => void; onSaved: () => Promise<void> }) {
  const series = useMemo(() => recurringSeriesSummaries(shifts), [shifts]);
  const [selectedSeriesId, setSelectedSeriesId] = useState(series[0]?.id ?? "");

  useEffect(() => {
    if (!selectedSeriesId && series[0]?.id) setSelectedSeriesId(series[0].id);
    if (selectedSeriesId && !series.some((item) => item.id === selectedSeriesId)) setSelectedSeriesId(series[0]?.id ?? "");
  }, [series, selectedSeriesId]);

  async function submit(form: FormData) {
    const ok = await patchJson(
      "/api/shifts/series",
      {
        series_id: get(form, "seriesId"),
        location: get(form, "location"),
        status: get(form, "status"),
        allowed_latitude: get(form, "allowedLatitude"),
        allowed_longitude: get(form, "allowedLongitude"),
        allowed_radius_m: get(form, "allowedRadius")
      },
      setNotice
    );
    if (ok) await onSaved();
  }

  if (!series.length) {
    return (
      <section className="mt-6 rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        No recurring shift series yet. Use the Create shift popup and set recurrence to daily, weekly, fortnightly, or custom.
      </section>
    );
  }

  const selected = series.find((item) => item.id === selectedSeriesId) ?? series[0];

  return (
    <section className="mt-6 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Recurring shift series</h2>
          <p className="mt-1 text-sm text-slate-500">Bulk edit unclocked shifts in a recurring series. Completed or clocked shifts are left unchanged.</p>
        </div>
        <span className="w-fit rounded bg-harbour/10 px-3 py-1 text-sm font-semibold text-harbour">{series.length} series</span>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-2">
          {series.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedSeriesId(item.id)}
              className={`rounded border p-3 text-left text-sm ${item.id === selected.id ? "border-gumleaf bg-gumleaf/5" : "border-slate-200 bg-slate-50 hover:border-gumleaf/30"}`}
            >
              <p className="font-semibold text-ink">{item.participantName}</p>
              <p className="mt-1 text-slate-600">{item.workerName} | {friendlyRecurrence(item.type, item.intervalDays, item.count)}</p>
              <p className="mt-1 text-xs text-slate-500">{dateTimeOrFallback(item.firstStart)} to {dateTimeOrFallback(item.lastStart)}</p>
            </button>
          ))}
        </div>
        <RecordForm submitLabel="Bulk update series" onSubmit={submit}>
          <input type="hidden" name="seriesId" value={selected.id} />
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-ink">{selected.participantName}</p>
            <p className="mt-1 text-slate-600">{selected.workerName} | {selected.count} generated shifts</p>
          </div>
          <Field name="location" label="New location" placeholder={selected.location || "Leave blank to keep existing location"} required={false} />
          <Select name="status" label="New shift status" options={["", ...statuses]} required={false} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="allowedLatitude" label="Allowed latitude" type="number" placeholder={selected.allowedLatitude || "-33.8688"} step="any" required={false} />
            <Field name="allowedLongitude" label="Allowed longitude" type="number" placeholder={selected.allowedLongitude || "151.2093"} step="any" required={false} />
            <Field name="allowedRadius" label="Radius metres" type="number" placeholder={selected.allowedRadiusM || "250"} min="25" max="5000" required={false} />
          </div>
        </RecordForm>
      </div>
    </section>
  );
}

function StaffScheduleRow({ worker, hours }: { worker: WorkerRecord; hours: number }) {
  return (
    <div className="flex min-h-[102px] items-center gap-3 border-b border-slate-200 px-3 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-harbour text-sm font-semibold text-white">
        {initials(worker.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{worker.name}</p>
        <p className="text-sm text-gumleaf">View Availability</p>
        <p className="text-xs text-slate-500">{hours.toFixed(2)} Hours</p>
      </div>
      <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
    </div>
  );
}

function ShiftCreateModal({
  participants,
  workers,
  availability,
  leaveRequests,
  initialShift,
  onClose,
  onSubmit
}: {
  participants: ParticipantRecord[];
  workers: WorkerRecord[];
  availability: AvailabilityRecord[];
  leaveRequests: LeaveRecord[];
  initialShift?: ShiftRecord;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  const initialWorkerEmail = initialShift?.workerEmail || workers.find((worker) => normaliseRosterText(worker.name) === normaliseRosterText(initialShift?.worker ?? ""))?.email || workers[0]?.email || "";
  const [selectedWorkerEmail, setSelectedWorkerEmail] = useState(initialWorkerEmail);
  const [startValue, setStartValue] = useState(toDateTimeLocalValue(initialShift?.startsAt ?? ""));
  const [endValue, setEndValue] = useState(toDateTimeLocalValue(initialShift?.endsAt ?? ""));
  const canCreate = participants.length > 0 && workers.length > 0;
  const selectedWorker = workers.find((worker) => worker.email.toLowerCase() === selectedWorkerEmail.toLowerCase());
  const workerAvailability = availability
    .filter((slot) => slot.workerEmail.toLowerCase() === selectedWorkerEmail.toLowerCase())
    .slice(0, 6);
  const workerApprovedLeave = leaveRequests
    .filter((leave) => leave.workerEmail.toLowerCase() === selectedWorkerEmail.toLowerCase() && leave.status === "approved")
    .slice(0, 4);

  function applyAvailability(slot: AvailabilityRecord) {
    setStartValue(toDateTimeLocal(slot.date, slot.startTime));
    setEndValue(toDateTimeLocal(slot.date, slot.endTime));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="create-shift-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Weekly scheduler</p>
            <h2 id="create-shift-title" className="text-xl font-semibold text-ink">{initialShift ? "Edit shift" : "Create shift"}</h2>
          </div>
          <button onClick={onClose} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close create shift">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {canCreate ? (
            <RecordForm submitLabel={initialShift ? "Update shift" : "Save shift"} onSubmit={onSubmit}>
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={initialShift?.participantName ?? ""} />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Assign support worker</span>
                <select
                  name="workerEmail"
                  required
                  value={selectedWorkerEmail}
                  onChange={(event) => setSelectedWorkerEmail(event.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
                >
                  {workers.map((worker) => (
                    <option key={worker.email || worker.name} value={worker.email}>{worker.name}</option>
                  ))}
                </select>
              </label>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">Submitted availability</p>
                  <span className="text-xs text-slate-500">{selectedWorker?.name || "Select worker"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Unavailable periods are enforced when saving single or recurring shifts.</p>
                {workerAvailability.length ? (
                  <div className="mt-3 grid gap-2">
                    {workerAvailability.map((slot) => (
                      <div key={slot.id} className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-ink">{formatDateLabel(slot.date)} | {formatTimeRange(slot.startTime, slot.endTime)}</p>
                          <p className="mt-1 text-xs text-slate-500">{friendlyAvailability(slot.status)}{slot.notes ? ` | ${slot.notes}` : ""}</p>
                        </div>
                        <button
                          type="button"
                          disabled={slot.status === "unavailable"}
                          onClick={() => applyAvailability(slot)}
                          className="rounded border border-gumleaf/30 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {slot.status === "unavailable" ? "Unavailable" : "Use time"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No submitted availability for this support worker yet.</p>
                )}
                {workerApprovedLeave.length ? (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-coral">Approved leave blocks</p>
                    <div className="mt-2 grid gap-2">
                      {workerApprovedLeave.map((leave) => (
                        <div key={leave.id} className="rounded border border-coral/20 bg-coral/5 p-2 text-xs text-slate-700">
                          <p className="font-semibold text-coral">{friendlyLeaveType(leave.leaveType)}</p>
                          <p>{dateTimeOrFallback(leave.startsAt)} to {dateTimeOrFallback(leave.endsAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <Field name="location" label="Location" placeholder="Shift location" defaultValue={initialShift?.location ?? ""} />
              <div className="rounded border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-ink">GPS clock-in geofence</p>
                <p className="mt-1 text-xs text-slate-500">Enter the allowed shift location coordinates. Workers outside this radius cannot clock in.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Field name="allowedLatitude" label="Allowed latitude" type="number" placeholder="-33.8688" step="any" defaultValue={initialShift?.allowedLatitude ?? ""} />
                  <Field name="allowedLongitude" label="Allowed longitude" type="number" placeholder="151.2093" step="any" defaultValue={initialShift?.allowedLongitude ?? ""} />
                  <Field name="allowedRadius" label="Radius metres" type="number" defaultValue={String(initialShift?.allowedRadiusM || "250")} placeholder="250" min="25" max="5000" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Start time</span>
                  <input name="start" type="datetime-local" required value={startValue} onChange={(event) => setStartValue(event.target.value)} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">End time</span>
                  <input name="end" type="datetime-local" required value={endValue} onChange={(event) => setEndValue(event.target.value)} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
                </label>
              </div>
              {!initialShift ? <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-ink">Recurring schedule</p>
                <p className="mt-1 text-xs text-slate-500">Create daily, weekly, fortnightly, or custom repeating shifts from the selected start/end time.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Select name="recurrenceType" label="Recurrence" options={recurrenceTypes} />
                  <Field name="recurrenceCount" label="Number of shifts" type="number" defaultValue="1" min="1" max="60" />
                  <Field name="customIntervalDays" label="Custom interval days" type="number" defaultValue="7" min="1" max="365" />
                </div>
              </div> : null}
              <Select name="status" label="Shift status" options={statuses} defaultValue={initialShift?.status || "Draft"} />
            </RecordForm>
          ) : (
            <EmptyWorkerState title="Participant and worker records required" message="Create at least one participant and one support worker before adding a shift." />
          )}
        </div>
      </div>
    </div>
  );
}

function RecordForm({ children, submitLabel, onSubmit }: { children: React.ReactNode; submitLabel: string; onSubmit: (form: FormData) => Promise<void> }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void onSubmit(new FormData(form)).then(() => form.reset());
  }
  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">{children}</div>
      <button className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d] sm:w-auto">
        <Plus className="h-4 w-4" />
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue = "",
  placeholder = "",
  type = "text",
  step,
  min,
  max,
  required = true
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} step={step} min={min} max={max} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function PasswordField({
  name,
  label,
  placeholder,
  show,
  setShow
}: {
  name: string;
  label: string;
  placeholder: string;
  show: boolean;
  setShow: (show: boolean) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
        <LockKeyhole className="h-5 w-5 text-slate-400" />
        <input name={name} type={show ? "text" : "password"} required minLength={6} placeholder={placeholder} className="w-full border-0 bg-transparent text-sm text-ink outline-none" />
        <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

function Area({ name, label, defaultValue = "", placeholder = "" }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required rows={3} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function OptionalArea({ name, label, defaultValue = "", placeholder = "" }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} rows={3} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  required = true,
  defaultValue = "",
  renderLabel
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
  defaultValue?: string;
  renderLabel?: (value: string) => string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {options.map((option) => (
          <option key={option || "empty"} value={option}>{renderLabel ? renderLabel(option) : option || "Leave unchanged"}</option>
        ))}
      </select>
    </label>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="file"
        multiple
        className="w-full rounded border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-gumleaf file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-gumleaf/40"
      />
      <span className="mt-2 block text-xs text-slate-500">Files are uploaded to private Supabase storage and opened through permission-checked links.</span>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ProfileSection({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "risk" }) {
  return (
    <article className={`rounded border p-5 shadow-sm ${tone === "risk" ? "border-coral/20 bg-coral/5" : "border-slate-200 bg-white"}`}>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{value || "Not recorded"}</p>
    </article>
  );
}

function CarePlanDetail({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "risk" }) {
  return (
    <div className={`mt-4 border-t pt-4 ${tone === "risk" ? "border-coral/20" : "border-slate-100"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === "risk" ? "text-coral" : "text-slate-400"}`}>{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{value || "Not recorded"}</p>
    </div>
  );
}

function ComplianceGrid({ worker }: { worker: WorkerRecord }) {
  const items = complianceItems(worker);
  return (
    <div className="mt-4 grid gap-2">
      {items.map((item) => {
        const status = expiryStatus(item.value);
        return (
          <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">{item.label}</p>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${expiryBadgeClass(status)}`}>{expiryLabel(status)}</span>
            </div>
            <p className="mt-1 text-slate-600">{item.value ? dateOnly(item.value) : "Not recorded"}</p>
          </div>
        );
      })}
      <Info label="Training certificates" value={worker.trainingCertificates || "Not recorded"} />
    </div>
  );
}

async function loadParticipants(): Promise<ParticipantRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapParticipantRow);
}

async function loadParticipantById(participantId: string): Promise<ParticipantRecord | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from("participants").select("*").eq("id", participantId).maybeSingle();
  if (error || !data) return null;
  return mapParticipantRow(data);
}

async function loadParticipantDocuments(participantName: string): Promise<ParticipantDocument[]> {
  if (!isSupabaseConfigured || !supabase || !participantName) return [];
  const { data, error } = await supabase
    .from("care_documents")
    .select("id, title, file_name, content_type, size_bytes, created_at")
    .eq("participant_name", participantName)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    fileName: String(row.file_name ?? ""),
    contentType: String(row.content_type ?? ""),
    sizeBytes: Number(row.size_bytes ?? 0),
    createdAt: String(row.created_at ?? "")
  }));
}

async function loadCarePlans(): Promise<CarePlanRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("care_plans").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    participantName: String(row.participant_name ?? ""),
    title: String(row.title ?? ""),
    goals: String(row.goals ?? ""),
    supportInstructions: String(row.support_instructions ?? ""),
    medicationInformation: String(row.medication_information ?? ""),
    mobilityRequirements: String(row.mobility_requirements ?? ""),
    participantPreferences: String(row.participant_preferences ?? ""),
    reviewDate: String(row.review_date ?? ""),
    status: String(row.status ?? "active"),
    createdAt: String(row.created_at ?? "")
  }));
}

function mapParticipantRow(row: Record<string, unknown>): ParticipantRecord {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    ndis: String(row.ndis_number ?? ""),
    plan: String(row.plan_type ?? ""),
    dateOfBirth: String(row.date_of_birth ?? ""),
    emergency: String(row.emergency_contact ?? ""),
    emergencyContacts: String(row.emergency_contacts ?? ""),
    needs: String(row.support_needs ?? ""),
    supportPlans: String(row.support_plans ?? ""),
    goals: String(row.goals ?? ""),
    riskInformation: String(row.risk_information ?? ""),
    medicalNotes: String(row.medical_notes ?? ""),
    allergies: String(row.allergies ?? ""),
    communicationPreferences: String(row.communication_preferences ?? ""),
    docs: Number(row.document_count ?? 0),
    notes: Number(row.note_count ?? 0)
  };
}

async function getCurrentUserContext(): Promise<{ role: UserRole; email: string }> {
  if (!supabase) return { role: "support_worker", email: "" };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { role: "support_worker", email: "" };
  let role = roleForUser(user.user_metadata?.role, user.email);
  if (!user.user_metadata?.role) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = roleForUser(profile?.role, user.email);
  }
  return { role, email: user.email ?? "" };
}

async function getCurrentUserName() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return "";
  if (user.user_metadata?.full_name) return String(user.user_metadata.full_name);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return String(profile?.full_name || user.email || user.id);
}

async function loadWorkers(): Promise<WorkerRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("support_workers").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  const shifts = await loadShifts();
  return data.map((row) => {
    const name = String(row.name ?? "");
    return {
      name,
      email: String(row.email ?? ""),
      role: String(row.role ?? ""),
      availability: String(row.availability ?? ""),
      qualifications: String(row.qualifications ?? ""),
      compliance: String(row.compliance_status ?? row.compliance ?? ""),
      policeCheckExpiry: String(row.police_check_expiry ?? ""),
      ndisWorkerScreeningExpiry: String(row.ndis_worker_screening_expiry ?? ""),
      firstAidExpiry: String(row.first_aid_expiry ?? ""),
      cprExpiry: String(row.cpr_expiry ?? ""),
      driversLicenceExpiry: String(row.drivers_licence_expiry ?? ""),
      trainingCertificates: String(row.training_certificates ?? ""),
      assigned: shifts.filter((shift) => shift.worker === name).length
    };
  });
}

async function loadWorkerAvailability(workerEmail?: string): Promise<AvailabilityRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("worker_availability").select("*").order("available_date", { ascending: true }).order("start_time", { ascending: true });
  if (workerEmail) query = query.eq("worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.worker_email}-${row.available_date}-${row.start_time}`),
    workerName: String(row.worker_name ?? ""),
    workerEmail: String(row.worker_email ?? ""),
    date: String(row.available_date ?? ""),
    startTime: normalizeTime(String(row.start_time ?? "")),
    endTime: normalizeTime(String(row.end_time ?? "")),
    status: String(row.availability_status ?? "available"),
    notes: String(row.notes ?? "")
  }));
}

async function loadWorkerLeave(workerEmail?: string): Promise<LeaveRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("worker_leave_requests").select("*").order("starts_at", { ascending: false });
  if (workerEmail) query = query.eq("worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.worker_email}-${row.starts_at}`),
    workerName: String(row.worker_name ?? ""),
    workerEmail: String(row.worker_email ?? ""),
    leaveType: String(row.leave_type ?? "unavailable"),
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
    reason: String(row.reason ?? ""),
    status: String(row.status ?? "pending"),
    reviewedByEmail: String(row.reviewed_by_email ?? ""),
    reviewedAt: String(row.reviewed_at ?? ""),
    reviewNotes: String(row.review_notes ?? "")
  }));
}

async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      activeParticipants: 0,
      activeStaff: 0,
      completedShifts: 0,
      pendingIncidents: 0,
      outstandingInvoices: 0,
      serviceHoursDelivered: 0,
      workerUtilisationPercent: 0,
      fundingUsagePercent: 0,
      attendanceRatePercent: 0,
      scheduledShiftHours: 0,
      deliveredShiftHours: 0
    };
  }

  const [participantCount, staffCount, shiftRows, incidentRows, invoiceRows, fundingRows] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("support_workers").select("id", { count: "exact", head: true }),
    supabase.from("shifts").select("status, approval_status, starts_at, ends_at, clock_in_at, clock_out_at"),
    supabase.from("incident_reports").select("status"),
    supabase.from("invoices").select("status"),
    supabase.from("ndis_funding_records").select("plan_total_budget, spent_amount")
  ]);

  const shifts = shiftRows.data ?? [];
  const completedRows = shifts.filter((shift) => {
    const status = String(shift.status ?? "").toLowerCase();
    const approvalStatus = String(shift.approval_status ?? "").toLowerCase();
    return Boolean(shift.clock_out_at) || status === "completed" || status === "approved for payroll" || approvalStatus === "approved";
  });
  const completedShifts = completedRows.length;
  const activeShiftRows = shifts.filter((shift) => !["cancelled", "canceled"].includes(String(shift.status ?? "").toLowerCase()));
  const scheduledShiftHours = activeShiftRows.reduce((sum, shift) => sum + shiftHours(String(shift.starts_at ?? ""), String(shift.ends_at ?? "")), 0);
  const deliveredShiftHours = completedRows.reduce((sum, shift) => sum + shiftHours(String(shift.starts_at ?? ""), String(shift.ends_at ?? "")), 0);
  const attendedShiftCount = activeShiftRows.filter((shift) => Boolean(shift.clock_in_at || shift.clock_out_at) || completedRows.includes(shift)).length;

  const pendingIncidents = incidentRows.data?.filter((incident) => {
    const status = String(incident.status ?? "").toLowerCase();
    return !["closed", "resolved", "complete", "completed"].includes(status);
  }).length ?? 0;

  const outstandingInvoices = invoiceRows.data?.filter((invoice) => {
    const status = String(invoice.status ?? "").toLowerCase();
    return !["paid", "closed", "void", "cancelled", "canceled"].includes(status);
  }).length ?? 0;

  const fundingTotal = fundingRows.data?.reduce((sum, row) => sum + Number(row.plan_total_budget ?? 0), 0) ?? 0;
  const fundingSpent = fundingRows.data?.reduce((sum, row) => sum + Number(row.spent_amount ?? 0), 0) ?? 0;

  return {
    activeParticipants: participantCount.count ?? 0,
    activeStaff: staffCount.count ?? 0,
    completedShifts,
    pendingIncidents,
    outstandingInvoices,
    serviceHoursDelivered: roundMetric(deliveredShiftHours),
    workerUtilisationPercent: scheduledShiftHours > 0 ? Math.round((deliveredShiftHours / scheduledShiftHours) * 100) : 0,
    fundingUsagePercent: fundingTotal > 0 ? Math.round((fundingSpent / fundingTotal) * 100) : 0,
    attendanceRatePercent: activeShiftRows.length > 0 ? Math.round((attendedShiftCount / activeShiftRows.length) * 100) : 0,
    scheduledShiftHours: roundMetric(scheduledShiftHours),
    deliveredShiftHours: roundMetric(deliveredShiftHours)
  };
}

async function loadProgressNotes(workerEmail?: string): Promise<ProgressNoteRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("progress_notes").select("*").order("created_at", { ascending: false });
  if (workerEmail) query = query.eq("worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  const goalIds = Array.from(new Set(data.map((row) => String(row.participant_goal_id ?? "")).filter(Boolean)));
  const goalTitleMap = await loadGoalTitleMap(goalIds);
  return data.map((row) => ({
    id: String(row.id ?? `${row.participant_name}-${row.created_at}`),
    participantGoalId: String(row.participant_goal_id ?? ""),
    participantGoalTitle: goalTitleMap.get(String(row.participant_goal_id ?? "")) ?? "",
    completedActivity: Boolean(row.completed_activity),
    goalProgressIncrement: Number(row.goal_progress_increment ?? 0),
    participantName: String(row.participant_name ?? ""),
    workerName: String(row.worker_name ?? ""),
    workerEmail: String(row.worker_email ?? ""),
    serviceDate: String(row.service_date ?? ""),
    startTime: normalizeTime(String(row.start_time ?? "")),
    endTime: normalizeTime(String(row.end_time ?? "")),
    category: String(row.category ?? ""),
    note: String(row.note ?? ""),
    outcomes: String(row.outcomes ?? ""),
    signature: String(row.digital_signature ?? ""),
    templateName: String(row.template_name ?? ""),
    templateValues: asStringRecord(row.template_values),
    outcomeTracking: asStringRecord(row.outcome_tracking),
    isImportant: Boolean(row.is_important),
    createdAt: String(row.created_at ?? "")
  }));
}

async function loadParticipantGoals(workerEmail?: string): Promise<ParticipantGoalOption[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("participant_goals").select("id, participant_name, title, current_progress_percent, status").order("participant_name", { ascending: true });
  if (workerEmail) {
    const shifts = await loadShifts(workerEmail);
    const participantNames = Array.from(new Set(shifts.map((shift) => shift.participantName).filter(Boolean)));
    if (!participantNames.length) return [];
    query = query.in("participant_name", participantNames);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    participantName: String(row.participant_name ?? ""),
    title: String(row.title ?? ""),
    currentProgressPercent: Number(row.current_progress_percent ?? 0),
    status: String(row.status ?? "active")
  }));
}

async function loadGoalTitleMap(goalIds: string[]) {
  const map = new Map<string, string>();
  if (!goalIds.length || !isSupabaseConfigured || !supabase) return map;
  const { data } = await supabase.from("participant_goals").select("id, participant_name, title").in("id", goalIds);
  for (const row of data ?? []) {
    map.set(String(row.id ?? ""), `${String(row.participant_name ?? "")}: ${String(row.title ?? "")}`);
  }
  return map;
}

async function loadProgressNoteTemplates(): Promise<ProgressNoteTemplate[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("progress_note_templates")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? "General"),
    fieldSchema: normaliseTemplateFields(row.field_schema),
    outcomeSchema: normaliseTemplateFields(row.outcome_schema),
    requiresSignature: Boolean(row.requires_signature),
    status: String(row.status ?? "active")
  }));
}

async function loadIncidentRecords(workerEmail?: string): Promise<IncidentManagementRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("incident_reports").select("*").order("created_at", { ascending: false });
  if (workerEmail) query = query.eq("worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.participant_name}-${row.created_at}`),
    incidentNumber: String(row.incident_number ?? ""),
    participantName: String(row.participant_name ?? ""),
    workerName: String(row.worker_name ?? ""),
    workerEmail: String(row.worker_email ?? ""),
    staffInvolved: String(row.staff_involved ?? row.worker_name ?? ""),
    severity: String(row.severity ?? row.priority ?? ""),
    incidentDate: String(row.incident_date ?? ""),
    incidentTime: normalizeTime(String(row.incident_time ?? "")),
    location: String(row.location ?? ""),
    summary: String(row.summary ?? ""),
    investigationNotes: String(row.investigation_notes ?? ""),
    reportableToCommission: Boolean(row.reportable_to_commission),
    reportableIncidentType: String(row.reportable_incident_type ?? ""),
    notificationDueAt: String(row.notification_due_at ?? ""),
    ndisNotifiedAt: String(row.ndis_notified_at ?? ""),
    immediateActions: String(row.immediate_actions ?? ""),
    impactedPersonSupported: String(row.impacted_person_supported ?? ""),
    participantInformed: String(row.participant_informed ?? ""),
    guardianNotified: String(row.guardian_notified ?? ""),
    correctiveActions: String(row.corrective_actions ?? ""),
    escalationStatus: String(row.escalation_status ?? "none"),
    managerNotifiedAt: String(row.manager_notified_at ?? ""),
    investigationCompletedAt: String(row.investigation_completed_at ?? ""),
    status: String(row.status ?? "Submitted"),
    attachmentNames: Array.isArray(row.attachment_names) ? (row.attachment_names as unknown[]).map((name) => String(name)) : [],
    createdAt: String(row.created_at ?? "")
  }));
}

async function loadShifts(workerEmail?: string): Promise<ShiftRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("shifts").select("*").order("starts_at", { ascending: true });
  if (workerEmail) query = query.eq("support_worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const participantName = String(row.participant_name ?? "");
    const startsAt = String(row.starts_at ?? "");
    const endsAt = String(row.ends_at ?? "");
    return {
      id: String(row.id ?? `${participantName}-${startsAt}`),
      participant: shortName(participantName),
      participantName,
      worker: String(row.support_worker_name ?? ""),
      workerEmail: String(row.support_worker_email ?? ""),
      location: String(row.location ?? ""),
      status: String(row.status ?? ""),
      startsAt,
      endsAt,
      approvalStatus: String(row.approval_status ?? "not_submitted"),
      clockInAt: String(row.clock_in_at ?? ""),
      clockOutAt: String(row.clock_out_at ?? ""),
      allowedLatitude: String(row.allowed_latitude ?? ""),
      allowedLongitude: String(row.allowed_longitude ?? ""),
      allowedRadiusM: String(row.allowed_radius_m ?? ""),
      clockInLatitude: String(row.clock_in_latitude ?? ""),
      clockInLongitude: String(row.clock_in_longitude ?? ""),
      clockInDistanceM: String(row.clock_in_distance_m ?? ""),
      clockOutLatitude: String(row.clock_out_latitude ?? ""),
      clockOutLongitude: String(row.clock_out_longitude ?? ""),
      clockOutDistanceM: String(row.clock_out_distance_m ?? ""),
      recurrenceSeriesId: String(row.recurrence_series_id ?? ""),
      recurrenceType: String(row.recurrence_type ?? "single"),
      recurrenceIntervalDays: String(row.recurrence_interval_days ?? ""),
      recurrenceCount: String(row.recurrence_count ?? "1"),
      recurrencePosition: String(row.recurrence_position ?? "1"),
      submittedAt: String(row.submitted_at ?? ""),
      submittedByEmail: String(row.submitted_by_email ?? ""),
      approvedAt: String(row.approved_at ?? ""),
      approvedByEmail: String(row.approved_by_email ?? ""),
      rejectionReason: String(row.rejection_reason ?? ""),
      payrollReadyAt: String(row.payroll_ready_at ?? ""),
      workerSignature: String(row.worker_signature ?? ""),
      workerSignedAt: String(row.worker_signed_at ?? ""),
      participantSignature: String(row.participant_signature ?? ""),
      participantSignedAt: String(row.participant_signed_at ?? ""),
      signatureCapturedByEmail: String(row.signature_captured_by_email ?? ""),
      time: `${timeOnly(startsAt)} - ${timeOnly(endsAt)}`
    };
  });
}

async function loadParticipantsForShifts(shifts: ShiftRecord[]): Promise<ParticipantRecord[]> {
  const names = Array.from(new Set(shifts.map((shift) => shift.participantName).filter(Boolean)));
  if (!names.length || !isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("participants").select("*").in("name", names);
  if (error || !data) return [];
  return data.map(mapParticipantRow);
}

async function loadModuleItems(kind: ModuleKind): Promise<ModuleItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  if (kind === "incidents") {
    const { data, error } = await supabase.from("incident_reports").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id ?? `${row.participant_name}-${row.created_at}`),
      title: `${String(row.priority ?? "Incident")}: ${String(row.participant_name ?? "Participant")}`,
      details: String(row.summary ?? ""),
      status: String(row.status ?? "submitted")
    }));
  }
  if (kind === "notes") {
    const { data, error } = await supabase.from("progress_notes").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id ?? `${row.participant_name}-${row.created_at}`),
      title: `${String(row.category ?? "Progress note")}: ${String(row.participant_name ?? "Participant")}`,
      details: String(row.note ?? ""),
      status: row.is_important ? "important" : "standard"
    }));
  }
  const { data, error } = await supabase.from("module_records").select("*").eq("module", kind).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.title}-${row.created_at}`),
    title: String(row.title ?? ""),
    details: String(row.details ?? ""),
    status: String(row.status ?? "active")
  }));
}

async function persist(table: string, payload: Record<string, unknown>, setNotice: (message: string) => void, audit?: Omit<AuditPayload, "tableName">) {
  if (!isSupabaseConfigured || !supabase) {
    setNotice("Supabase is not connected, so the record was not saved.");
    return false;
  }
  const { data, error } = await supabase.from(table).insert(payload).select("id").maybeSingle();
  setNotice(error ? friendlyDatabaseError(error.message, table) : `Saved to ${table}.`);
  if (!error && audit) {
    await recordAudit({
      ...audit,
      tableName: table,
      recordId: String(data?.id ?? audit.recordId ?? ""),
      metadata: {
        ...audit.metadata,
        table
      }
    });
  }
  return !error;
}

async function postJson(path: string, payload: Record<string, unknown>, setNotice: (message: string) => void) {
  if (!isSupabaseConfigured || !supabase) {
    setNotice("Supabase is not connected, so the record was not saved.");
    return false;
  }
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    setNotice("Please sign in again before saving this record.");
    return false;
  }
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({ message: "Save failed." }));
  setNotice(result.message);
  return response.ok;
}

async function patchJson(path: string, payload: Record<string, unknown>, setNotice: (message: string) => void) {
  if (!isSupabaseConfigured || !supabase) {
    setNotice("Supabase is not connected, so the record was not updated.");
    return false;
  }
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    setNotice("Please sign in again before updating this record.");
    return false;
  }
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({ message: "Update failed." }));
  setNotice(result.message);
  return response.ok;
}

async function runShiftWorkflow(
  shiftId: string,
  action: "submit" | "approve" | "reject",
  setNotice: (message: string) => void,
  reason = "",
  signatures?: { workerSignature: string; participantSignature: string }
) {
  if (!supabase) {
    setNotice("Supabase is not connected, so the shift was not updated.");
    return false;
  }
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    setNotice("Please sign in again before updating this shift.");
    return false;
  }
  const response = await fetch(`/api/shifts/${shiftId}/workflow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, reason, ...signatures })
  });
  const result = await response.json().catch(() => ({ message: "Shift workflow update failed." }));
  setNotice(response.ok ? result.message : result.message);
  return response.ok;
}

async function runShiftClock(shiftId: string, action: "in" | "out", setNotice: (message: string) => void) {
  if (!supabase) {
    setNotice("Supabase is not connected, so clocking was not saved.");
    return false;
  }
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    setNotice("Please sign in again before clocking this shift.");
    return false;
  }
  setNotice("Requesting GPS location for shift clocking.");
  const gps = await getBrowserGpsLocation();
  if (!gps) {
    setNotice("GPS location is required. Allow location access in your browser or phone settings, then try again.");
    return false;
  }
  const response = await fetch(`/api/shifts/${shiftId}/clock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, ...gps })
  });
  const result = await response.json().catch(() => ({ message: "Clock action failed." }));
  setNotice(result.message);
  return response.ok;
}

async function getBrowserGpsLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

function friendlyDatabaseError(message: string, table: string) {
  const lower = message.toLowerCase();
  if (lower.includes("could not find the table") || lower.includes("schema cache")) {
    return `Database setup required: the "${table}" table is missing in Supabase. Run supabase/schema.sql in the Supabase SQL Editor, then try again.`;
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return `Permission denied by database security rules for "${table}". Check your role or assigned participant access.`;
  }
  if (lower.includes("permission denied")) {
    return `Database permission denied for "${table}". Check Supabase RLS policies and user role.`;
  }
  return `Database save failed: ${message}`;
}

function canSubmitShift(shift: ShiftRecord) {
  return ["not_submitted", "rejected"].includes(shift.approvalStatus) && Boolean(shift.clockOutAt) && !["Draft", "Offered"].includes(shift.status);
}

function approvalLabel(status: string) {
  return {
    not_submitted: "Not submitted",
    submitted: "Submitted for approval",
    approved: "Payroll ready",
    rejected: "Rejected"
  }[status] ?? status;
}

function approvalBadgeClass(status: string) {
  return {
    submitted: "bg-banksia/20 text-slate-700",
    approved: "bg-gumleaf/10 text-gumleaf",
    rejected: "bg-coral/10 text-coral",
    not_submitted: "bg-slate-100 text-slate-700"
  }[status] ?? "bg-slate-100 text-slate-700";
}

function moduleContent(kind: ModuleKind) {
  return {
    timesheets: {
      title: "Timesheets",
      eyebrow: "Approve staff time and allowances."
    },
    notes: {
      title: "Progress Notes",
      eyebrow: "Record goals, outcomes, and daily support details."
    },
    incidents: {
      title: "Incident Reports",
      eyebrow: "Track incidents, review actions, and manager sign-off."
    },
    invoices: {
      title: "Invoices",
      eyebrow: "Prepare NDIS and plan manager billing."
    },
    documents: {
      title: "Documents",
      eyebrow: "Store service agreements, care plans, and compliance evidence."
    },
    settings: {
      title: "Settings",
      eyebrow: "Configure provider operations."
    }
  }[kind];
}

function submitLabelForKind(kind: ModuleKind) {
  return {
    timesheets: "Add timesheet item",
    notes: "Add progress note",
    incidents: "Submit incident",
    invoices: "Add invoice item",
    documents: "Add document record",
    settings: "Save setting"
  }[kind];
}

function titleLabelForKind(kind: ModuleKind) {
  return {
    timesheets: "Timesheet item",
    notes: "Progress note title",
    incidents: "Incident title",
    invoices: "Invoice title",
    documents: "Document title",
    settings: "Setting name"
  }[kind];
}

function detailsPlaceholderForKind(kind: ModuleKind) {
  return {
    timesheets: "Enter shift time, break, allowance, and travel claim details.",
    notes: "Enter participant goals, outcomes, changes, and follow-up details.",
    incidents: "Describe incident, immediate action, people notified, and follow-up required.",
    invoices: "Enter NDIS line item and billing details.",
    documents: "Enter document name, owner, expiry, or upload follow-up details.",
    settings: "Enter organisation setting details for operations review."
  }[kind];
}

function get(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function readTemplateValues(form: FormData, fields: ProgressTemplateField[], prefix: "template" | "outcome") {
  return fields.reduce<Record<string, string>>((values, field) => {
    values[field.id] = get(form, `${prefix}_${field.id}`);
    return values;
  }, {});
}

function normaliseTemplateFields(value: unknown): ProgressTemplateField[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<ProgressTemplateField[]>((fields, item) => {
      if (!item || typeof item !== "object") return fields;
      const field = item as Record<string, unknown>;
      const id = String(field.id ?? "").trim();
      const label = String(field.label ?? "").trim();
      if (!id || !label) return fields;
      const options = Array.isArray(field.options) ? field.options.map((option) => String(option)).filter(Boolean) : undefined;
      fields.push({
        id,
        label,
        type: String(field.type ?? "text").trim() || "text",
        required: Boolean(field.required),
        options
      });
      return fields;
    }, []);
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((record, [key, entry]) => {
    record[key] = String(entry ?? "");
    return record;
  }, {});
}

function humaniseKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeOnly(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return value.split("T")[1] || value;
}

function dateOnly(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function shiftHours(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function formatHours(value: number) {
  return `${roundMetric(value)}h`;
}

function dateTimeOrFallback(value: string) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function friendlyEscalationStatus(value: string) {
  const labels: Record<string, string> = {
    none: "No escalation required",
    manager_notified: "Manager notified",
    investigation_required: "Investigation required before closure",
    ready_to_close: "Investigation complete, ready to close",
    closed: "Closed after investigation"
  };
  return labels[value] ?? humaniseKey(value || "not recorded");
}

function goalLabel(goals: ParticipantGoalOption[], id: string) {
  if (!id) return "No linked goal";
  const goal = goals.find((item) => item.id === id);
  if (!goal) return id;
  return `${goal.participantName}: ${goal.title} (${Math.round(goal.currentProgressPercent)}%)`;
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeTime(value: string) {
  if (!value) return "";
  return value.slice(0, 5);
}

function formatDateLabel(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatTimeRange(start: string, end: string) {
  return `${normalizeTime(start) || "start"} - ${normalizeTime(end) || "end"}`;
}

function toDateTimeLocal(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${normalizeTime(time)}`;
}

function friendlyAvailability(status: string) {
  if (status === "preferred") return "Preferred";
  if (status === "unavailable") return "Unavailable";
  return "Available";
}

function availabilityBadge(status: string) {
  if (status === "preferred") return "bg-banksia/30 text-ink";
  if (status === "unavailable") return "bg-coral/10 text-coral";
  return "bg-gumleaf/10 text-gumleaf";
}

function friendlyLeaveType(value: string) {
  if (value === "annual_leave") return "Annual leave";
  if (value === "sick_leave") return "Sick leave";
  return "Unavailable period";
}

function friendlyLeaveStatus(value: string) {
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  if (value === "cancelled") return "Cancelled";
  return "Pending";
}

function leaveStatusBadge(status: string) {
  if (status === "approved") return "bg-gumleaf/10 text-gumleaf";
  if (status === "rejected" || status === "cancelled") return "bg-coral/10 text-coral";
  return "bg-banksia/30 text-ink";
}

function complianceItems(worker: WorkerRecord) {
  return [
    { label: "Police check", value: worker.policeCheckExpiry },
    { label: "NDIS worker screening", value: worker.ndisWorkerScreeningExpiry },
    { label: "First aid certificate", value: worker.firstAidExpiry },
    { label: "CPR", value: worker.cprExpiry },
    { label: "Driver's licence", value: worker.driversLicenceExpiry }
  ];
}

function recurringSeriesSummaries(shifts: ShiftRecord[]) {
  const groups = new Map<string, ShiftRecord[]>();
  shifts.forEach((shift) => {
    if (!shift.recurrenceSeriesId) return;
    groups.set(shift.recurrenceSeriesId, [...(groups.get(shift.recurrenceSeriesId) ?? []), shift]);
  });
  return Array.from(groups.entries()).map(([id, group]) => {
    const ordered = [...group].sort((a, b) => new Date(a.startsAt ?? "").getTime() - new Date(b.startsAt ?? "").getTime());
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    return {
      id,
      participantName: first?.participantName || "Participant",
      workerName: first?.worker || "Support worker",
      location: first?.location || "",
      type: first?.recurrenceType || "custom",
      intervalDays: Number(first?.recurrenceIntervalDays || 0),
      count: ordered.length,
      firstStart: first?.startsAt || "",
      lastStart: last?.startsAt || "",
      allowedLatitude: first?.allowedLatitude || "",
      allowedLongitude: first?.allowedLongitude || "",
      allowedRadiusM: first?.allowedRadiusM || ""
    };
  });
}

function friendlyRecurrence(type: string, intervalDays: number, count: number) {
  if (type === "daily") return `Daily, ${count} shifts`;
  if (type === "weekly") return `Weekly, ${count} shifts`;
  if (type === "fortnightly") return `Fortnightly, ${count} shifts`;
  if (type === "custom") return `Every ${intervalDays || "custom"} day${intervalDays === 1 ? "" : "s"}, ${count} shifts`;
  return `${count} shifts`;
}

function workerComplianceAlerts(worker: WorkerRecord) {
  return complianceItems(worker)
    .map((item) => {
      const status = expiryStatus(item.value);
      if (status !== "expired" && status !== "due_soon") return null;
      const days = daysUntil(item.value);
      return {
        worker: worker.name || worker.email,
        label: item.label,
        status,
        message: status === "expired" ? `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago` : `expires in ${days} day${days === 1 ? "" : "s"}`
      };
    })
    .filter((alert): alert is { worker: string; label: string; status: "expired" | "due_soon"; message: string } => Boolean(alert));
}

function expiryStatus(value: string): "missing" | "expired" | "due_soon" | "current" {
  if (!value) return "missing";
  const days = daysUntil(value);
  if (Number.isNaN(days)) return "missing";
  if (days < 0) return "expired";
  if (days <= 60) return "due_soon";
  return "current";
}

function daysUntil(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function expiryLabel(status: string) {
  if (status === "expired") return "Expired";
  if (status === "due_soon") return "Due soon";
  if (status === "missing") return "Missing";
  return "Current";
}

function expiryBadgeClass(status: string) {
  if (status === "expired") return "bg-coral/10 text-coral";
  if (status === "due_soon") return "bg-banksia/30 text-ink";
  if (status === "missing") return "bg-slate-100 text-slate-500";
  return "bg-gumleaf/10 text-gumleaf";
}

function generateIncidentNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = String(now.getTime()).slice(-5);
  return `INC-${date}-${stamp}`;
}

function shortName(name: string) {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SW";
}

function isTodayShift(shift: ShiftRecord) {
  if (!shift.startsAt) return false;
  const shiftDate = new Date(shift.startsAt);
  const today = new Date();
  return dateKey(shiftDate) === dateKey(today);
}

function dateKey(value?: string | Date) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function weekDays(anchor = new Date()) {
  const monday = new Date(anchor);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label: date.toLocaleDateString("en-AU", { weekday: "short" }),
      date: date.toLocaleDateString("en-AU", { day: "numeric" }),
      key: dateKey(date)
    };
  });
}

function monthCalendarDays(anchor = new Date()) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstMonday = new Date(firstOfMonth);
  const weekday = firstMonday.getDay() || 7;
  firstMonday.setDate(firstMonday.getDate() - weekday + 1);
  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(firstMonday);
    date.setDate(firstMonday.getDate() + index);
    return {
      label: date.toLocaleDateString("en-AU", { weekday: "short" }),
      date: date.toLocaleDateString("en-AU", { day: "numeric" }),
      key: dateKey(date),
      currentMonth: date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear()
    };
  });
}

function sameMonth(value: string | undefined, anchor: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear();
}

function monthYear(date = new Date()) {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function formatToday() {
  return new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
