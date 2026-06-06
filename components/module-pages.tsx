"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BriefcaseMedical,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Download,
  Eye,
  EyeOff,
  FileText,
  FilePlus2,
  Filter,
  Home,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { InvoiceManagementPage } from "@/components/invoice-management-page";
import { StatCard } from "@/components/stat-card";
import { recordAudit, type AuditPayload } from "@/lib/audit";
import { isAdminRole, roleForUser, type UserRole } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ParticipantRecord = {
  id: string;
  name: string;
  ndis: string;
  plan: string;
  dateOfBirth: string;
  medicareNumber: string;
  displayName: string;
  preferredName: string;
  personAlias: string;
  otherIdentifier: string;
  gender: string;
  sex: string;
  primaryAddress: string;
  postalAddress: string;
  mobileNumber: string;
  phoneNumber: string;
  email: string;
  secondaryEmail: string;
  preferredContactMethod: string;
  languages: string;
  culturalIdentity: string;
  religion: string;
  maritalStatus: string;
  nationality: string;
  ethnicity: string;
  aboriginalTorresStraitIslander: string;
  placeOfBirth: string;
  joinedDate: string;
  nextReviewDate: string;
  clientStatus: string;
  emergency: string;
  emergencyContacts: string;
  needs: string;
  supportPlans: string;
  goals: string;
  riskInformation: string;
  requirements: string;
  preferences: string;
  needToKnowInformation: string;
  usefulInformation: string;
  environmentalDetails: string;
  psychologicalDetails: string;
  sensoryDetails: string;
  bmi: string;
  medicalNotes: string;
  allergies: string;
  communicationPreferences: string;
  clientType: string;
  shareProgressNotes: boolean;
  enableSmsReminders: boolean;
  invoiceTravel: boolean;
  privateInfo: string;
  docs: number;
  notes: number;
};

type EmergencyContactRecord = {
  id: string;
  participantName: string;
  contactName: string;
  relationship: string;
  phone: string;
  email: string;
  priority: string;
  consentToContact: boolean;
  notes: string;
  status: string;
  createdAt: string;
};

type ParticipantDocument = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type ParticipantTimelineItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  occurredAt: string;
};

type ParticipantProfileShift = {
  id: string;
  worker: string;
  location: string;
  status: string;
  approvalStatus: string;
  startsAt: string;
  endsAt: string;
};

type ParticipantProfileCarePlan = {
  id: string;
  title: string;
  status: string;
  reviewDate: string;
};

type ParticipantProfileGoal = {
  id: string;
  title: string;
  progress: number;
  status: string;
  targetDate: string;
};

type ParticipantProfileFunding = {
  id: string;
  category: string;
  totalBudget: number;
  spentAmount: number;
  status: string;
  planEnd: string;
};

type ParticipantProfileInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
};

type ParticipantProfileRisk = {
  id: string;
  level: string;
  status: string;
  reviewDate: string;
  assessmentDate: string;
};

type ParticipantProfileTask = {
  id: string;
  title: string;
  assignedWorker: string;
  dueDate: string;
  status: string;
  priority: string;
};

type ParticipantRelatedRecords = {
  shifts: ParticipantProfileShift[];
  carePlans: ParticipantProfileCarePlan[];
  goals: ParticipantProfileGoal[];
  funding: ParticipantProfileFunding[];
  invoices: ParticipantProfileInvoice[];
  risks: ParticipantProfileRisk[];
  tasks: ParticipantProfileTask[];
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
  id: string;
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
  workingWithChildrenExpiry: string;
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

type ShiftMatch = {
  name: string;
  email: string;
  score: number;
  reasons: string[];
};

type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResultLike = { 0?: SpeechRecognitionResultItem };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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

type DashboardPlanReview = {
  id: string;
  participantName: string;
  title: string;
  reviewDate: string;
  status: string;
};

type DashboardComplianceAlert = {
  worker: string;
  label: string;
  status: "expired" | "due_soon";
  message: string;
};

type DashboardActivity = {
  id: string;
  action: string;
  label: string;
  actor: string;
  createdAt: string;
};

type DashboardOverview = {
  planReviews: DashboardPlanReview[];
  complianceAlerts: DashboardComplianceAlert[];
  recentActivity: DashboardActivity[];
};

const statuses = ["Draft", "Open", "Unfilled", "Offered", "Confirmed", "In progress", "Completed", "Cancelled"];
const rosterStatusFilters = [
  { label: "All status", value: "all", colour: "bg-slate-300" },
  { label: "Pending", value: "Draft", colour: "bg-coral" },
  { label: "Open", value: "open", colour: "bg-[#6366f1]" },
  { label: "Unfilled", value: "unfilled", colour: "bg-[#eab308]" },
  { label: "Cancelled", value: "Cancelled", colour: "bg-[#f59e0b]" },
  { label: "Booked", value: "Confirmed", colour: "bg-[#00a85a]" },
  { label: "Approved", value: "Completed", colour: "bg-[#00a85a]" },
  { label: "Rejected", value: "Rejected", colour: "bg-[#dc2626]" },
  { label: "Invoiced", value: "Invoiced", colour: "bg-[#1c9ec2]" }
];
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
  const [overview, setOverview] = useState<DashboardOverview>({
    planReviews: [],
    complianceAlerts: [],
    recentActivity: []
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setNotice("Connect Supabase to show live records.");
        return;
      }
      const [loadedShifts, loadedMetrics, loadedOverview] = await Promise.all([
        loadShifts(),
        loadDashboardMetrics(),
        loadDashboardOverview()
      ]);
      if (!active) return;
      setShifts(loadedShifts);
      setMetrics(loadedMetrics);
      setOverview(loadedOverview);
      setNotice("");
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const todaysShifts = useMemo(() => shifts.filter(isTodayShift), [shifts]);
  const unfilledShifts = useMemo(() => shifts.filter((shift) => isUnfilledShift(shift)).length, [shifts]);
  const staffOnDuty = useMemo(() => new Set(todaysShifts.map((shift) => shift.workerEmail || shift.worker).filter(Boolean)).size, [todaysShifts]);
  const pendingTimesheets = useMemo(() => shifts.filter((shift) => isPendingTimesheetShift(shift)).length, [shifts]);
  const dashboardAlerts = useMemo(() => buildDashboardAlerts(unfilledShifts, metrics.pendingIncidents, pendingTimesheets, overview), [metrics.pendingIncidents, overview, pendingTimesheets, unfilledShifts]);
  const metricCards = [
    { label: "Today's Shifts", value: String(todaysShifts.length), delta: todaysShifts.length ? "Scheduled for today" : "No shifts today", tone: "harbour", icon: CalendarDays, href: "/rostering", actionLabel: "Open roster" },
    { label: "Unfilled Shifts", value: String(unfilledShifts), delta: unfilledShifts ? "Need allocation" : "No unfilled shifts", tone: "coral", icon: AlertTriangle, href: "/rostering?status=unfilled", actionLabel: "Allocate" },
    { label: "Active Participants", value: String(metrics.activeParticipants), delta: metrics.activeParticipants ? "Participant records" : "No active participants", tone: "gumleaf", icon: ShieldCheck, href: "/participants", actionLabel: "Open" },
    { label: "Staff On Duty", value: String(staffOnDuty), delta: staffOnDuty ? "Workers rostered today" : "No staff on duty", tone: "banksia", icon: Users, href: "/support-workers", actionLabel: "View staff" },
    { label: "Pending Timesheets", value: String(pendingTimesheets), delta: pendingTimesheets ? "Need review" : "No pending review", tone: "harbour", icon: ClipboardPlus, href: "/timesheets", actionLabel: "Review" },
    { label: "Incidents Requiring Review", value: String(metrics.pendingIncidents), delta: metrics.pendingIncidents ? "Open incident records" : "No pending incidents", tone: "coral", icon: AlertTriangle, href: "/incident-reports", actionLabel: "Review" }
  ];

  return (
    <AppShell title="Dashboard" eyebrow={notice}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metricCards.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ShiftTable
          title="Today's Schedule"
          shifts={todaysShifts}
          emptyMessage="No shifts are scheduled for today."
          actionHref="/rostering?new=shift"
          actionLabel="Create shift"
          rowHref={(shift) => `/rostering?shift=${encodeURIComponent(shift.id)}`}
        />
        <AlertsPanel alerts={dashboardAlerts} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <QuickActions />
        <ShiftOverviewChart shifts={shifts} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <UpcomingPlanReviews reviews={overview.planReviews} />
        <ComplianceExpiry alerts={overview.complianceAlerts} />
        <RecentActivityList activities={overview.recentActivity} />
      </div>
      <ManagementAnalytics metrics={metrics} todaysShiftCount={todaysShifts.length} />
    </AppShell>
  );
}

function AlertsPanel({ alerts }: { alerts: Array<{ title: string; message: string; tone: "coral" | "banksia" | "gumleaf" | "harbour"; href: string }> }) {
  return (
    <DashboardPanel title="Alerts & Notifications" icon={Bell}>
      {alerts.length ? (
        <div className="grid gap-3">
          {alerts.map((alert) => (
            <Link key={`${alert.title}-${alert.href}`} href={alert.href} className={`rounded-lg border p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${alertToneClass(alert.tone)}`}>
              <p className="font-semibold text-ink">{alert.title}</p>
              <p className="mt-1 leading-6 text-slate-600">{alert.message}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No active alerts" message="Alerts will appear here when shifts, incidents, compliance, or plan reviews need attention." />
      )}
    </DashboardPanel>
  );
}

function ShiftOverviewChart({ shifts }: { shifts: ShiftRecord[] }) {
  const rows = [
    { label: "Confirmed", count: shifts.filter((shift) => shift.status.toLowerCase() === "confirmed").length, tone: "bg-indigo-300" },
    { label: "In progress", count: shifts.filter((shift) => shift.status.toLowerCase() === "in progress").length, tone: "bg-sky-300" },
    { label: "Completed", count: shifts.filter((shift) => ["completed", "approved for payroll"].includes(shift.status.toLowerCase())).length, tone: "bg-emerald-300" },
    { label: "Unfilled", count: shifts.filter((shift) => isUnfilledShift(shift)).length, tone: "bg-rose-300" },
    { label: "Cancelled", count: shifts.filter((shift) => shift.status.toLowerCase() === "cancelled").length, tone: "bg-slate-300" }
  ];
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <DashboardPanel title="Shift Overview chart" icon={BarChart3}>
      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{row.label}</span>
              <span className="text-slate-500">{row.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-indigo-50">
              <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

function UpcomingPlanReviews({ reviews }: { reviews: DashboardPlanReview[] }) {
  return (
    <DashboardPanel title="Upcoming Plan Reviews" icon={CalendarDays}>
      {reviews.length ? (
        <div className="grid gap-3">
          {reviews.map((review) => {
            const days = daysUntil(review.reviewDate);
            const urgency = days < 0 ? "border-coral/30 bg-coral/5" : days <= 14 ? "border-coral/25 bg-coral/5" : days <= 30 ? "border-banksia/30 bg-amber-50/70" : "border-indigo-100 bg-slate-50";
            const badge = days < 0 ? "bg-coral/10 text-coral" : days <= 14 ? "bg-coral/10 text-coral" : days <= 30 ? "bg-banksia/20 text-banksia" : "bg-harbour/10 text-harbour";
            return (
              <Link key={review.id} href="/care-plans" className={`rounded-lg border p-3 text-sm hover:shadow-sm ${urgency}`}>
                <p className="font-semibold text-ink">{review.participantName}</p>
                <p className="mt-1 text-slate-600">{review.title || "Care plan review"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded px-2.5 py-1 text-xs font-semibold ${badge}`}>{dateOnly(review.reviewDate)}</span>
                  {days < 0 ? <span className="text-xs font-semibold text-coral">{Math.abs(days)}d overdue</span> : days <= 30 ? <span className="text-xs text-slate-500">{days}d remaining</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyWorkerState title="No plan reviews due" message="Care plan reviews with review dates will appear here." />
      )}
    </DashboardPanel>
  );
}

function ComplianceExpiry({ alerts }: { alerts: DashboardComplianceAlert[] }) {
  return (
    <DashboardPanel title="Compliance Expiry" icon={ShieldCheck}>
      {alerts.length ? (
        <div className="grid gap-3">
          {alerts.map((alert) => (
            <Link key={`${alert.worker}-${alert.label}`} href="/support-workers" className={`rounded-lg border p-3 text-sm hover:shadow-sm ${alert.status === "expired" ? "border-rose-200 bg-rose-50/65" : "border-amber-200 bg-amber-50/70"}`}>
              <p className="font-semibold text-ink">{alert.worker}</p>
              <p className="mt-1 text-slate-600">{alert.label}: {alert.message}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No expiry alerts" message="Police checks, NDIS screening, first aid, CPR, and licence alerts will appear here." />
      )}
    </DashboardPanel>
  );
}

function RecentActivityList({ activities }: { activities: DashboardActivity[] }) {
  return (
    <DashboardPanel title="Recent Activity" icon={TrendingUp}>
      {activities.length ? (
        <div className="grid gap-3">
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-indigo-100 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-ink">{friendlyActivity(activity.action)}</p>
              <p className="mt-1 text-slate-600">{activity.label || "Record updated"}</p>
              <p className="mt-2 text-xs text-slate-500">{activity.actor || "CareOS"} | {dateTimeOrFallback(activity.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No recent activity" message="Audit log activity will appear here after users create or update records." />
      )}
    </DashboardPanel>
  );
}

function DashboardPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-indigo-100/80 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-gumleaf ring-1 ring-indigo-100">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function buildDashboardAlerts(unfilledShifts: number, pendingIncidents: number, pendingTimesheets: number, overview: DashboardOverview) {
  const alerts: Array<{ title: string; message: string; tone: "coral" | "banksia" | "gumleaf" | "harbour"; href: string }> = [];
  if (unfilledShifts) alerts.push({ title: "Unfilled shifts", message: `${unfilledShifts} shift${unfilledShifts === 1 ? "" : "s"} need worker allocation.`, tone: "coral", href: "/rostering" });
  if (pendingIncidents) alerts.push({ title: "Incident review", message: `${pendingIncidents} incident${pendingIncidents === 1 ? "" : "s"} require management review.`, tone: "coral", href: "/incident-reports" });
  if (pendingTimesheets) alerts.push({ title: "Timesheet approval", message: `${pendingTimesheets} completed shift${pendingTimesheets === 1 ? "" : "s"} need timesheet or payroll review.`, tone: "banksia", href: "/timesheets" });
  if (overview.complianceAlerts.length) alerts.push({ title: "Compliance expiry", message: `${overview.complianceAlerts.length} staff compliance record${overview.complianceAlerts.length === 1 ? "" : "s"} are expired or due soon.`, tone: "banksia", href: "/support-workers" });
  if (overview.planReviews.length) alerts.push({ title: "Plan reviews", message: `${overview.planReviews.length} care plan review${overview.planReviews.length === 1 ? "" : "s"} are coming up.`, tone: "harbour", href: "/care-plans" });
  return alerts;
}

function alertToneClass(tone: "coral" | "banksia" | "gumleaf" | "harbour") {
  if (tone === "coral") return "border-rose-200 bg-rose-50/65";
  if (tone === "banksia") return "border-amber-200 bg-amber-50/70";
  if (tone === "harbour") return "border-sky-200 bg-sky-50/70";
  return "border-indigo-200 bg-indigo-50/70";
}

function isUnfilledShift(shift: ShiftRecord) {
  const status = shift.status.toLowerCase();
  return ["open", "unfilled", "vacant", "draft"].includes(status) || !shift.workerEmail && !shift.worker;
}

function isPendingTimesheetShift(shift: ShiftRecord) {
  const approval = shift.approvalStatus.toLowerCase();
  const status = shift.status.toLowerCase();
  return ["submitted", "pending", "pending_review", "awaiting_approval"].includes(approval) || (status === "completed" && approval !== "approved");
}

function friendlyActivity(action: string) {
  return action
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
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
    <section className="mt-6 rounded border border-indigo-100/80 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Management analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Service delivery, workforce performance, risk, funding, and attendance from live records.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-gumleaf ring-1 ring-indigo-100">
          <CalendarDays className="h-4 w-4" />
          {todaysShiftCount} today
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        <div className="space-y-4 lg:col-span-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded border border-indigo-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-ink">{row.label}</p>
                <p className="font-semibold text-gumleaf">{row.value}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded bg-indigo-100/70">
                <div className="h-full bg-indigo-300" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} />
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
    <div className="rounded border border-indigo-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [canManageParticipants, setCanManageParticipants] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const context = await getCurrentUserContext();
    const canManage = isAdminRole(context.role);
    setCanManageParticipants(canManage);
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
          ? ""
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
      medicare_number: get(form, "medicareNumber"),
      display_name: get(form, "displayName"),
      preferred_name: get(form, "preferredName"),
      person_alias: get(form, "personAlias"),
      other_identifier: get(form, "otherIdentifier"),
      gender: get(form, "gender"),
      sex: get(form, "sex"),
      primary_address: get(form, "primaryAddress"),
      postal_address: get(form, "postalAddress"),
      mobile_number: get(form, "mobileNumber"),
      phone_number: get(form, "phoneNumber"),
      email: get(form, "email"),
      secondary_email: get(form, "secondaryEmail"),
      preferred_contact_method: get(form, "preferredContactMethod"),
      languages: get(form, "languages"),
      cultural_identity: get(form, "culturalIdentity"),
      religion: get(form, "religion"),
      marital_status: get(form, "maritalStatus"),
      nationality: get(form, "nationality"),
      ethnicity: get(form, "ethnicity"),
      aboriginal_torres_strait_islander: get(form, "aboriginalTorresStraitIslander"),
      place_of_birth: get(form, "placeOfBirth"),
      joined_date: get(form, "joinedDate"),
      next_review_date: get(form, "nextReviewDate"),
      client_status: get(form, "clientStatus"),
      emergency_contact: get(form, "emergency"),
      emergency_contacts: get(form, "emergencyContacts"),
      support_needs: get(form, "needs")
      ,
      support_plans: get(form, "supportPlans"),
      goals: get(form, "goals"),
      risk_information: get(form, "riskInformation"),
      requirements: get(form, "requirements"),
      preferences: get(form, "preferences"),
      need_to_know_information: get(form, "needToKnowInformation"),
      useful_information: get(form, "usefulInformation"),
      environmental_details: get(form, "environmentalDetails"),
      psychological_details: get(form, "psychologicalDetails"),
      sensory_details: get(form, "sensoryDetails"),
      bmi: get(form, "bmi"),
      medical_notes: get(form, "medicalNotes"),
      allergies: get(form, "allergies"),
      communication_preferences: get(form, "communicationPreferences"),
      client_type: get(form, "clientType"),
      share_progress_notes: form.get("shareProgressNotes") === "on",
      enable_sms_reminders: form.get("enableSmsReminders") === "on",
      invoice_travel: form.get("invoiceTravel") === "on",
      private_info: get(form, "privateInfo")
    };
    const ok = await postJson("/api/participants", payload, setNotice);
    if (ok) {
      await refresh();
      setCreateOpen(false);
    }
    return ok;
  }

  async function deleteParticipant(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setDeletingParticipantId(null);
    setNotice("Participant deleted.");
    await refresh();
  }

  return (
    <AppShell title="Participants" eyebrow={notice}>
      {canManageParticipants ? (
        <section className="mb-6 rounded border border-indigo-100 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Participant records</h2>
              <p className="mt-1 text-sm text-slate-500">Add, review, and open participant profiles from one table.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gumleaf/10 border border-gumleaf/20 px-4 py-2.5 text-sm font-semibold text-gumleaf shadow-sm transition hover:bg-gumleaf/20 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                New participant
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded border border-gumleaf/25 bg-gumleaf/5 p-4 text-sm text-slate-700">
          Support worker access is restricted to participants linked to your assigned shifts. Add and edit controls are available to admin users only.
        </section>
      )}
      {createOpen ? <ParticipantCreateModal onClose={() => setCreateOpen(false)} onSubmit={submit} /> : null}
      {participants.length ? (
        <section className="mt-6 overflow-hidden rounded border border-indigo-100 bg-white shadow-panel">
          <div className="flex items-center justify-between border-b border-indigo-100 bg-[#fbfdff] px-4 py-3">
            <h2 className="font-semibold text-ink">All participants</h2>
            <span className="rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-indigo-100">{participants.length} records</span>
          </div>
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-indigo-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-r border-indigo-100 px-4 py-3">Participant</th>
                  <th className="border-r border-indigo-100 px-4 py-3">NDIS number</th>
                  <th className="border-r border-indigo-100 px-4 py-3">Plan type</th>
                  <th className="border-r border-indigo-100 px-4 py-3">Emergency contact</th>
                  <th className="border-r border-indigo-100 px-4 py-3">Support needs</th>
                  <th className="border-r border-indigo-100 px-4 py-3">Docs / Notes</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((participant) => (
                  <tr key={`${participant.ndis}-${participant.name}`} className="transition hover:bg-slate-50">
                    <td className="border-r border-indigo-50 px-4 py-4">
                      <p className="font-semibold text-ink">{participant.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{participant.dateOfBirth ? `DOB ${dateOnly(participant.dateOfBirth)}` : "Date of birth not recorded"}</p>
                    </td>
                    <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{participant.ndis || "Not recorded"}</td>
                    <td className="border-r border-indigo-50 px-4 py-4">
                      <span className="rounded bg-harbour/10 px-2.5 py-1 text-xs font-semibold text-harbour">{participant.plan || "Not recorded"}</span>
                    </td>
                    <td className="max-w-[260px] border-r border-indigo-50 px-4 py-4 text-slate-700">
                      {participant.emergency || participant.emergencyContacts ? (
                        <div className="space-y-1">
                          <p className="font-medium text-ink">{participant.emergency || "Primary contact not recorded"}</p>
                          <p className="line-clamp-2 text-xs leading-5 text-slate-500">{participant.emergencyContacts || "Additional contacts not recorded"}</p>
                        </div>
                      ) : (
                        "Not recorded"
                      )}
                    </td>
                    <td className="max-w-[260px] border-r border-indigo-50 px-4 py-4 text-slate-700">
                      <span className="line-clamp-2">{participant.needs || "Not recorded"}</span>
                    </td>
                    <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{participant.docs} documents, {participant.notes} notes</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/participants/${participant.id}`} className="inline-flex rounded border border-gumleaf/20 bg-gumleaf/5 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/10">
                          Open profile
                        </Link>
                        {canManageParticipants && (
                          deletingParticipantId === participant.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Delete?</span>
                              <button type="button" onClick={() => void deleteParticipant(participant.id)}
                                className="inline-flex items-center gap-1 rounded border border-coral/30 bg-coral/10 px-2.5 py-1.5 text-xs font-semibold text-coral hover:bg-coral/20">
                                Yes, delete
                              </button>
                              <button type="button" onClick={() => setDeletingParticipantId(null)}
                                className="inline-flex items-center px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setDeletingParticipantId(participant.id)}
                              className="inline-flex items-center gap-1.5 rounded border border-coral/20 px-2.5 py-1.5 text-xs font-semibold text-coral/80 hover:bg-coral/5">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          title={canManageParticipants ? "No participants yet" : "No assigned participants"}
          message={canManageParticipants ? "Participant records will appear here after they are added to the database." : "Participant records appear here only when you are assigned to their shifts."}
        />
      )}
    </AppShell>
  );
}

function ParticipantCreateModal({
  onClose,
  onSubmit
}: {
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<boolean | void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-[#fbfdff] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Admin action</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">New participant</h2>
            <p className="mt-1 text-sm text-slate-500">Create a participant profile. Required fields must be completed before saving.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-slate-500 transition hover:bg-indigo-50 hover:text-ink"
            aria-label="Close new participant form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5 scrollbar-subtle">
          <RecordForm submitLabel="Add participant" onSubmit={onSubmit}>
            <Field name="name" label="Participant profile" placeholder="Full name" />
            <Field name="ndis" label="NDIS number" placeholder="NDIS participant number" />
            <Field name="plan" label="Plan type" placeholder="NDIS managed, plan managed, or self managed" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="dateOfBirth" label="Date of birth" type="date" required={false} />
              <Field name="medicareNumber" label="Medicare number" placeholder="Medicare reference" required={false} />
              <Field name="displayName" label="Display name" placeholder="Preferred display name" required={false} />
              <Field name="preferredName" label="Preferred name" placeholder="Name used in daily support" required={false} />
              <Field name="personAlias" label="Person alias" placeholder="Alias or known as" required={false} />
              <Field name="otherIdentifier" label="Other identifier" placeholder="Provider or internal reference" required={false} />
              <Select name="gender" label="Gender" options={["", "Female", "Male", "Non-binary", "Prefer not to say", "Other"]} required={false} />
              <Select name="sex" label="Sex" options={["", "Female", "Male", "Intersex", "Prefer not to say"]} required={false} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="mobileNumber" label="Mobile number" placeholder="Participant mobile" required={false} />
              <Field name="phoneNumber" label="Phone number" placeholder="Home or alternate number" required={false} />
              <Field name="email" label="Email" type="email" placeholder="participant@example.com" required={false} />
              <Field name="secondaryEmail" label="Secondary email" type="email" placeholder="second@example.com" required={false} />
              <Select name="preferredContactMethod" label="Preferred contact method" options={["", "Phone", "SMS", "Email", "Family/nominee", "Support coordinator"]} required={false} />
              <Field name="languages" label="Languages" placeholder="English, Tamil, Auslan..." required={false} />
            </div>
            <OptionalArea name="primaryAddress" label="Primary address" placeholder="Street, suburb, state, postcode" />
            <OptionalArea name="postalAddress" label="Postal address" placeholder="Postal address if different from primary address" />
            <Field name="emergency" label="Emergency contact" placeholder="Name and phone number" />
            <Area name="emergencyContacts" label="Emergency contacts" placeholder="Primary and secondary contacts, relationship, phone, and email" />
            <Area name="needs" label="Support needs" placeholder="Support needs, routines, risks, and goals" />
            <OptionalArea name="requirements" label="Requirements" placeholder="Transport, access, staffing, equipment, and service requirements" />
            <OptionalArea name="preferences" label="Preferences" placeholder="Participant likes, dislikes, routines, communication style, and support preferences" />
            <OptionalArea name="needToKnowInformation" label="Need to know information" placeholder="Important information staff must review before support" />
            <OptionalArea name="usefulInformation" label="Useful information" placeholder="Helpful context for daily support" />
            <Area name="supportPlans" label="Support plans" placeholder="Current support plan details, routines, funded supports, and review dates" />
            <Area name="goals" label="Participant goals" placeholder="NDIS goals, short-term goals, and progress measures" />
            <Area name="riskInformation" label="Risk information" placeholder="Known risks, triggers, behaviour support, safeguarding, and mitigation actions" />
            <OptionalArea name="environmentalDetails" label="Environmental details" placeholder="Home access, pets, smoke alarms, hazards, parking, and entry instructions" />
            <OptionalArea name="psychologicalDetails" label="Psychological details" placeholder="Known triggers, calming strategies, mental health considerations, and supports" />
            <OptionalArea name="sensoryDetails" label="Sensory details" placeholder="Sensory preferences, overload triggers, noise/light needs, and routines" />
            <Field name="bmi" label="BMI" placeholder="BMI or mobility/body handling note" required={false} />
            <Area name="medicalNotes" label="Medical notes" placeholder="Medical conditions, medication notes, mobility, swallowing, seizures, or care alerts" />
            <Area name="allergies" label="Allergies" placeholder="Food, medication, environmental allergies, and response plan" />
            <Area name="communicationPreferences" label="Communication preferences" placeholder="Preferred language, communication method, interpreter needs, and decision supports" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="culturalIdentity" label="Cultural identity" placeholder="Cultural identity or community connection" required={false} />
              <Field name="religion" label="Religion" placeholder="Religion or spiritual preference" required={false} />
              <Field name="maritalStatus" label="Marital status" placeholder="Marital status" required={false} />
              <Field name="nationality" label="Nationality" placeholder="Nationality" required={false} />
              <Field name="ethnicity" label="Ethnicity" placeholder="Ethnicity" required={false} />
              <Field name="aboriginalTorresStraitIslander" label="Aboriginal or Torres Strait Islander origin" placeholder="Yes, No, Unknown, or preferred wording" required={false} />
              <Field name="placeOfBirth" label="Place of birth" placeholder="Place of birth" required={false} />
              <Field name="joinedDate" label="Joined date" type="date" required={false} />
              <Field name="nextReviewDate" label="Next review date" type="date" required={false} />
              <Select name="clientStatus" label="Participant status" options={["active", "inactive", "archived"]} defaultValue="active" />
              <Field name="clientType" label="Client type" placeholder="Self managed, plan managed, agency managed" required={false} />
            </div>
            <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <CheckboxField name="shareProgressNotes" label="Share progress notes" />
              <CheckboxField name="enableSmsReminders" label="Enable SMS reminders" />
              <CheckboxField name="invoiceTravel" label="Invoice travel" />
            </div>
            <OptionalArea name="privateInfo" label="Private information" placeholder="Admin-only sensitive context or internal notes" />
          </RecordForm>
        </div>
      </div>
    </div>
  );
}

function ParticipantEditModal({
  participant,
  onClose,
  onSubmit
}: {
  participant: ParticipantRecord;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<boolean | void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-[#fbfdff] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Participant profile</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Edit {participant.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Update participant details, care information, risks, and communication preferences.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-slate-500 transition hover:bg-indigo-50 hover:text-ink"
            aria-label="Close edit participant form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5 scrollbar-subtle">
          <RecordForm submitLabel="Save participant profile" onSubmit={onSubmit}>
            <input type="hidden" name="id" value={participant.id} />
            <Field name="name" label="Participant profile" defaultValue={participant.name} placeholder="Full name" />
            <Field name="ndis" label="NDIS number" defaultValue={participant.ndis} placeholder="NDIS participant number" />
            <Field name="plan" label="Plan type" defaultValue={participant.plan} placeholder="NDIS managed, plan managed, or self managed" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="dateOfBirth" label="Date of birth" type="date" defaultValue={participant.dateOfBirth} required={false} />
              <Field name="medicareNumber" label="Medicare number" defaultValue={participant.medicareNumber} placeholder="Medicare reference" required={false} />
              <Field name="displayName" label="Display name" defaultValue={participant.displayName} placeholder="Preferred display name" required={false} />
              <Field name="preferredName" label="Preferred name" defaultValue={participant.preferredName} placeholder="Name used in daily support" required={false} />
              <Field name="personAlias" label="Person alias" defaultValue={participant.personAlias} placeholder="Alias or known as" required={false} />
              <Field name="otherIdentifier" label="Other identifier" defaultValue={participant.otherIdentifier} placeholder="Provider or internal reference" required={false} />
              <Select name="gender" label="Gender" options={["", "Female", "Male", "Non-binary", "Prefer not to say", "Other"]} defaultValue={participant.gender} required={false} />
              <Select name="sex" label="Sex" options={["", "Female", "Male", "Intersex", "Prefer not to say"]} defaultValue={participant.sex} required={false} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="mobileNumber" label="Mobile number" defaultValue={participant.mobileNumber} placeholder="Participant mobile" required={false} />
              <Field name="phoneNumber" label="Phone number" defaultValue={participant.phoneNumber} placeholder="Home or alternate number" required={false} />
              <Field name="email" label="Email" type="email" defaultValue={participant.email} placeholder="participant@example.com" required={false} />
              <Field name="secondaryEmail" label="Secondary email" type="email" defaultValue={participant.secondaryEmail} placeholder="second@example.com" required={false} />
              <Select name="preferredContactMethod" label="Preferred contact method" options={["", "Phone", "SMS", "Email", "Family/nominee", "Support coordinator"]} defaultValue={participant.preferredContactMethod} required={false} />
              <Field name="languages" label="Languages" defaultValue={participant.languages} placeholder="English, Tamil, Auslan..." required={false} />
            </div>
            <OptionalArea name="primaryAddress" label="Primary address" defaultValue={participant.primaryAddress} placeholder="Street, suburb, state, postcode" />
            <OptionalArea name="postalAddress" label="Postal address" defaultValue={participant.postalAddress} placeholder="Postal address if different from primary address" />
            <Field name="emergency" label="Primary emergency contact summary" defaultValue={participant.emergency} placeholder="Name and phone number" />
            <Area name="emergencyContacts" label="Emergency contact notes" defaultValue={participant.emergencyContacts} placeholder="Primary and secondary contacts, relationship, phone, and email" />
            <Area name="needs" label="Support needs" defaultValue={participant.needs} placeholder="Support needs, routines, risks, and goals" />
            <OptionalArea name="requirements" label="Requirements" defaultValue={participant.requirements} placeholder="Transport, access, staffing, equipment, and service requirements" />
            <OptionalArea name="preferences" label="Preferences" defaultValue={participant.preferences} placeholder="Participant likes, dislikes, routines, communication style, and support preferences" />
            <OptionalArea name="needToKnowInformation" label="Need to know information" defaultValue={participant.needToKnowInformation} placeholder="Important information staff must review before support" />
            <OptionalArea name="usefulInformation" label="Useful information" defaultValue={participant.usefulInformation} placeholder="Helpful context for daily support" />
            <Area name="supportPlans" label="Support plans" defaultValue={participant.supportPlans} placeholder="Current support plan details, routines, funded supports, and review dates" />
            <Area name="goals" label="Participant goals" defaultValue={participant.goals} placeholder="NDIS goals, short-term goals, and progress measures" />
            <Area name="riskInformation" label="Risk information" defaultValue={participant.riskInformation} placeholder="Known risks, triggers, behaviour support, safeguarding, and mitigation actions" />
            <OptionalArea name="environmentalDetails" label="Environmental details" defaultValue={participant.environmentalDetails} placeholder="Home access, pets, smoke alarms, hazards, parking, and entry instructions" />
            <OptionalArea name="psychologicalDetails" label="Psychological details" defaultValue={participant.psychologicalDetails} placeholder="Known triggers, calming strategies, mental health considerations, and supports" />
            <OptionalArea name="sensoryDetails" label="Sensory details" defaultValue={participant.sensoryDetails} placeholder="Sensory preferences, overload triggers, noise/light needs, and routines" />
            <Field name="bmi" label="BMI" defaultValue={participant.bmi} placeholder="BMI or mobility/body handling note" required={false} />
            <Area name="medicalNotes" label="Medical notes" defaultValue={participant.medicalNotes} placeholder="Medical conditions, medication notes, mobility, swallowing, seizures, or care alerts" />
            <Area name="allergies" label="Allergies" defaultValue={participant.allergies} placeholder="Food, medication, environmental allergies, and response plan" />
            <Area name="communicationPreferences" label="Communication preferences" defaultValue={participant.communicationPreferences} placeholder="Preferred language, communication method, interpreter needs, and decision supports" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="culturalIdentity" label="Cultural identity" defaultValue={participant.culturalIdentity} placeholder="Cultural identity or community connection" required={false} />
              <Field name="religion" label="Religion" defaultValue={participant.religion} placeholder="Religion or spiritual preference" required={false} />
              <Field name="maritalStatus" label="Marital status" defaultValue={participant.maritalStatus} placeholder="Marital status" required={false} />
              <Field name="nationality" label="Nationality" defaultValue={participant.nationality} placeholder="Nationality" required={false} />
              <Field name="ethnicity" label="Ethnicity" defaultValue={participant.ethnicity} placeholder="Ethnicity" required={false} />
              <Field name="aboriginalTorresStraitIslander" label="Aboriginal or Torres Strait Islander origin" defaultValue={participant.aboriginalTorresStraitIslander} placeholder="Yes, No, Unknown, or preferred wording" required={false} />
              <Field name="placeOfBirth" label="Place of birth" defaultValue={participant.placeOfBirth} placeholder="Place of birth" required={false} />
              <Field name="joinedDate" label="Joined date" type="date" defaultValue={participant.joinedDate} required={false} />
              <Field name="nextReviewDate" label="Next review date" type="date" defaultValue={participant.nextReviewDate} required={false} />
              <Select name="clientStatus" label="Participant status" options={["active", "inactive", "archived"]} defaultValue={participant.clientStatus || "active"} />
              <Field name="clientType" label="Client type" defaultValue={participant.clientType} placeholder="Self managed, plan managed, agency managed" required={false} />
            </div>
            <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <CheckboxField name="shareProgressNotes" label="Share progress notes" defaultChecked={participant.shareProgressNotes} />
              <CheckboxField name="enableSmsReminders" label="Enable SMS reminders" defaultChecked={participant.enableSmsReminders} />
              <CheckboxField name="invoiceTravel" label="Invoice travel" defaultChecked={participant.invoiceTravel} />
            </div>
            <OptionalArea name="privateInfo" label="Private information" defaultValue={participant.privateInfo} placeholder="Admin-only sensitive context or internal notes" />
          </RecordForm>
        </div>
      </div>
    </div>
  );
}

function EmergencyContactCreateModal({
  participants,
  fixedParticipantName,
  onClose,
  onSubmit
}: {
  participants: ParticipantRecord[];
  fixedParticipantName?: string;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<boolean | void>;
}) {
  const hasParticipant = Boolean(fixedParticipantName || participants.length);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-[#fbfdff] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Participant module</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">New emergency contact</h2>
            <p className="mt-1 text-sm text-slate-500">Save emergency contact details against a participant profile.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-slate-500 transition hover:bg-indigo-50 hover:text-ink"
            aria-label="Close emergency contact form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5 scrollbar-subtle">
          {hasParticipant ? (
            <RecordForm submitLabel="Save emergency contact" onSubmit={onSubmit}>
              {fixedParticipantName ? (
                <div className="rounded border border-indigo-100 bg-slate-50 p-3 text-sm">
                  <input type="hidden" name="participant" value={fixedParticipantName} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participant</p>
                  <p className="mt-1 font-semibold text-ink">{fixedParticipantName}</p>
                </div>
              ) : (
                <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="contactName" label="Contact name" placeholder="Full name" />
                <Select name="relationship" label="Relationship" options={["Parent", "Guardian", "Partner", "Sibling", "Support coordinator", "Plan nominee", "Other"]} />
                <Field name="phone" label="Phone" placeholder="Mobile or landline" />
                <Field name="email" label="Email" placeholder="name@example.com" required={false} />
                <Select name="priority" label="Priority" options={["primary", "secondary", "other"]} />
                <Select name="consentStatus" label="Consent to contact" options={["consent_to_contact", "do_not_contact"]} renderLabel={friendlyConsentStatus} />
                <Select name="status" label="Status" options={["active", "inactive"]} />
              </div>
              <OptionalArea name="notes" label="Notes" placeholder="Availability, best time to call, language preference, or contact instructions" />
            </RecordForm>
          ) : (
            <EmptyWorkerState title="Participant required" message="Create a participant before adding emergency contacts." />
          )}
        </div>
      </div>
    </div>
  );
}

function EmergencyContactsTable({
  contacts,
  canManage,
  onAdd,
  participantName
}: {
  contacts: EmergencyContactRecord[];
  canManage: boolean;
  onAdd: () => void;
  participantName?: string;
}) {
  const showParticipantColumn = !participantName;

  return (
    <section className="mt-6 overflow-hidden rounded border border-indigo-100 bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-indigo-100 bg-[#fbfdff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Emergency contacts</h2>
          <p className="mt-1 text-sm text-slate-500">
            {participantName ? `Contacts are stored inside ${participantName}'s participant profile.` : "Participant emergency contacts are managed inside each participant profile."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-indigo-100">{contacts.length} records</span>
          {canManage ? (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gumleaf/20 bg-gumleaf/5 px-3 py-2 text-xs font-semibold text-gumleaf transition hover:bg-gumleaf/10"
            >
              <Phone className="h-4 w-4" />
              Add contact
            </button>
          ) : null}
        </div>
      </div>
      {contacts.length ? (
        <div className="overflow-x-auto scrollbar-subtle">
          <table className={`${showParticipantColumn ? "min-w-[1040px]" : "min-w-[880px]"} w-full border-collapse text-left text-sm`}>
            <thead className="border-b border-indigo-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {showParticipantColumn ? <th className="border-r border-indigo-100 px-4 py-3">Participant</th> : null}
                <th className="border-r border-indigo-100 px-4 py-3">Contact</th>
                <th className="border-r border-indigo-100 px-4 py-3">Relationship</th>
                <th className="border-r border-indigo-100 px-4 py-3">Phone</th>
                <th className="border-r border-indigo-100 px-4 py-3">Email</th>
                <th className="border-r border-indigo-100 px-4 py-3">Priority</th>
                <th className="border-r border-indigo-100 px-4 py-3">Consent</th>
                <th className="border-r border-indigo-100 px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="transition hover:bg-slate-50">
                  {showParticipantColumn ? <td className="border-r border-indigo-50 px-4 py-4 font-semibold text-ink">{contact.participantName || "Not recorded"}</td> : null}
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{contact.contactName || "Not recorded"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{contact.relationship || "Not recorded"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{contact.phone || "Not recorded"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{contact.email || "Not recorded"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4">
                    <span className={emergencyPriorityClass(contact.priority)}>{contact.priority || "other"}</span>
                  </td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{contact.consentToContact ? "Consent to contact" : "Do not contact"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4">
                    <span className={contact.status === "active" ? "rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
                      {contact.status || "active"}
                    </span>
                  </td>
                  <td className="max-w-[300px] px-4 py-4 text-slate-700">
                    <span className="line-clamp-2">{contact.notes || "Not recorded"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <EmptyWorkerState
            title="No emergency contacts"
            message={canManage ? "Add participant emergency contacts from this page." : "Emergency contacts for your assigned participants will appear here."}
          />
        </div>
      )}
    </section>
  );
}

function friendlyConsentStatus(value: string) {
  return value === "do_not_contact" ? "Do not contact" : "Consent to contact";
}

function emergencyPriorityClass(priority: string) {
  if (priority === "primary") return "rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700";
  if (priority === "secondary") return "rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700";
  return "rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600";
}

export function ParticipantProfilePage({ participantId }: { participantId: string }) {
  const [participant, setParticipant] = useState<ParticipantRecord | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactRecord[]>([]);
  const [documents, setDocuments] = useState<ParticipantDocument[]>([]);
  const [timeline, setTimeline] = useState<ParticipantTimelineItem[]>([]);
  const [relatedRecords, setRelatedRecords] = useState<ParticipantRelatedRecords>(emptyParticipantRelatedRecords());
  const [canManageProfile, setCanManageProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contactCreateOpen, setContactCreateOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const context = await getCurrentUserContext();
    const row = await loadParticipantById(participantId);
    setCanManageProfile(isAdminRole(context.role));
    setParticipant(row);
    if (!row) {
      setEmergencyContacts([]);
      setDocuments([]);
      setTimeline([]);
      setRelatedRecords(emptyParticipantRelatedRecords());
      setNotice("Participant not found or you do not have permission to view this profile.");
      return;
    }
    const [contacts, docs, events, related] = await Promise.all([
      loadEmergencyContacts(context.role, [row.name]),
      loadParticipantDocuments(row.name),
      loadParticipantTimeline(row.name),
      loadParticipantRelatedRecords(row.name)
    ]);
    setEmergencyContacts(contacts);
    setDocuments(docs);
    setTimeline(events);
    setRelatedRecords(related);
    setNotice("");
  }, [participantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitProfileUpdate(form: FormData) {
    const payload = {
      id: get(form, "id"),
      name: get(form, "name"),
      ndis_number: get(form, "ndis"),
      plan_type: get(form, "plan"),
      date_of_birth: get(form, "dateOfBirth"),
      medicare_number: get(form, "medicareNumber"),
      display_name: get(form, "displayName"),
      preferred_name: get(form, "preferredName"),
      person_alias: get(form, "personAlias"),
      other_identifier: get(form, "otherIdentifier"),
      gender: get(form, "gender"),
      sex: get(form, "sex"),
      primary_address: get(form, "primaryAddress"),
      postal_address: get(form, "postalAddress"),
      mobile_number: get(form, "mobileNumber"),
      phone_number: get(form, "phoneNumber"),
      email: get(form, "email"),
      secondary_email: get(form, "secondaryEmail"),
      preferred_contact_method: get(form, "preferredContactMethod"),
      languages: get(form, "languages"),
      cultural_identity: get(form, "culturalIdentity"),
      religion: get(form, "religion"),
      marital_status: get(form, "maritalStatus"),
      nationality: get(form, "nationality"),
      ethnicity: get(form, "ethnicity"),
      aboriginal_torres_strait_islander: get(form, "aboriginalTorresStraitIslander"),
      place_of_birth: get(form, "placeOfBirth"),
      joined_date: get(form, "joinedDate"),
      next_review_date: get(form, "nextReviewDate"),
      client_status: get(form, "clientStatus"),
      emergency_contact: get(form, "emergency"),
      emergency_contacts: get(form, "emergencyContacts"),
      support_needs: get(form, "needs"),
      support_plans: get(form, "supportPlans"),
      goals: get(form, "goals"),
      risk_information: get(form, "riskInformation"),
      requirements: get(form, "requirements"),
      preferences: get(form, "preferences"),
      need_to_know_information: get(form, "needToKnowInformation"),
      useful_information: get(form, "usefulInformation"),
      environmental_details: get(form, "environmentalDetails"),
      psychological_details: get(form, "psychologicalDetails"),
      sensory_details: get(form, "sensoryDetails"),
      bmi: get(form, "bmi"),
      medical_notes: get(form, "medicalNotes"),
      allergies: get(form, "allergies"),
      communication_preferences: get(form, "communicationPreferences"),
      client_type: get(form, "clientType"),
      share_progress_notes: form.get("shareProgressNotes") === "on",
      enable_sms_reminders: form.get("enableSmsReminders") === "on",
      invoice_travel: form.get("invoiceTravel") === "on",
      private_info: get(form, "privateInfo")
    };
    const ok = await patchJson("/api/participants", payload, setNotice);
    if (ok) {
      setEditOpen(false);
      await refresh();
    }
    return ok;
  }

  async function submitEmergencyContact(form: FormData) {
    const payload = {
      participant_name: get(form, "participant"),
      contact_name: get(form, "contactName"),
      relationship: get(form, "relationship"),
      phone: get(form, "phone"),
      email: get(form, "email"),
      priority: get(form, "priority"),
      consent_status: get(form, "consentStatus"),
      notes: get(form, "notes"),
      status: get(form, "status")
    };
    const ok = await postJson("/api/operations/emergency-contacts", payload, setNotice);
    if (ok) {
      setContactCreateOpen(false);
      await refresh();
    }
    return ok;
  }

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
      {participant && editOpen ? <ParticipantEditModal participant={participant} onClose={() => setEditOpen(false)} onSubmit={submitProfileUpdate} /> : null}
      {participant && contactCreateOpen ? (
        <EmergencyContactCreateModal
          participants={[participant]}
          fixedParticipantName={participant.name}
          onClose={() => setContactCreateOpen(false)}
          onSubmit={submitEmergencyContact}
        />
      ) : null}
      {participant ? (
        <div className="space-y-6">
          <ParticipantProfileHeader
            participant={participant}
            contacts={emergencyContacts}
            documents={documents}
            related={relatedRecords}
            canManage={canManageProfile}
            onEdit={() => setEditOpen(true)}
          />
          <ParticipantProfileActions canManage={canManageProfile} />
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-6">
              <ParticipantDemographicsPanel participant={participant} />
              <EmergencyContactsTable contacts={emergencyContacts} canManage={canManageProfile} onAdd={() => setContactCreateOpen(true)} participantName={participant.name} />
              <ParticipantDocumentsPanel documents={documents} onOpen={openDocument} />
            </section>

            <section className="space-y-6">
              <ParticipantCareSnapshot participant={participant} related={relatedRecords} />
              <ParticipantOnboardingChecklist participantId={participant.id} related={relatedRecords} />
              <ParticipantRelatedRecordsPanel related={relatedRecords} />
              <ParticipantTimeline timeline={timeline} />
            </section>
          </div>
        </div>
      ) : (
        <EmptyState title="Participant profile unavailable" message="This participant could not be found, or your login does not have permission to view it." />
      )}
    </AppShell>
  );
}

function ParticipantProfileHeader({
  participant,
  contacts,
  documents,
  related,
  canManage,
  onEdit
}: {
  participant: ParticipantRecord;
  contacts: EmergencyContactRecord[];
  documents: ParticipantDocument[];
  related: ParticipantRelatedRecords;
  canManage: boolean;
  onEdit: () => void;
}) {
  const displayName = participant.displayName || participant.preferredName || participant.name;
  const upcomingShifts = related.shifts.filter((shift) => new Date(shift.startsAt).getTime() >= startOfToday().getTime()).length;
  const openTasks = related.tasks.filter((task) => ["open", "in_progress"].includes(task.status)).length;
  const activeGoals = related.goals.filter((goal) => goal.status === "active").length;
  const riskLevel = highestRiskLevel(related.risks.map((risk) => risk.level));

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-panel">
      <div className="bg-gradient-to-r from-[#f8fbff] via-white to-[#f7fffc] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-xl font-bold text-indigo-600 shadow-sm">
              {initials(displayName)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-ink">{displayName}</h2>
                <span className={statusPillClass(participant.clientStatus)}>{participant.clientStatus || "active"}</span>
                {riskLevel ? <span className={riskPillClass(riskLevel)}>{riskLevel} risk</span> : null}
              </div>
              <p className="mt-1 text-sm text-slate-500">{participant.name !== displayName ? participant.name : participant.preferredName ? `Preferred name: ${participant.preferredName}` : "Participant profile"}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full border border-indigo-100 bg-white px-3 py-1">NDIS {participant.ndis || "not recorded"}</span>
                <span className="rounded-full border border-indigo-100 bg-white px-3 py-1">{participant.plan || "Plan not recorded"}</span>
                <span className="rounded-full border border-indigo-100 bg-white px-3 py-1">{participant.clientType || "Client type not recorded"}</span>
              </div>
            </div>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gumleaf/20 bg-gumleaf/5 px-4 py-2.5 text-sm font-semibold text-gumleaf transition hover:bg-gumleaf/10"
            >
              <Pencil className="h-4 w-4" />
              Edit profile
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid border-t border-indigo-100 bg-white sm:grid-cols-2 xl:grid-cols-6">
        <ParticipantMetric icon={CalendarDays} label="Upcoming shifts" value={String(upcomingShifts)} detail="Scheduled" />
        <ParticipantMetric icon={Phone} label="Contacts" value={String(contacts.length)} detail="Emergency contacts" />
        <ParticipantMetric icon={FileText} label="Documents" value={String(documents.length)} detail="Private files" />
        <ParticipantMetric icon={Target} label="Active goals" value={String(activeGoals)} detail="Tracked goals" />
        <ParticipantMetric icon={ListChecks} label="Open tasks" value={String(openTasks)} detail="Action items" />
        <ParticipantMetric icon={Bell} label="Next review" value={participant.nextReviewDate ? dateOnly(participant.nextReviewDate) : "-"} detail="Care review" />
      </div>
    </section>
  );
}

function ParticipantMetric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-r border-indigo-100 p-4 last:border-r-0 sm:last:border-r xl:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-500">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function ParticipantProfileActions({ canManage }: { canManage: boolean }) {
  const actions = [
    { label: "Create shift", href: "/rostering", icon: CalendarPlus, adminOnly: true },
    { label: "Progress note", href: "/progress-notes", icon: FilePlus2, adminOnly: false },
    { label: "Log incident", href: "/incident-reports", icon: AlertTriangle, adminOnly: false },
    { label: "Upload document", href: "/documents", icon: Upload, adminOnly: true },
    { label: "Care plan", href: "/care-plans", icon: BriefcaseMedical, adminOnly: true },
    { label: "Funding", href: "/funding", icon: BarChart3, adminOnly: true },
    { label: "Invoice", href: "/invoices", icon: ClipboardPlus, adminOnly: true }
  ].filter((action) => canManage || !action.adminOnly);

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="inline-flex items-center gap-2">
            <action.icon className="h-4 w-4 text-indigo-500" />
            {action.label}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </Link>
      ))}
    </section>
  );
}

function ParticipantDemographicsPanel({ participant }: { participant: ParticipantRecord }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Demographic and contact details</h2>
          <p className="mt-1 text-sm text-slate-500">Participant identity, address, contact, and review information.</p>
        </div>
        <UserRound className="h-5 w-5 text-indigo-400" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailTile icon={UserRound} label="Legal name" value={participant.name} />
        <DetailTile icon={UserRound} label="Preferred / display name" value={participant.preferredName || participant.displayName || "Not recorded"} />
        <DetailTile icon={CalendarDays} label="Date of birth" value={participant.dateOfBirth ? dateOnly(participant.dateOfBirth) : "Not recorded"} />
        <DetailTile icon={ShieldCheck} label="Medicare number" value={participant.medicareNumber || "Not recorded"} />
        <DetailTile icon={Users} label="Gender / sex" value={[participant.gender, participant.sex].filter(Boolean).join(" / ") || "Not recorded"} />
        <DetailTile icon={KeyRound} label="Other identifier" value={participant.otherIdentifier || participant.personAlias || "Not recorded"} />
        <DetailTile icon={Smartphone} label="Mobile / phone" value={[participant.mobileNumber, participant.phoneNumber].filter(Boolean).join(" / ") || "Not recorded"} />
        <DetailTile icon={Mail} label="Email" value={participant.email || participant.secondaryEmail || "Not recorded"} />
        <DetailTile icon={MessageSquare} label="Preferred contact" value={participant.preferredContactMethod || participant.communicationPreferences || "Not recorded"} />
        <DetailTile icon={MapPin} label="Primary address" value={participant.primaryAddress || "Not recorded"} />
        <DetailTile icon={Home} label="Postal address" value={participant.postalAddress || "Same as primary or not recorded"} />
        <DetailTile icon={Bell} label="Joined / review" value={[participant.joinedDate ? dateOnly(participant.joinedDate) : "", participant.nextReviewDate ? `Review ${dateOnly(participant.nextReviewDate)}` : ""].filter(Boolean).join(" | ") || "Not recorded"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Languages" value={participant.languages || "Not recorded"} />
        <Info label="Cultural identity" value={participant.culturalIdentity || "Not recorded"} />
        <Info label="Religion / nationality / ethnicity" value={[participant.religion, participant.nationality, participant.ethnicity].filter(Boolean).join(" | ") || "Not recorded"} />
        <Info label="Aboriginal or Torres Strait Islander origin" value={participant.aboriginalTorresStraitIslander || "Not recorded"} />
      </div>

      <div className="mt-4 grid gap-2 rounded border border-indigo-100 bg-slate-50 p-3 text-sm sm:grid-cols-3">
        <BooleanPill label="Share progress notes" active={participant.shareProgressNotes} />
        <BooleanPill label="SMS reminders" active={participant.enableSmsReminders} />
        <BooleanPill label="Invoice travel" active={participant.invoiceTravel} />
      </div>
    </article>
  );
}

function DetailTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BooleanPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={active ? "rounded bg-gumleaf/10 px-2 py-1 text-xs font-semibold text-gumleaf" : "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
        {active ? "Enabled" : "Off"}
      </span>
    </div>
  );
}

function ParticipantDocumentsPanel({ documents, onOpen }: { documents: ParticipantDocument[]; onOpen: (documentId: string) => void }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Documents</h2>
          <p className="mt-1 text-sm text-slate-500">Private files open through permission-checked signed links.</p>
        </div>
        <Link href="/documents" className="inline-flex items-center gap-2 rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">
          Upload
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {documents.length ? (
        <div className="mt-4 grid gap-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{document.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{document.fileName} | {formatBytes(document.sizeBytes)} | {dateTimeOrFallback(document.createdAt)}</p>
                </div>
                <button type="button" onClick={() => onOpen(document.id)} className="inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
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
  );
}

function ParticipantCareSnapshot({ participant, related }: { participant: ParticipantRecord; related: ParticipantRelatedRecords }) {
  const fundingTotal = related.funding.reduce((total, record) => total + record.totalBudget, 0);
  const fundingSpent = related.funding.reduce((total, record) => total + record.spentAmount, 0);

  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Care and support profile</h2>
          <p className="mt-1 text-sm text-slate-500">Support needs, requirements, preferences, risks, and clinical context.</p>
        </div>
        <BriefcaseMedical className="h-5 w-5 text-indigo-400" />
      </div>
      <div className="mt-4 grid gap-4">
        <CareSnapshotBlock title="Disability / support need" value={participant.needs} />
        <CareSnapshotBlock title="Requirements" value={participant.requirements} />
        <CareSnapshotBlock title="Preferences" value={participant.preferences} />
        <CareSnapshotBlock title="Need to know information" value={participant.needToKnowInformation} tone="notice" />
        <CareSnapshotBlock title="Useful information" value={participant.usefulInformation} />
        <CareSnapshotBlock title="Support plans" value={participant.supportPlans} />
        <CareSnapshotBlock title="Participant goals summary" value={participant.goals} />
        <CareSnapshotBlock title="Risks and issues" value={participant.riskInformation} tone="risk" />
        <CareSnapshotBlock title="Environmental details" value={participant.environmentalDetails} />
        <CareSnapshotBlock title="Psychological details" value={participant.psychologicalDetails} />
        <CareSnapshotBlock title="Sensory details" value={participant.sensoryDetails} />
        <CareSnapshotBlock title="Medical notes" value={participant.medicalNotes} tone="notice" />
        <CareSnapshotBlock title="Allergies" value={participant.allergies} tone="risk" />
        <CareSnapshotBlock title="BMI / manual handling note" value={participant.bmi} />
        {participant.privateInfo ? <CareSnapshotBlock title="Private information" value={participant.privateInfo} tone="private" /> : null}
      </div>
      <div className="mt-4 rounded border border-indigo-100 bg-indigo-50/30 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Funding snapshot</p>
        <p className="mt-1 font-semibold text-ink">{related.funding.length ? `${formatMoney(fundingSpent)} used of ${formatMoney(fundingTotal)}` : "No funding records linked yet"}</p>
      </div>
    </article>
  );
}

function CareSnapshotBlock({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "risk" | "notice" | "private" }) {
  const toneClass = {
    default: "border-slate-200 bg-slate-50",
    risk: "border-coral/25 bg-coral/5",
    notice: "border-banksia/35 bg-banksia/10",
    private: "border-indigo-200 bg-indigo-50/50"
  }[tone];
  return (
    <div className={`rounded border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || "Not recorded"}</p>
    </div>
  );
}

function ParticipantRelatedRecordsPanel({ related }: { related: ParticipantRelatedRecords }) {
  return (
    <div className="grid gap-4">
      <RelatedPanel title="Upcoming and recent shifts" href="/rostering" icon={CalendarDays}>
        {related.shifts.length ? related.shifts.map((shift) => (
          <RelatedRow key={shift.id} title={`${timeOnly(shift.startsAt)} - ${timeOnly(shift.endsAt)}`} detail={[dateOnly(shift.startsAt), shift.worker || "Open shift", shift.location].filter(Boolean).join(" | ")} badge={shift.status || "scheduled"} />
        )) : <EmptyWorkerState title="No shifts linked" message="Assigned shifts will appear here after rostering." />}
      </RelatedPanel>

      <RelatedPanel title="Goals and care plans" href="/care-plans" icon={Target}>
        {related.goals.length || related.carePlans.length ? (
          <div className="grid gap-3">
            {related.goals.map((goal) => (
              <div key={goal.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{goal.title}</p>
                  <span className={statusPillClass(goal.status)}>{goal.status}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-gumleaf" style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{goal.progress}% progress{goal.targetDate ? ` | target ${dateOnly(goal.targetDate)}` : ""}</p>
              </div>
            ))}
            {related.carePlans.map((plan) => <RelatedRow key={plan.id} title={plan.title} detail={plan.reviewDate ? `Review ${dateOnly(plan.reviewDate)}` : "Review date not recorded"} badge={plan.status} />)}
          </div>
        ) : <EmptyWorkerState title="No goals or care plans" message="Care plans and participant goals will appear after they are created." />}
      </RelatedPanel>

      <RelatedPanel title="Funding and invoices" href="/invoices" icon={BarChart3}>
        {related.funding.length || related.invoices.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {related.funding.map((fund) => <RelatedRow key={fund.id} title={fund.category} detail={`${formatMoney(fund.spentAmount)} used of ${formatMoney(fund.totalBudget)}${fund.planEnd ? ` | ends ${dateOnly(fund.planEnd)}` : ""}`} badge={fund.status} />)}
            {related.invoices.map((invoice) => <RelatedRow key={invoice.id} title={invoice.invoiceNumber} detail={`${formatMoney(invoice.totalAmount)}${invoice.dueDate ? ` | due ${dateOnly(invoice.dueDate)}` : ""}`} badge={invoice.status} />)}
          </div>
        ) : <EmptyWorkerState title="No funding or invoices" message="Funding utilisation and invoices will appear after records are linked." />}
      </RelatedPanel>

      <RelatedPanel title="Risks and tasks" href="/risk-assessments" icon={AlertTriangle}>
        {related.risks.length || related.tasks.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {related.risks.map((risk) => <RelatedRow key={risk.id} title={`${risk.level} risk`} detail={risk.reviewDate ? `Review ${dateOnly(risk.reviewDate)}` : dateOnly(risk.assessmentDate)} badge={risk.status} tone="risk" />)}
            {related.tasks.map((task) => <RelatedRow key={task.id} title={task.title} detail={[task.assignedWorker, task.dueDate ? `Due ${dateOnly(task.dueDate)}` : ""].filter(Boolean).join(" | ")} badge={task.status} />)}
          </div>
        ) : <EmptyWorkerState title="No risks or tasks" message="Risk assessments and assigned tasks will appear here." />}
      </RelatedPanel>
    </div>
  );
}

function RelatedPanel({ title, href, icon: Icon, children }: { title: string; href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-indigo-400" />
          <h2 className="font-semibold text-ink">{title}</h2>
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Open
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function RelatedRow({ title, detail, badge, tone = "default" }: { title: string; detail: string; badge: string; tone?: "default" | "risk" }) {
  return (
    <div className={`rounded border p-3 text-sm ${tone === "risk" ? "border-coral/20 bg-coral/5" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{title || "Untitled"}</p>
          <p className="mt-1 text-slate-600">{detail || "No details recorded"}</p>
        </div>
        <span className={tone === "risk" ? riskPillClass(badge) : statusPillClass(badge)}>{badge || "active"}</span>
      </div>
    </div>
  );
}

export function CarePlansPage() {
  const [carePlans, setCarePlans] = useState<CarePlanRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [context, setContext] = useState<{ role: UserRole; email: string }>({ role: "support_worker", email: "" });
  const [notice, setNotice] = useState("");

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
          : ""
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

  const canManage = isAdminRole(context.role);

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
  const [notice, setNotice] = useState("");
  const [editingWorker, setEditingWorker] = useState<WorkerRecord | null>(null);
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);
  const [showAddWorker, setShowAddWorker] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await loadWorkers();
    setWorkers(rows);
    setNotice(rows.length ? "" : "No support workers yet. Add a worker to create an invite.");
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const portalUrl = `${siteUrl.replace(/\/$/, "")}/worker-portal/create-login?invite=${token}&email=${encodeURIComponent(next.email)}&wname=${encodeURIComponent(next.name)}`;
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
    setShowAddWorker(false);
    setNotice(invite.message ?? "Worker invite created.");
  }

  async function updateWorker(form: FormData) {
    if (!editingWorker || !isSupabaseConfigured || !supabase) return;
    const payload = {
      name: get(form, "name"),
      role: get(form, "role"),
      availability: get(form, "availability"),
      qualifications: get(form, "qualifications"),
      compliance_status: get(form, "compliance"),
      police_check_expiry: get(form, "policeCheckExpiry") || null,
      ndis_worker_screening_expiry: get(form, "ndisWorkerScreeningExpiry") || null,
      first_aid_expiry: get(form, "firstAidExpiry") || null,
      cpr_expiry: get(form, "cprExpiry") || null,
      drivers_licence_expiry: get(form, "driversLicenceExpiry") || null,
      working_with_children_expiry: get(form, "workingWithChildrenExpiry") || null,
      training_certificates: get(form, "trainingCertificates")
    };
    const { error } = await supabase.from("support_workers").update(payload).eq("id", editingWorker.id);
    if (error) { setNotice(error.message); return; }
    setNotice("Worker updated.");
    setEditingWorker(null);
    await refresh();
  }

  async function deleteWorker(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from("support_workers").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setDeletingWorkerId(null);
    setNotice("Worker deleted.");
    await refresh();
  }

  return (
    <AppShell title="Support Workers" eyebrow={notice}>
      {editingWorker ? (
        <WorkerEditModal worker={editingWorker} onClose={() => setEditingWorker(null)} onSubmit={updateWorker} />
      ) : null}

      {showAddWorker ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Support Workers</p>
                <h2 className="text-xl font-semibold text-ink">Add support worker</h2>
              </div>
              <button onClick={() => setShowAddWorker(false)} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <RecordForm submitLabel="Add worker and send invite" onSubmit={submit}>
                <Field name="name" label="Full name" placeholder="Full name" />
                <Field name="email" label="Email address" type="email" placeholder="worker@example.com" />
                <Field name="role" label="Role title" placeholder="Disability Support Worker" />
                <Field name="availability" label="Availability" placeholder="e.g. Mon–Fri, weekends" />
                <Area name="qualifications" label="Qualifications" placeholder="Qualifications, training, clearances, and checks" />
                <Field name="compliance" label="Compliance status" placeholder="Clear, pending, or renewal details" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compliance expiry dates</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="policeCheckExpiry" label="Police check" type="date" />
                  <Field name="ndisWorkerScreeningExpiry" label="NDIS worker screening" type="date" />
                  <Field name="firstAidExpiry" label="First aid certificate" type="date" />
                  <Field name="cprExpiry" label="CPR" type="date" />
                  <Field name="driversLicenceExpiry" label="Driver's licence" type="date" />
                  <Field name="workingWithChildrenExpiry" label="Working with children check" type="date" required={false} />
                </div>
                <Area name="trainingCertificates" label="Training certificates" placeholder="List certificates, completion dates, renewal due dates, and evidence location" />
              </RecordForm>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6">

        {/* Compliance alerts */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Compliance alerts</h2>
              <p className="mt-1 text-sm text-slate-500">Expired records and records expiring within 60 days.</p>
            </div>
            <span className={`shrink-0 rounded px-3 py-1 text-sm font-semibold ${complianceAlerts.length ? "bg-coral/10 text-coral" : "bg-gumleaf/10 text-gumleaf"}`}>
              {complianceAlerts.length ? `${complianceAlerts.length} alert${complianceAlerts.length === 1 ? "" : "s"}` : "All clear"}
            </span>
          </div>
          {complianceAlerts.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {complianceAlerts.map((alert) => (
                <div key={`${alert.worker}-${alert.label}`} className={`rounded border p-3 text-sm ${alert.status === "expired" ? "border-coral/25 bg-coral/5" : "border-banksia/40 bg-banksia/10"}`}>
                  <p className="font-semibold text-ink">{alert.worker}</p>
                  <p className="mt-1 text-slate-700">{alert.label}: {alert.message}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Workers table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#fbfdff] px-5 py-3">
            <div>
              <h2 className="font-semibold text-ink">All support workers</h2>
              {workers.length > 0 && <p className="text-xs text-slate-500">{workers.length} record{workers.length === 1 ? "" : "s"}</p>}
            </div>
            <button
              type="button"
              onClick={() => setShowAddWorker(true)}
              className="inline-flex items-center gap-2 rounded border border-gumleaf/30 bg-gumleaf px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gumleaf/90"
            >
              <Plus className="h-4 w-4" />
              Add support worker
            </button>
          </div>
          {workers.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Compliance</th>
                    <th className="px-4 py-3 text-center">Shifts</th>
                    <th className="px-4 py-3 text-center">Docs</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((worker) => {
                    const alerts = workerComplianceAlerts(worker);
                    const expiredCount = alerts.filter((a) => a.status === "expired").length;
                    const warningCount = alerts.filter((a) => a.status !== "expired").length;
                    return (
                      <tr key={worker.id || worker.email} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{worker.name}</p>
                          <p className="text-xs text-slate-500">{worker.availability || "Availability not set"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{worker.email || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{worker.role || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                            expiredCount ? "bg-coral/10 text-coral" :
                            warningCount ? "bg-banksia/20 text-banksia" :
                            "bg-gumleaf/10 text-gumleaf"
                          }`}>
                            {expiredCount ? `${expiredCount} expired` : warningCount ? `${warningCount} expiring` : "Clear"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-ink">{worker.assigned}</td>
                        <td className="px-4 py-3 text-center">
                          {[worker.policeCheckExpiry, worker.ndisWorkerScreeningExpiry, worker.firstAidExpiry, worker.cprExpiry, worker.driversLicenceExpiry].filter(Boolean).length}
                          <span className="text-xs text-slate-400">/5</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {deletingWorkerId === worker.id ? (
                              <>
                                <span className="text-xs text-slate-500">Delete?</span>
                                <button type="button" onClick={() => void deleteWorker(worker.id)}
                                  className="inline-flex items-center gap-1 rounded border border-coral/30 bg-coral/10 px-2.5 py-1.5 text-xs font-semibold text-coral hover:bg-coral/20">
                                  Yes, delete
                                </button>
                                <button type="button" onClick={() => setDeletingWorkerId(null)}
                                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setEditingWorker(worker)}
                                  className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button type="button" onClick={() => setDeletingWorkerId(worker.id)}
                                  className="inline-flex items-center gap-1.5 rounded border border-coral/20 px-2.5 py-1.5 text-xs font-semibold text-coral/80 hover:bg-coral/5">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-slate-600">No support workers yet</p>
              <p className="mt-1 text-sm text-slate-400">Click &ldquo;Add support worker&rdquo; above to get started.</p>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}

export function WorkerPortalPage() {
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerNameFromSession, setWorkerNameFromSession] = useState("");
  const [visibleShifts, setVisibleShifts] = useState<ShiftRecord[]>([]);
  const [openShifts, setOpenShifts] = useState<ShiftRecord[]>([]);
  const [visibleParticipants, setVisibleParticipants] = useState<ParticipantRecord[]>([]);
  const [workerNotes, setWorkerNotes] = useState<ProgressNoteRecord[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRecord[]>([]);
  const [signingShift, setSigningShift] = useState<ShiftRecord | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const email = user?.email ?? "";
      const name = String(user?.user_metadata?.full_name || user?.email || user?.id || "");
      const shifts = email ? await loadShifts(email) : [];
      const availableOpenShifts = email ? await loadOpenShifts() : [];
      const participants = await loadParticipantsForShifts(shifts);
      const [availabilityRows, leaveRows, noteRows] = email
        ? await Promise.all([loadWorkerAvailability(email), loadWorkerLeave(email), loadProgressNotes(email)])
        : [[], [], []];
      setWorkerEmail(email);
      setWorkerNameFromSession(name);
      setVisibleShifts(shifts);
      setOpenShifts(availableOpenShifts);
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

  async function acceptOpenShift(shiftId: string) {
    const ok = await postJson(`/api/shifts/${shiftId}/accept`, {}, setNotice);
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

  const todayShiftCount = visibleShifts.filter(isTodayShift).length;
  const weekHours = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    return Math.round(visibleShifts.filter(s => s.startsAt && new Date(s.startsAt) >= weekStart).reduce((sum, s) => sum + shiftHours(s.startsAt ?? "", s.endsAt ?? ""), 0) * 10) / 10;
  }, [visibleShifts]);
  const monthNoteCount = useMemo(() => {
    const now = new Date();
    return workerNotes.filter(n => { const d = new Date(n.serviceDate); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  }, [workerNotes]);

  return (
    <AppShell title="Worker Portal" eyebrow={`${workerName || "Worker"} | ${notice}`} hidePdf>
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Today's shifts", value: String(todayShiftCount), sub: todayShiftCount ? "Scheduled today" : "No shifts today" },
            { label: "Hours this week", value: `${weekHours}h`, sub: "From assigned shifts" },
            { label: "Notes this month", value: String(monthNoteCount), sub: "Progress notes submitted" },
            { label: "Open shifts", value: String(openShifts.length), sub: openShifts.length ? "Available to accept" : "None available" }
          ].map((stat) => (
            <div key={stat.label} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
        <WorkerShiftMobilePanel
          shifts={visibleShifts}
          openShifts={openShifts}
          participants={visibleParticipants}
          notes={workerNotes}
          onClock={clockShift}
          onSubmit={(shift) => setSigningShift(shift)}
          onAcceptOpenShift={acceptOpenShift}
        />
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

        <div className="grid gap-3 sm:grid-cols-2">
          <WorkerProgressNoteForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
          <WorkerIncidentForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
          <WorkerLeaveForm workerName={workerName} workerEmail={workerEmail} leaveRequests={leaveRequests} onSaved={refresh} setNotice={setNotice} />
          <WorkerAvailabilityForm workerName={workerName} workerEmail={workerEmail} availability={availability} onSaved={refresh} setNotice={setNotice} />
        </div>

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
      {signingShift ? <ShiftSignatureModal shift={signingShift} onClose={() => setSigningShift(null)} onSubmit={submitSignedShift} /> : null}
    </AppShell>
  );
}

export function MyShiftsPage() {
  const [workerName, setWorkerName] = useState("");
  const [visibleShifts, setVisibleShifts] = useState<ShiftRecord[]>([]);
  const [signingShift, setSigningShift] = useState<ShiftRecord | null>(null);
  const [notice, setNotice] = useState("");

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
              className="rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
  const [notice, setNotice] = useState("");

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
                  <button type="button" onClick={() => void approveShift(shift.id)} className="rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/20">Approve</button>
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
  const [params, setParams] = useState({ invite: "", email: "", name: "" });
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    setParams({
      invite: p.get("invite") ?? "",
      email: p.get("email") ?? "",
      name: p.get("wname") ?? ""
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const password = get(form, "password");
    if (password.length < 8) { setNotice("Password must be at least 8 characters."); return; }
    setSaving(true);
    setNotice("");
    const response = await fetch("/api/register-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email || get(form, "email"),
        password,
        name: get(form, "name"),
        organisation: "Worker portal",
        role: "support_worker",
        invite: params.invite || get(form, "invite")
      })
    });
    const result = await response.json();
    setSaving(false);
    if (response.ok) {
      setDone(true);
      setNotice(result.message ?? "Login created. You can now sign in to the worker portal.");
    } else {
      setNotice(result.message ?? "Could not create login.");
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-xl rounded border border-gumleaf/25 bg-white p-8 shadow-panel text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-gumleaf" />
          <h1 className="mt-4 text-2xl font-semibold text-ink">Login created</h1>
          <p className="mt-3 text-sm text-slate-600">{notice}</p>
          <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
            <p className="font-semibold text-ink mb-2">What happens next</p>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>Sign in using your email and the password you just created</li>
              <li>Your shifts will appear in the Worker Portal once assigned by your coordinator</li>
              <li>You can submit progress notes, report incidents, and request leave from the portal</li>
            </ul>
          </div>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded bg-gumleaf px-5 py-3 text-sm font-semibold text-white hover:bg-gumleaf/90">
            Sign in to CareOS
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-gumleaf">CareOS Worker Invite</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Create your login</h1>
        {params.email ? (
          <p className="mt-3 text-sm text-slate-600">
            Your email address <strong>{params.email}</strong> has been pre-filled from your invite link. Just choose a password to get started.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Enter your invite code, email, and choose a password to create your worker login.</p>
        )}
        {notice ? <p className="mt-3 rounded border border-coral/20 bg-coral/5 p-3 text-sm text-coral">{notice}</p> : null}
        <form onSubmit={submit} className="mt-5 grid gap-4">
          {params.invite ? <input type="hidden" name="invite" value={params.invite} /> : (
            <Field name="invite" label="Invite code" placeholder="Invite code from your email" />
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input name="name" type="text" required defaultValue={params.name}
              placeholder="Your full name"
              className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
          </div>
          {params.email ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{params.email}</div>
            </div>
          ) : (
            <Field name="email" label="Email address" type="email" placeholder="worker@example.com" />
          )}
          <PasswordField name="password" label="Create a password" placeholder="Choose a strong password" show={showPassword} setShow={setShowPassword} />
          <button disabled={saving} className="min-h-12 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-gumleaf/90 disabled:opacity-60">
            {saving ? "Creating login…" : "Create login"}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-gumleaf hover:text-ink">Sign in</Link></p>
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
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [cloningFrom, setCloningFrom] = useState<ShiftRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const handledRouteAction = useRef("");

  const filteredShifts = useMemo(() => filterRosterShifts(shifts, searchTerm, statusFilter), [shifts, searchTerm, statusFilter]);

  const refresh = useCallback(async () => {
    const [loadedShifts, loadedParticipants, loadedWorkers, loadedAvailability, loadedLeave] = await Promise.all([loadShifts(), loadParticipants(), loadWorkers(), loadWorkerAvailability(), loadWorkerLeave()]);
    setShifts(loadedShifts);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setAvailability(loadedAvailability);
    setLeaveRequests(loadedLeave);
    setNotice(loadedShifts.length ? "" : "No shifts yet. Add a shift to build the roster.");
    setRosterLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status && rosterStatusFilters.some((item) => normaliseRosterText(item.value) === normaliseRosterText(status))) {
      setStatusFilter(status);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const createAction = params.get("new");
    const shiftId = params.get("shift");
    const actionKey = `${createAction ?? ""}:${shiftId ?? ""}`;
    if (actionKey === ":" || handledRouteAction.current === actionKey) return;

    if (createAction === "shift") {
      handledRouteAction.current = actionKey;
      setEditingShift(null);
      setCreateOpen(true);
      return;
    }

    if (shiftId) {
      if (!rosterLoaded) return;
      handledRouteAction.current = actionKey;
      const selectedShift = shifts.find((shift) => shift.id === shiftId);
      if (selectedShift) {
        setCreateOpen(false);
        setEditingShift(selectedShift);
      } else {
        setNotice("Shift link opened, but that shift could not be found.");
      }
    }
  }, [rosterLoaded, shifts]);

  async function submit(form: FormData) {
    const start = get(form, "start");
    const end = get(form, "end");
    const workerEmail = get(form, "workerEmail").toLowerCase();
    const participantName = get(form, "participant");
    const worker = workers.find((item) => item.email.toLowerCase() === workerEmail);
    const status = get(form, "status");
    const ok = await postJson(
      "/api/shifts",
      {
        participant_name: participantName,
        support_worker_name: workerEmail ? worker?.name ?? "" : "",
        support_worker_email: workerEmail ? worker?.email ?? workerEmail : "",
        location: get(form, "location"),
        starts_at: start,
        ends_at: end,
        status: workerEmail ? status : status === "Draft" ? "Open" : status,
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
    const status = get(form, "status");
    const ok = await patchJson(
      "/api/shifts",
      {
        id: editingShift.id,
        participant_name: get(form, "participant"),
        support_worker_name: workerEmail ? worker?.name ?? "" : "",
        support_worker_email: workerEmail ? worker?.email ?? workerEmail : "",
        location: get(form, "location"),
        starts_at: get(form, "start"),
        ends_at: get(form, "end"),
        status: workerEmail ? status : status === "Draft" ? "Open" : status,
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

  async function importShiftsCsv(file: File) {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { setNotice("CSV is empty or has no data rows."); return; }
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
    let imported = 0;
    let failed = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ""; });
      const participant = row.participant_name || row.participant || "";
      const workerEmail = (row.worker_email || row.support_worker_email || "").toLowerCase();
      const worker = workers.find((w) => w.email.toLowerCase() === workerEmail);
      const start = row.starts_at || row.start || row.start_time || "";
      const end = row.ends_at || row.end || row.end_time || "";
      if (!participant || !start || !end) { failed++; continue; }
      const ok = await postJson("/api/shifts", {
        participant_name: participant,
        support_worker_name: worker?.name ?? row.worker_name ?? "",
        support_worker_email: workerEmail || (worker?.email ?? ""),
        location: row.location ?? "",
        starts_at: start,
        ends_at: end,
        status: row.status || (workerEmail ? "Draft" : "Open")
      }, setNotice);
      if (ok) imported++; else failed++;
    }
    setNotice(`Import complete: ${imported} shifts added${failed > 0 ? `, ${failed} rows skipped (missing participant, start, or end)` : ""}.`);
    if (imported > 0) await refresh();
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
      <div className="mt-4 rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">Bulk shift import</h2>
            <p className="mt-1 text-sm text-slate-500">Upload a CSV with columns: participant_name, starts_at, ends_at, worker_email (optional), location (optional), status (optional).</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => {
              const csv = "participant_name,starts_at,ends_at,worker_email,location,status\nJohn Smith,2026-07-01T09:00,2026-07-01T13:00,worker@example.com,Home,Draft\n";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "shift-import-template.csv"; a.click();
              URL.revokeObjectURL(url);
            }} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Template
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-3 py-2 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">
              <Upload className="h-4 w-4" />
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importShiftsCsv(f); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      </div>
      <RecurringSeriesPanel shifts={shifts} setNotice={setNotice} onSaved={refresh} />
      {createOpen ? <ShiftCreateModal participants={participants} workers={workers} availability={availability} leaveRequests={leaveRequests} onClose={() => setCreateOpen(false)} onSubmit={submit} /> : null}
      {cloningFrom ? <ShiftCreateModal participants={participants} workers={workers} availability={availability} leaveRequests={leaveRequests} cloneSource={cloningFrom} onClose={() => setCloningFrom(null)} onSubmit={async (form) => { await submit(form); setCloningFrom(null); }} /> : null}
      {editingShift ? <ShiftCreateModal participants={participants} workers={workers} availability={availability} leaveRequests={leaveRequests} initialShift={editingShift} onClone={() => { setCloningFrom(editingShift); setEditingShift(null); }} onClose={() => setEditingShift(null)} onSubmit={updateShift} /> : null}
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
  const [notice, setNotice] = useState("");

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
          : ""
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
      <ProgressNoteAssistPanel participants={participants} setNotice={setNotice} />
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

function ProgressNoteAssistPanel({ participants, setNotice }: { participants: ParticipantRecord[]; setNotice: (message: string) => void }) {
  const [rawNote, setRawNote] = useState("");
  const [draft, setDraft] = useState("");
  const [participant, setParticipant] = useState("");
  const [category, setCategory] = useState("General");
  const [listening, setListening] = useState(false);

  async function startVoice() {
    const recognitionConstructor = typeof window !== "undefined" ? ((window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition) : null;
    if (!recognitionConstructor) {
      setNotice("Voice-to-text is not available in this browser. Use Chrome or Edge on desktop or mobile.");
      return;
    }
    const recognition = new recognitionConstructor();
    recognition.lang = "en-AU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice capture stopped. Check microphone permission and try again.");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      setRawNote((current) => [current, transcript].filter(Boolean).join(" "));
      setNotice("Voice text captured. Review it before saving a progress note.");
    };
    recognition.start();
  }

  async function generateDraft() {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before using the note assistant.");
      return;
    }
    const response = await fetch("/api/progress-notes/assistant", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw_note: rawNote, participant_name: participant, category })
    });
    const result = await response.json().catch(() => ({ message: "Assistant could not generate a draft." }));
    setNotice(result.message);
    if (response.ok) setDraft(String(result.draft ?? ""));
  }

  return (
    <section className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Voice-to-text and note assistant</h2>
          <p className="mt-1 text-sm text-slate-500">Capture rough notes by voice, then generate a structured draft for review before saving.</p>
        </div>
        <button type="button" onClick={() => void startVoice()} className="rounded border border-[#354aa3]/30 px-4 py-2 text-sm font-semibold text-[#354aa3] hover:bg-[#354aa3]/5">
          {listening ? "Listening..." : "Start voice note"}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Participant context</span>
            <select value={participant} onChange={(event) => setParticipant(event.target.value)} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
              <option value="">Not selected</option>
              {participants.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Support category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
              {["General", "Self care", "Community access", "Medication prompt", "Behaviour support", "Transport assistance"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <textarea value={rawNote} onChange={(event) => setRawNote(event.target.value)} rows={7} placeholder="Type or dictate rough notes here. Review for accuracy before using in a formal progress note." className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
          <button type="button" onClick={() => void generateDraft()} className="rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">
            Generate structured draft
          </button>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Assistant draft</p>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={14} placeholder="Generated draft appears here. Review and copy into the formal progress note fields when correct." className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
        </div>
      </div>
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
  const [notice, setNotice] = useState("");

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
          : ""
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
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<ModuleItem[]>([]);
  const [workerContext, setWorkerContext] = useState({ role: "support_worker" as UserRole, email: "", name: "" });
  const [workerShifts, setWorkerShifts] = useState<ShiftRecord[]>([]);
  const [workerParticipants, setWorkerParticipants] = useState<ParticipantRecord[]>([]);
  const content = moduleContent(kind);

  const refresh = useCallback(async () => {
    const rows = await loadModuleItems(kind);
    setItems(rows);
    setNotice(rows.length ? "" : `No ${content.title.toLowerCase()} records yet.`);
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
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const note = get(form, "note").trim();
    if (!note) { setNotice("Progress note details are required."); return; }
    const sig = get(form, "signature").trim();
    if (!sig) { setNotice("A digital signature is required."); return; }
    setSaving(true);
    setNotice("");
    const ok = await persist(
      "progress_notes",
      {
        participant_name: get(form, "participant"),
        worker_name: workerName,
        worker_email: workerEmail,
        service_date: get(form, "serviceDate") || today,
        category: get(form, "category"),
        note,
        outcomes: get(form, "outcomes"),
        digital_signature: sig,
        is_important: get(form, "important") === "Important"
      },
      setNotice,
      { action: "progress_note", recordLabel: get(form, "participant"), metadata: { category: get(form, "category"), operation: "create" } }
    );
    setSaving(false);
    if (ok) { formEl.reset(); setNotes([note, ...notes]); setNotice("Progress note saved."); setOpen(false); }
  }

  return (
    <section className="rounded border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gumleaf/10 text-gumleaf"><FilePlus2 className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-ink">Progress note</p>
            <p className="text-xs text-slate-500">{notes.length ? `${notes.length} added this session` : "Record support provided"}</p>
          </div>
        </div>
        <span className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${open ? "border-slate-200 text-slate-500" : "border-gumleaf/20 bg-gumleaf/10 text-gumleaf"}`}>
          {open ? "Close" : "Add note"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-4">
          {participants.length === 0 ? (
            <EmptyWorkerState title="No assigned participant" message="Progress notes can only be added for participants linked to your assigned shifts." />
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="participant" label="Client" options={participants.map((p) => p.name)} />
                <Select name="category" label="Support category" options={["Self care", "Community access", "Medication prompt", "Meal preparation", "Behaviour support", "Transport assistance"]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="serviceDate" label="Service date" type="date" defaultValue={today} max={today} />
                <Select name="important" label="Priority" options={["Standard", "Important"]} />
              </div>
              <ReadOnlyField label="Worker" value={workerName || "Current worker"} />
              <Area name="note" label="Progress note details" placeholder="Write the support provided, outcomes, changes, and follow-up required." />
              <Area name="outcomes" label="Outcomes" placeholder="Record achieved goals, progress, risks, and follow-up actions." />
              <Field name="signature" label="Digital signature" placeholder="Type full name as signature" />
              {notice ? <p className={`text-sm ${notice.includes("saved") ? "text-gumleaf" : "text-coral"}`}>{notice}</p> : null}
              <div className="flex gap-3">
                <button disabled={saving} className="min-h-11 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-2.5 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:opacity-60">{saving ? "Saving…" : "Add progress note"}</button>
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          )}
          {notes.length ? (
            <div className="mt-4 grid gap-2">
              {notes.map((note) => (
                <p key={note} className="rounded bg-gumleaf/5 p-3 text-sm text-slate-700">{note}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function WorkerIncidentForm({ workerName, workerEmail, participants }: { workerName: string; workerEmail: string; participants: ParticipantRecord[] }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const todayDatetime = `${now.toISOString().slice(0, 10)}T${now.toTimeString().slice(0, 5)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const summary = get(form, "summary").trim();
    if (!summary) { setNotice("Incident details are required."); return; }
    setSaving(true);
    setNotice("");
    const ok = await persist(
      "incident_reports",
      {
        participant_name: get(form, "participant"),
        worker_name: workerName,
        worker_email: workerEmail,
        incident_type: get(form, "incidentType"),
        incident_date: get(form, "incidentDate") || now.toISOString(),
        priority: get(form, "priority"),
        summary
      },
      setNotice,
      { action: "incident_report", recordLabel: get(form, "participant"), metadata: { priority: get(form, "priority"), incidentType: get(form, "incidentType"), operation: "create" } }
    );
    setSaving(false);
    if (ok) { formEl.reset(); setReports([summary, ...reports]); setNotice("Incident report submitted."); setOpen(false); }
  }

  return (
    <section className="rounded border border-coral/20 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-coral/10 text-coral"><AlertTriangle className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-ink">Report incident</p>
            <p className="text-xs text-slate-500">{reports.length ? `${reports.length} reported this session` : "Escalate immediately"}</p>
          </div>
        </div>
        <span className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${open ? "border-slate-200 text-slate-500" : "border-coral/20 bg-coral/10 text-coral"}`}>
          {open ? "Close" : "Report"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-4">
          {participants.length === 0 ? (
            <EmptyWorkerState title="No assigned participant" message="Incidents can only be submitted for participants linked to your assigned shifts." />
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="participant" label="Client" options={participants.map((p) => p.name)} />
                <Select name="incidentType" label="Incident type" options={["Injury to participant", "Injury to worker", "Behavioural incident", "Medical emergency", "Near miss", "Property damage", "Other"]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select name="priority" label="Priority" options={["High", "Medium", "Low"]} />
                <Field name="incidentDate" label="Date & time" type="datetime-local" defaultValue={todayDatetime} />
              </div>
              <ReadOnlyField label="Reported by" value={workerName || "Current worker"} />
              <Area name="summary" label="Incident details" placeholder="Describe what happened, actions taken, people notified, and follow-up required." />
              {notice ? <p className={`text-sm ${notice.includes("submitted") ? "text-gumleaf" : "text-coral"}`}>{notice}</p> : null}
              <div className="flex gap-3">
                <button disabled={saving} className="min-h-11 rounded bg-coral/10 border border-coral/20 px-4 py-2.5 text-sm font-semibold text-coral hover:bg-coral/20 disabled:opacity-60">{saving ? "Submitting…" : "Submit incident"}</button>
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          )}
          {reports.length ? (
            <div className="mt-4 grid gap-2">
              {reports.map((report) => (
                <p key={report} className="rounded bg-coral/5 p-3 text-sm text-slate-700">{report}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localNotice, setLocalNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const startsAt = get(form, "startsAt");
    const endsAt = get(form, "endsAt");
    if (!startsAt || !endsAt) { setLocalNotice("Start and end dates are required."); return; }
    if (endsAt < startsAt) { setLocalNotice("End date must be after the start date."); return; }
    setLocalNotice("");
    setSaving(true);
    const ok = await postJson(
      "/api/leave",
      { worker_name: workerName, worker_email: workerEmail, leave_type: get(form, "leaveType"), starts_at: startsAt, ends_at: endsAt, reason: get(form, "reason") },
      setNotice
    );
    setSaving(false);
    if (ok) { formEl.reset(); setOpen(false); await onSaved(); }
  }

  return (
    <section className="rounded border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-harbour/10 text-harbour"><CalendarPlus className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-ink">Leave request</p>
            <p className="text-xs text-slate-500">{leaveRequests.length ? `${leaveRequests.length} request${leaveRequests.length === 1 ? "" : "s"} on file` : "Annual leave, sick leave, unavailability"}</p>
          </div>
        </div>
        <span className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${open ? "border-slate-200 text-slate-500" : "border-harbour/20 bg-harbour/10 text-harbour"}`}>
          {open ? "Close" : "Request"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-4 grid gap-4">
          <form onSubmit={submit} className="grid gap-4">
            <Select name="leaveType" label="Leave type" options={leaveTypes} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="startsAt" label="Start date" type="date" />
              <Field name="endsAt" label="End date" type="date" />
            </div>
            <OptionalArea name="reason" label="Reason / notes" placeholder="Annual leave, sick leave, appointment, training, or unavailable period details" />
            {localNotice ? <p className="text-sm text-coral">{localNotice}</p> : null}
            <div className="flex gap-3">
              <button disabled={saving} className="min-h-11 rounded bg-harbour/10 border border-harbour/20 px-4 py-2.5 text-sm font-semibold text-harbour hover:bg-harbour/20 disabled:opacity-60">{saving ? "Submitting…" : "Submit leave request"}</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
            </div>
          </form>
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
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localNotice, setLocalNotice] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const startTime = get(form, "startTime");
    const endTime = get(form, "endTime");
    if (startTime && endTime && endTime <= startTime) { setLocalNotice("End time must be after start time."); return; }
    setLocalNotice("");
    setSaving(true);
    const ok = await postJson(
      "/api/availability",
      { worker_name: workerName, worker_email: workerEmail, available_date: get(form, "availableDate"), start_time: startTime, end_time: endTime, availability_status: get(form, "status"), notes: get(form, "notes") },
      setNotice
    );
    setSaving(false);
    if (ok) { formEl.reset(); setOpen(false); await onSaved(); }
  }

  return (
    <section className="rounded border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-banksia/20 text-banksia"><CalendarDays className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-ink">My availability</p>
            <p className="text-xs text-slate-500">{availability.length ? `${availability.length} slot${availability.length === 1 ? "" : "s"} on file` : "Set available days and unavailable periods"}</p>
          </div>
        </div>
        <span className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${open ? "border-slate-200 text-slate-500" : "border-banksia/30 bg-banksia/10 text-banksia"}`}>
          {open ? "Close" : "Update"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-4 grid gap-4">
          <form onSubmit={submit} className="grid gap-4">
            <Field name="availableDate" label="Date" type="date" min={today} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="startTime" label="Start time" type="time" />
              <Field name="endTime" label="End time" type="time" />
            </div>
            <Select name="status" label="Availability type" options={availabilityStatuses} />
            <OptionalArea name="notes" label="Notes" placeholder="Available day, unavailable appointment, preferred locations, transport limits, or leave details" />
            {localNotice ? <p className="text-sm text-coral">{localNotice}</p> : null}
            <div className="flex gap-3">
              <button disabled={saving} className="min-h-11 rounded bg-banksia/10 border border-banksia/30 px-4 py-2.5 text-sm font-semibold text-banksia hover:bg-banksia/20 disabled:opacity-60">{saving ? "Saving…" : "Submit availability"}</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
            </div>
          </form>
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
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function WorkerShiftMobilePanel({
  shifts,
  openShifts,
  participants,
  notes,
  onClock,
  onSubmit,
  onAcceptOpenShift
}: {
  shifts: ShiftRecord[];
  openShifts: ShiftRecord[];
  participants: ParticipantRecord[];
  notes: ProgressNoteRecord[];
  onClock: (shiftId: string, action: "in" | "out") => Promise<void>;
  onSubmit: (shift: ShiftRecord) => void;
  onAcceptOpenShift: (shiftId: string) => Promise<void>;
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
              className="min-h-16 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-base font-semibold text-gumleaf shadow-sm hover:bg-gumleaf/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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

          <div className="mt-4 text-sm">
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
              <h2 className="font-semibold text-ink">Open shifts</h2>
              <p className="mt-1 text-sm text-slate-500">Claim available shifts after checking time and location.</p>
            </div>
            <CalendarPlus className="h-5 w-5 text-[#354aa3]" />
          </div>
          {openShifts.length ? (
            <div className="mt-3 grid gap-2">
              {openShifts.slice(0, 4).map((shift) => (
                <div key={shift.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-ink">{shift.participantName || shift.participant}</p>
                  <p className="mt-1 text-slate-600">{shift.time} | {shift.location || "Location not recorded"}</p>
                  <button type="button" onClick={() => void onAcceptOpenShift(shift.id)} className="mt-3 w-full rounded bg-[#354aa3] px-3 py-2 text-sm font-semibold text-white hover:bg-[#283a82]">
                    Accept shift
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No open shifts are available right now.</p>
          )}
        </section>
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


const WORKER_COMPLIANCE_DOCS = [
  { key: "policeCheck", name: "policeCheckExpiry", label: "Police check expiry", title: "Police Check" },
  { key: "ndisScreening", name: "ndisWorkerScreeningExpiry", label: "NDIS worker screening expiry", title: "NDIS Worker Screening" },
  { key: "firstAid", name: "firstAidExpiry", label: "First aid expiry", title: "First Aid Certificate" },
  { key: "cpr", name: "cprExpiry", label: "CPR expiry", title: "CPR Certificate" },
  { key: "driversLicence", name: "driversLicenceExpiry", label: "Driver's licence expiry", title: "Driver's Licence" },
  { key: "workingWithChildren", name: "workingWithChildrenExpiry", label: "Working with children check expiry", title: "Working with Children Check" },
] as const;

function WorkerEditModal({ worker, onClose, onSubmit }: { worker: WorkerRecord; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const [uploadStates, setUploadStates] = useState<Record<string, "idle" | "uploading" | "done" | "error">>({});
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(key: string, docTitle: string, file: File) {
    if (!supabase) return;
    setUploadStates((prev) => ({ ...prev, [key]: "uploading" }));
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setUploadStates((prev) => ({ ...prev, [key]: "error" })); return; }
    const body = new FormData();
    body.append("file", file);
    body.append("title", `Worker Compliance: ${docTitle} - ${worker.name}`);
    const res = await fetch("/api/documents", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    setUploadStates((prev) => ({ ...prev, [key]: res.ok ? "done" : "error" }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    void onSubmit(new FormData(event.currentTarget)).finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Edit worker</p>
            <h2 className="text-xl font-semibold text-ink">{worker.name}</h2>
          </div>
          <button onClick={onClose} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 p-5">
          <Field name="name" label="Full name" defaultValue={worker.name} />
          <Field name="role" label="Role" defaultValue={worker.role} required={false} />
          <Field name="availability" label="Availability" defaultValue={worker.availability} required={false} />
          <Area name="qualifications" label="Qualifications" defaultValue={worker.qualifications} required={false} />
          <Field name="compliance" label="Compliance notes" defaultValue={worker.compliance} required={false} />
          <p className="text-sm font-semibold text-slate-700">Compliance documents</p>
          <p className="text-xs text-slate-500 -mt-2">Update expiry dates and optionally upload a new document file for each compliance item.</p>
          <div className="grid gap-3">
            {WORKER_COMPLIANCE_DOCS.map(({ key, name, label, title }) => {
              const defaultVal = worker[name as keyof WorkerRecord] as string;
              const upState = uploadStates[key] ?? "idle";
              return (
                <div key={key} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <Field name={name} label={label} type="date" defaultValue={defaultVal} required={false} />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={(el) => { fileRefs.current[key] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileSelect(key, title, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRefs.current[key]?.click()}
                      disabled={upState === "uploading"}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {upState === "uploading" ? "Uploading…" : "Upload new document"}
                    </button>
                    {upState === "done" && <span className="text-xs font-semibold text-gumleaf">Uploaded</span>}
                    {upState === "error" && <span className="text-xs font-semibold text-coral">Upload failed — try again</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <Area name="trainingCertificates" label="Training certificates" defaultValue={worker.trainingCertificates} required={false} />
          <div className="flex gap-3">
            <button disabled={saving} className="min-h-12 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20 disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" onClick={onClose} className="min-h-12 rounded border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="mt-4 rounded border border-dashed border-indigo-100 bg-slate-50 p-4 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "Create Shift", icon: CalendarPlus, href: "/rostering?new=shift" },
    { label: "Add Participant", icon: ShieldCheck, href: "/participants" },
    { label: "Add Support Worker", icon: Users, href: "/support-workers" },
    { label: "New Progress Note", icon: FilePlus2, href: "/progress-notes" },
    { label: "Log Incident", icon: AlertTriangle, href: "/incident-reports" },
    { label: "Upload Document", icon: Upload, href: "/documents" },
    { label: "Create Invoice", icon: ClipboardPlus, href: "/invoices" }
  ];
  return (
    <div className="rounded-lg border border-indigo-100/80 bg-white p-4 shadow-panel">
      <h2 className="font-semibold text-ink">Quick Actions</h2>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/60">
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

function ShiftTable({
  title,
  shifts,
  emptyMessage,
  renderActions,
  actionHref,
  actionLabel = "Open action",
  rowHref
}: {
  title: string;
  shifts: ShiftRecord[];
  emptyMessage: string;
  renderActions?: (shift: ShiftRecord) => React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  rowHref?: (shift: ShiftRecord) => string;
}) {
  const hasRowAction = Boolean(renderActions || rowHref);
  return (
    <div className="flex h-full flex-col rounded border border-indigo-100/80 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-indigo-100 bg-[#fbfdff] px-4 py-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        {actionHref ? (
          <Link href={actionHref} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gumleaf/5 text-gumleaf ring-1 ring-[#cfe9e4] transition hover:bg-gumleaf/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7d73]/20" aria-label={actionLabel}>
            <CalendarPlus className="h-5 w-5" />
          </Link>
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-gumleaf ring-1 ring-indigo-100">
            <CalendarPlus className="h-5 w-5" />
          </span>
        )}
      </div>
      {shifts.length ? (
        <div className="overflow-x-auto scrollbar-subtle">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-indigo-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-r border-indigo-100 px-4 py-3">Time</th>
                <th className="border-r border-indigo-100 px-4 py-3">Participant</th>
                <th className="border-r border-indigo-100 px-4 py-3">Support worker</th>
                <th className="border-r border-indigo-100 px-4 py-3">Location</th>
                <th className="border-r border-indigo-100 px-4 py-3">Status</th>
                <th className="border-r border-indigo-100 px-4 py-3">Approval</th>
                {hasRowAction ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((shift, index) => (
                <tr key={`${shift.time}-${shift.participantName}-${index}`} className={rowHref ? "transition hover:bg-slate-50" : undefined}>
                  <td className="whitespace-nowrap border-r border-indigo-50 px-4 py-4 font-medium text-ink">{shift.time}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{shift.participant}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{shift.worker || "Unassigned"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4 text-slate-700">{shift.location || "Not recorded"}</td>
                  <td className="border-r border-indigo-50 px-4 py-4"><span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status || "Draft"}</span></td>
                  <td className="border-r border-indigo-50 px-4 py-4">
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
                  {hasRowAction ? (
                    <td className="px-4 py-4">
                      {renderActions ? renderActions(shift) : rowHref ? (
                        <Link href={rowHref(shift)} className="inline-flex rounded border border-gumleaf/20 bg-gumleaf/5 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/10">
                          Open shift
                        </Link>
                      ) : null}
                    </td>
                  ) : null}
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<"status" | "types" | "sort" | "others">("status");
  const [statusSearch, setStatusSearch] = useState("");
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className={`rounded border p-2 hover:bg-slate-50 ${filterOpen || statusFilter !== "all" ? "border-gumleaf/30 bg-gumleaf/5 text-gumleaf" : "border-slate-200 bg-white text-slate-600"}`}
              aria-label="Filter scheduler"
              aria-expanded={filterOpen}
            >
              <Filter className="h-4 w-4" />
            </button>
            {filterOpen ? (
              <RosterFilterPopover
                section={filterSection}
                setSection={setFilterSection}
                statusFilter={statusFilter}
                setStatusFilter={onStatusFilterChange}
                search={statusSearch}
                setSearch={setStatusSearch}
                reset={() => {
                  onStatusFilterChange("all");
                  setStatusSearch("");
                  onSearchChange("");
                }}
              />
            ) : null}
          </div>
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

function RosterFilterPopover({
  section,
  setSection,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  reset
}: {
  section: "status" | "types" | "sort" | "others";
  setSection: (section: "status" | "types" | "sort" | "others") => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  reset: () => void;
}) {
  const sections = [
    { key: "status", label: "Shift Status" },
    { key: "types", label: "Shift Types" },
    { key: "sort", label: "Sort By" },
    { key: "others", label: "Others" }
  ] as const;
  const filteredStatuses = rosterStatusFilters.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="absolute left-0 top-full z-40 mt-3 grid w-[min(34rem,calc(100vw-2rem))] grid-cols-[150px_1fr] overflow-hidden rounded border border-slate-200 bg-white text-sm shadow-2xl">
      <span className="absolute left-8 top-[-7px] h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" />
      <div className="grid content-start gap-1 border-r border-slate-200 bg-slate-50 py-3">
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`px-4 py-2 text-right font-medium ${section === item.key ? "text-[#354aa3]" : "text-slate-600 hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={reset} className="mx-3 mt-8 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Reset Filters
        </button>
      </div>
      <div className="min-h-[280px] p-4">
        {section === "status" ? (
          <div>
            <label className="mb-3 flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search Shift Status..." />
            </label>
            <div className="grid gap-1">
              {filteredStatuses.map((item) => {
                const active = statusFilter === item.value;
                return (
                  <button key={item.value} type="button" onClick={() => setStatusFilter(item.value)} className="flex items-center gap-3 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.colour}`}>
                      {item.label === "Approved" ? <CheckCircle2 className="h-4 w-4 text-white" /> : item.label === "Rejected" ? <X className="h-3 w-3 text-white" /> : null}
                    </span>
                    <span className={`flex-1 ${active ? "font-semibold text-[#354aa3]" : ""}`}>{item.label}</span>
                    {active ? <CheckCircle2 className="h-5 w-5 text-[#354aa3]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {section === "types" ? <FilterHint title="Shift Types" message="Shift type filtering can be connected once service type records are saved with shifts." /> : null}
        {section === "sort" ? <FilterHint title="Sort By" message="Current roster is sorted by staff and calendar date." /> : null}
        {section === "others" ? <FilterHint title="Others" message="Use the staff search box for participant, staff, location, and status keywords." /> : null}
      </div>
    </div>
  );
}

function FilterHint({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 leading-6 text-slate-600">{message}</p>
    </div>
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-semibold text-gumleaf">VS</span>
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
        </RecordForm>
      </div>
    </section>
  );
}

function StaffScheduleRow({ worker, hours }: { worker: WorkerRecord; hours: number }) {
  return (
    <div className="flex min-h-[102px] items-center gap-3 border-b border-slate-200 px-3 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-harbour text-sm font-semibold text-gumleaf">
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
  cloneSource,
  onClose,
  onSubmit,
  onClone
}: {
  participants: ParticipantRecord[];
  workers: WorkerRecord[];
  availability: AvailabilityRecord[];
  leaveRequests: LeaveRecord[];
  initialShift?: ShiftRecord;
  cloneSource?: ShiftRecord;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  onClone?: () => void;
}) {
  const formFill = initialShift ?? cloneSource;
  const isEdit = Boolean(initialShift);
  const isClone = Boolean(cloneSource && !initialShift);
  const initialWorkerEmail = formFill?.workerEmail || workers.find((worker) => normaliseRosterText(worker.name) === normaliseRosterText(formFill?.worker ?? ""))?.email || workers[0]?.email || "";
  const [selectedWorkerEmail, setSelectedWorkerEmail] = useState(initialWorkerEmail);
  const [startValue, setStartValue] = useState(toDateTimeLocalValue(isClone ? "" : (formFill?.startsAt ?? "")));
  const [endValue, setEndValue] = useState(toDateTimeLocalValue(isClone ? "" : (formFill?.endsAt ?? "")));
  const [matches, setMatches] = useState<ShiftMatch[]>([]);
  const [matchNotice, setMatchNotice] = useState("");
  const canCreate = participants.length > 0;
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

  async function findMatches() {
    if (!participants.length) return;
    const participantName = initialShift?.participantName || participants[0]?.name || "";
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : "";
    if (!token) {
      setMatchNotice("Sign in again before running matching.");
      return;
    }
    setMatchNotice("Checking availability, leave, compliance, and conflicts.");
    const response = await fetch("/api/shifts/match", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_name: participantName,
        starts_at: startValue,
        ends_at: endValue,
        location: initialShift?.location || ""
      })
    });
    const result = await response.json().catch(() => ({ message: "Matching failed." }));
    setMatches(Array.isArray(result.matches) ? result.matches : []);
    setMatchNotice(result.message ?? "Matching complete.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="create-shift-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Weekly scheduler</p>
            <h2 id="create-shift-title" className="text-xl font-semibold text-ink">{isEdit ? "Edit shift" : isClone ? "Clone shift" : "Create shift"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && onClone ? <button type="button" onClick={onClone} className="rounded border border-gumleaf/20 bg-gumleaf/5 px-3 py-2 text-xs font-semibold text-gumleaf hover:bg-gumleaf/10">Clone shift</button> : null}
            <button onClick={onClose} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close create shift">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-5">
          {canCreate ? (
            <RecordForm submitLabel={isEdit ? "Update shift" : isClone ? "Save cloned shift" : "Save shift"} onSubmit={onSubmit}>
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} defaultValue={formFill?.participantName ?? ""} />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Assign support worker</span>
                <select
                  name="workerEmail"
                  value={selectedWorkerEmail}
                  onChange={(event) => setSelectedWorkerEmail(event.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15"
                >
                  <option value="">Open / unassigned shift</option>
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
              <div className="rounded border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">AI shift matching</p>
                    <p className="mt-1 text-xs text-slate-500">Scores staff using availability, leave, conflicts, and compliance expiry.</p>
                  </div>
                  <button type="button" onClick={() => void findMatches()} className="rounded border border-[#354aa3]/30 px-3 py-2 text-xs font-semibold text-[#354aa3] hover:bg-[#354aa3]/5">
                    Find matching workers
                  </button>
                </div>
                {matchNotice ? <p className="mt-2 text-xs text-slate-500">{matchNotice}</p> : null}
                {matches.length ? (
                  <div className="mt-3 grid gap-2">
                    {matches.map((match) => (
                      <button
                        key={match.email}
                        type="button"
                        onClick={() => setSelectedWorkerEmail(match.email)}
                        className="rounded border border-slate-200 bg-slate-50 p-3 text-left hover:border-gumleaf/40 hover:bg-gumleaf/5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{match.name}</p>
                          <span className="rounded bg-gumleaf/10 px-2 py-1 text-xs font-semibold text-gumleaf">{match.score}% match</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{match.reasons.slice(0, 2).join(" | ")}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Field name="location" label="Location" placeholder="Shift location" defaultValue={formFill?.location ?? ""} />
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
              {!isEdit ? <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-ink">Recurring schedule</p>
                <p className="mt-1 text-xs text-slate-500">Create daily, weekly, fortnightly, or custom repeating shifts from the selected start/end time.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Select name="recurrenceType" label="Recurrence" options={recurrenceTypes} />
                  <Field name="recurrenceCount" label="Number of shifts" type="number" defaultValue="1" min="1" max="60" />
                  <Field name="customIntervalDays" label="Custom interval days" type="number" defaultValue="7" min="1" max="365" />
                </div>
              </div> : null}
              <Select name="status" label="Shift status" options={statuses} defaultValue={isEdit ? (formFill?.status || "Draft") : "Draft"} />
            </RecordForm>
          ) : (
            <EmptyWorkerState title="Participant records required" message="Create at least one participant before adding an assigned or open shift." />
          )}
        </div>
      </div>
    </div>
  );
}

function RecordForm({ children, submitLabel, onSubmit }: { children: React.ReactNode; submitLabel: string; onSubmit: (form: FormData) => Promise<boolean | void> }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    void onSubmit(new FormData(form)).then((shouldReset) => {
      if (shouldReset !== false) form.reset();
    });
  }
  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="grid gap-4">{children}</div>
      <button className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf shadow-sm transition hover:bg-gumleaf/20 sm:w-auto">
        <Plus className="h-4 w-4" />
        {submitLabel}
      </button>
    </form>
  );
}

function FieldLabel({ label }: { label: string; required: boolean }) {
  return (
    <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
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
      <FieldLabel label={label} required={required} />
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
      <FieldLabel label={label} required />
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

function CheckboxField({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300 text-gumleaf focus:ring-gumleaf/20" />
      <span>{label}</span>
    </label>
  );
}

function Area({ name, label, defaultValue = "", placeholder = "", required = true }: { name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <textarea name={name} required={required} rows={3} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function OptionalArea({ name, label, defaultValue = "", placeholder = "" }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label>
      <FieldLabel label={label} required={false} />
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
      <FieldLabel label={label} required={required} />
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
      <FieldLabel label={label} required={false} />
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

function ParticipantTimeline({ timeline }: { timeline: ParticipantTimelineItem[] }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-ink">Participant timeline</h2>
      <p className="mt-1 text-sm text-slate-500">Progress notes, incidents, shifts, and document events from the database.</p>
      {timeline.length ? (
        <div className="mt-4 grid gap-3">
          {timeline.map((item) => (
            <div key={`${item.type}-${item.id}`} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-slate-600">{item.detail || "No details recorded"}</p>
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">{item.type}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{dateTimeOrFallback(item.occurredAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyWorkerState title="No timeline events" message="Timeline events appear after shifts, notes, incidents, or documents are recorded." />
      )}
    </article>
  );
}

const ONBOARDING_STEPS = [
  { key: "ndis_verified", label: "NDIS number verified" },
  { key: "care_plan", label: "Care plan created" },
  { key: "emergency_contact", label: "Emergency contact added" },
  { key: "medications", label: "Medications recorded" },
  { key: "risk_assessment", label: "Risk assessment completed" },
  { key: "service_agreement", label: "Service agreement signed" },
  { key: "worker_assigned", label: "Support worker assigned" },
  { key: "family_access", label: "Family portal access set up" }
];

function ParticipantOnboardingChecklist({ participantId, related }: { participantId: string; related: ParticipantRelatedRecords }) {
  const storageKey = `careos_onboarding_${participantId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
  });

  const autoChecked = useMemo<Record<string, boolean>>(() => ({
    worker_assigned: related.shifts.length > 0,
    risk_assessment: related.risks.length > 0,
    care_plan: related.carePlans.length > 0
  }), [related]);

  const combined = { ...autoChecked, ...checked };
  const doneCount = ONBOARDING_STEPS.filter((s) => combined[s.key]).length;

  function toggle(key: string) {
    const next = { ...checked, [key]: !combined[key] };
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }

  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Onboarding checklist</h2>
        <span className={`rounded px-2.5 py-1 text-xs font-semibold ${doneCount === ONBOARDING_STEPS.length ? "bg-gumleaf/10 text-gumleaf" : "bg-banksia/20 text-banksia"}`}>{doneCount}/{ONBOARDING_STEPS.length}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gumleaf transition-all" style={{ width: `${Math.round((doneCount / ONBOARDING_STEPS.length) * 100)}%` }} /></div>
      <div className="mt-3 grid gap-2">
        {ONBOARDING_STEPS.map((step) => {
          const isAuto = step.key in autoChecked;
          const done = Boolean(combined[step.key]);
          return (
            <label key={step.key} className={`flex cursor-pointer items-center gap-3 rounded border p-3 text-sm transition ${done ? "border-gumleaf/20 bg-gumleaf/5" : "border-slate-200 bg-slate-50 hover:bg-white"}`}>
              <input type="checkbox" checked={done} onChange={() => { if (!isAuto) toggle(step.key); }} disabled={isAuto} className="h-4 w-4 rounded border-slate-300 text-gumleaf focus:ring-gumleaf" />
              <span className={done ? "font-medium text-gumleaf" : "text-slate-700"}>{step.label}</span>
              {isAuto && <span className="ml-auto text-xs text-slate-400">auto</span>}
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">Checkboxes are saved locally. Auto-detected items update from recorded data.</p>
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


async function loadParticipants(): Promise<ParticipantRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapParticipantRow);
}

async function loadEmergencyContacts(role: UserRole, participantNames: string[]): Promise<EmergencyContactRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const assignedNames = participantNames.filter(Boolean);
  let query = supabase
    .from("participant_emergency_contacts")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (role === "support_worker") {
    if (!assignedNames.length) return [];
    query = query.in("participant_name", assignedNames);
  } else if (assignedNames.length) {
    query = query.in("participant_name", assignedNames);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? ""),
    participantName: String(row.participant_name ?? ""),
    contactName: String(row.contact_name ?? ""),
    relationship: String(row.relationship ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    priority: String(row.priority ?? "primary"),
    consentToContact: Boolean(row.consent_to_contact),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "active"),
    createdAt: String(row.created_at ?? "")
  }));
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

async function loadParticipantTimeline(participantName: string): Promise<ParticipantTimelineItem[]> {
  if (!isSupabaseConfigured || !supabase || !participantName) return [];
  const [notes, incidents, shifts, documents] = await Promise.all([
    supabase
      .from("progress_notes")
      .select("id, worker_name, service_date, category, note, outcomes, created_at")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("incident_reports")
      .select("id, incident_number, severity, status, summary, incident_date, created_at")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("shifts")
      .select("id, support_worker_name, starts_at, ends_at, status, location")
      .eq("participant_name", participantName)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("care_documents")
      .select("id, title, file_name, created_at")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const events: ParticipantTimelineItem[] = [
    ...((notes.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      type: "Progress note",
      title: String(row.category ?? "Progress note"),
      detail: [row.worker_name, row.note || row.outcomes].filter(Boolean).join(" | "),
      occurredAt: String(row.service_date || row.created_at || "")
    }))),
    ...((incidents.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      type: "Incident",
      title: String(row.incident_number || "Incident report"),
      detail: [row.severity, row.status, row.summary].filter(Boolean).join(" | "),
      occurredAt: String(row.incident_date || row.created_at || "")
    }))),
    ...((shifts.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      type: "Shift",
      title: String(row.status || "Scheduled shift"),
      detail: [row.support_worker_name || "Open shift", row.location, `${timeOnly(String(row.starts_at ?? ""))} - ${timeOnly(String(row.ends_at ?? ""))}`].filter(Boolean).join(" | "),
      occurredAt: String(row.starts_at || "")
    }))),
    ...((documents.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      type: "Document",
      title: String(row.title || "Document uploaded"),
      detail: String(row.file_name ?? ""),
      occurredAt: String(row.created_at ?? "")
    })))
  ];

  return events
    .filter((item) => item.occurredAt)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 20);
}

function emptyParticipantRelatedRecords(): ParticipantRelatedRecords {
  return {
    shifts: [],
    carePlans: [],
    goals: [],
    funding: [],
    invoices: [],
    risks: [],
    tasks: []
  };
}

async function loadParticipantRelatedRecords(participantName: string): Promise<ParticipantRelatedRecords> {
  if (!isSupabaseConfigured || !supabase || !participantName) return emptyParticipantRelatedRecords();
  const [shifts, carePlans, goals, funding, invoices, risks, tasks] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, support_worker_name, starts_at, ends_at, status, location, approval_status")
      .eq("participant_name", participantName)
      .order("starts_at", { ascending: false })
      .limit(8),
    supabase
      .from("care_plans")
      .select("id, title, status, review_date")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("participant_goals")
      .select("id, title, current_progress_percent, status, target_date")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ndis_funding_records")
      .select("id, support_category, plan_total_budget, spent_amount, status, plan_end")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total_amount, status")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("participant_risk_assessments")
      .select("id, overall_risk_level, status, review_date, assessment_date")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("participant_tasks")
      .select("id, title, assigned_worker_name, due_date, status, priority")
      .eq("participant_name", participantName)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return {
    shifts: (shifts.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      worker: String(row.support_worker_name ?? ""),
      location: String(row.location ?? ""),
      status: String(row.status ?? ""),
      approvalStatus: String(row.approval_status ?? ""),
      startsAt: String(row.starts_at ?? ""),
      endsAt: String(row.ends_at ?? "")
    })),
    carePlans: (carePlans.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      status: String(row.status ?? ""),
      reviewDate: String(row.review_date ?? "")
    })),
    goals: (goals.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      progress: Number(row.current_progress_percent ?? 0),
      status: String(row.status ?? ""),
      targetDate: String(row.target_date ?? "")
    })),
    funding: (funding.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      category: String(row.support_category ?? ""),
      totalBudget: Number(row.plan_total_budget ?? 0),
      spentAmount: Number(row.spent_amount ?? 0),
      status: String(row.status ?? ""),
      planEnd: String(row.plan_end ?? "")
    })),
    invoices: (invoices.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      invoiceNumber: String(row.invoice_number ?? ""),
      issueDate: String(row.issue_date ?? ""),
      dueDate: String(row.due_date ?? ""),
      totalAmount: Number(row.total_amount ?? 0),
      status: String(row.status ?? "")
    })),
    risks: (risks.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      level: String(row.overall_risk_level ?? ""),
      status: String(row.status ?? ""),
      reviewDate: String(row.review_date ?? ""),
      assessmentDate: String(row.assessment_date ?? "")
    })),
    tasks: (tasks.data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      assignedWorker: String(row.assigned_worker_name ?? ""),
      dueDate: String(row.due_date ?? ""),
      status: String(row.status ?? ""),
      priority: String(row.priority ?? "")
    }))
  };
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
    medicareNumber: String(row.medicare_number ?? ""),
    displayName: String(row.display_name ?? ""),
    preferredName: String(row.preferred_name ?? ""),
    personAlias: String(row.person_alias ?? ""),
    otherIdentifier: String(row.other_identifier ?? ""),
    gender: String(row.gender ?? ""),
    sex: String(row.sex ?? ""),
    primaryAddress: String(row.primary_address ?? ""),
    postalAddress: String(row.postal_address ?? ""),
    mobileNumber: String(row.mobile_number ?? ""),
    phoneNumber: String(row.phone_number ?? ""),
    email: String(row.email ?? ""),
    secondaryEmail: String(row.secondary_email ?? ""),
    preferredContactMethod: String(row.preferred_contact_method ?? ""),
    languages: String(row.languages ?? ""),
    culturalIdentity: String(row.cultural_identity ?? ""),
    religion: String(row.religion ?? ""),
    maritalStatus: String(row.marital_status ?? ""),
    nationality: String(row.nationality ?? ""),
    ethnicity: String(row.ethnicity ?? ""),
    aboriginalTorresStraitIslander: String(row.aboriginal_torres_strait_islander ?? ""),
    placeOfBirth: String(row.place_of_birth ?? ""),
    joinedDate: String(row.joined_date ?? ""),
    nextReviewDate: String(row.next_review_date ?? ""),
    clientStatus: String(row.client_status ?? "active"),
    emergency: String(row.emergency_contact ?? ""),
    emergencyContacts: String(row.emergency_contacts ?? ""),
    needs: String(row.support_needs ?? ""),
    supportPlans: String(row.support_plans ?? ""),
    goals: String(row.goals ?? ""),
    riskInformation: String(row.risk_information ?? ""),
    requirements: String(row.requirements ?? ""),
    preferences: String(row.preferences ?? ""),
    needToKnowInformation: String(row.need_to_know_information ?? ""),
    usefulInformation: String(row.useful_information ?? ""),
    environmentalDetails: String(row.environmental_details ?? ""),
    psychologicalDetails: String(row.psychological_details ?? ""),
    sensoryDetails: String(row.sensory_details ?? ""),
    bmi: String(row.bmi ?? ""),
    medicalNotes: String(row.medical_notes ?? ""),
    allergies: String(row.allergies ?? ""),
    communicationPreferences: String(row.communication_preferences ?? ""),
    clientType: String(row.client_type ?? ""),
    shareProgressNotes: Boolean(row.share_progress_notes),
    enableSmsReminders: Boolean(row.enable_sms_reminders),
    invoiceTravel: Boolean(row.invoice_travel),
    privateInfo: String(row.private_info ?? ""),
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
      id: String(row.id ?? ""),
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
      workingWithChildrenExpiry: String(row.working_with_children_expiry ?? ""),
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

async function loadDashboardOverview(): Promise<DashboardOverview> {
  if (!isSupabaseConfigured || !supabase) {
    return { planReviews: [], complianceAlerts: [], recentActivity: [] };
  }

  const [carePlans, workers, recentActivity] = await Promise.all([
    loadCarePlans(),
    loadWorkers(),
    loadRecentActivity()
  ]);

  const planReviews = carePlans
    .filter((plan) => {
      const days = daysUntil(plan.reviewDate);
      return !Number.isNaN(days) && days >= 0 && days <= 90;
    })
    .sort((a, b) => daysUntil(a.reviewDate) - daysUntil(b.reviewDate))
    .slice(0, 5)
    .map((plan) => ({
      id: plan.id,
      participantName: plan.participantName,
      title: plan.title,
      reviewDate: plan.reviewDate,
      status: plan.status
    }));

  return {
    planReviews,
    complianceAlerts: workers.flatMap(workerComplianceAlerts).slice(0, 6),
    recentActivity
  };
}

async function loadRecentActivity(): Promise<DashboardActivity[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, record_label, user_name, user_email, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.action}-${row.created_at}`),
    action: String(row.action ?? ""),
    label: String(row.record_label ?? ""),
    actor: String(row.user_name || row.user_email || ""),
    createdAt: String(row.created_at ?? "")
  }));
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

async function loadOpenShifts(): Promise<ShiftRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .or("support_worker_email.is.null,support_worker_email.eq.")
    .gte("starts_at", now)
    .neq("status", "Cancelled")
    .order("starts_at", { ascending: true })
    .limit(20);
  if (error || !data) return [];
  return data.map((row) => {
    const participantName = String(row.participant_name ?? "");
    const startsAt = String(row.starts_at ?? "");
    const endsAt = String(row.ends_at ?? "");
    return {
      id: String(row.id ?? `${participantName}-${startsAt}`),
      participant: shortName(participantName),
      participantName,
      worker: "",
      workerEmail: "",
      location: String(row.location ?? ""),
      status: String(row.status ?? "Open"),
      startsAt,
      endsAt,
      approvalStatus: String(row.approval_status ?? "not_submitted"),
      clockInAt: "",
      clockOutAt: "",
      allowedLatitude: String(row.allowed_latitude ?? ""),
      allowedLongitude: String(row.allowed_longitude ?? ""),
      allowedRadiusM: String(row.allowed_radius_m ?? ""),
      clockInLatitude: "",
      clockInLongitude: "",
      clockInDistanceM: "",
      clockOutLatitude: "",
      clockOutLongitude: "",
      clockOutDistanceM: "",
      recurrenceSeriesId: String(row.recurrence_series_id ?? ""),
      recurrenceType: String(row.recurrence_type ?? "single"),
      recurrenceIntervalDays: String(row.recurrence_interval_days ?? ""),
      recurrenceCount: String(row.recurrence_count ?? "1"),
      recurrencePosition: String(row.recurrence_position ?? "1"),
      submittedAt: "",
      submittedByEmail: "",
      approvedAt: "",
      approvedByEmail: "",
      rejectionReason: "",
      payrollReadyAt: "",
      workerSignature: "",
      workerSignedAt: "",
      participantSignature: "",
      participantSignedAt: "",
      signatureCapturedByEmail: "",
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
    return formatShortTime(date.getHours(), date.getMinutes());
  }
  const raw = value.split("T")[1] || value;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  return formatShortTime(Number(match[1]), Number(match[2]));
}

function formatShortTime(hour24: number, minute: number) {
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour = hour24 % 12 || 12;
  return `${hour}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${suffix}`;
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number.isFinite(value) ? value : 0);
}

function statusPillClass(status: string) {
  const normalised = status.toLowerCase().replace(/\s+/g, "_");
  if (["active", "approved", "paid", "completed", "achieved"].includes(normalised)) return "rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf";
  if (["critical", "high", "overdue", "rejected", "void", "archived", "cancelled"].includes(normalised)) return "rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral";
  if (["medium", "submitted", "issued", "in_progress", "review_required"].includes(normalised)) return "rounded bg-banksia/20 px-2.5 py-1 text-xs font-semibold text-slate-700";
  return "rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600";
}

function riskPillClass(level: string) {
  const normalised = level.toLowerCase();
  if (normalised === "critical" || normalised === "high") return "rounded bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral";
  if (normalised === "medium") return "rounded bg-banksia/20 px-2.5 py-1 text-xs font-semibold text-slate-700";
  if (normalised === "low") return "rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf";
  return statusPillClass(level);
}

function highestRiskLevel(levels: string[]) {
  const priority = ["critical", "high", "medium", "low"];
  const normalised = levels.map((level) => level.toLowerCase()).filter(Boolean);
  return priority.find((level) => normalised.includes(level)) || "";
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
    { label: "Driver's licence", value: worker.driversLicenceExpiry },
    ...(worker.workingWithChildrenExpiry ? [{ label: "Working with children", value: worker.workingWithChildrenExpiry }] : [])
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expiryLabel(status: string) {
  if (status === "expired") return "Expired";
  if (status === "due_soon") return "Due soon";
  if (status === "missing") return "Missing";
  return "Current";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

