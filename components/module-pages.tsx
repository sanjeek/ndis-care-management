"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
  Upload,
  X
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { recordAudit, type AuditPayload } from "@/lib/audit";
import { roleForUser, type UserRole } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ParticipantRecord = {
  name: string;
  ndis: string;
  plan: string;
  emergency: string;
  needs: string;
  docs: number;
  notes: number;
};

type WorkerRecord = {
  name: string;
  email: string;
  role: string;
  availability: string;
  qualifications: string;
  compliance: string;
  assigned: number;
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
  submittedAt: string;
  submittedByEmail: string;
  approvedAt: string;
  approvedByEmail: string;
  rejectionReason: string;
  payrollReadyAt: string;
};

type ModuleItem = {
  id: string;
  title: string;
  details: string;
  status: string;
};

type ProgressNoteRecord = {
  id: string;
  participantName: string;
  workerName: string;
  workerEmail: string;
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
  status: string;
  attachmentNames: string[];
  createdAt: string;
};

const statuses = ["Draft", "Offered", "Confirmed", "In progress", "Completed"];
const incidentSeverities = ["Low", "Medium", "High", "Critical"];
const incidentStatuses = ["Submitted", "Under review", "Investigation", "Action required", "Closed"];
type ModuleKind = "timesheets" | "notes" | "incidents" | "invoices" | "documents" | "settings";

export function DashboardPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [notice, setNotice] = useState("Database records only.");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setNotice("Connect Supabase to show live records.");
        return;
      }
      const [loadedShifts, loadedParticipants, loadedWorkers, timesheets, incidents] = await Promise.all([
        loadShifts(),
        loadParticipants(),
        loadWorkers(),
        loadModuleItems("timesheets"),
        loadModuleItems("incidents")
      ]);
      if (!active) return;
      setShifts(loadedShifts);
      setParticipants(loadedParticipants);
      setWorkers(loadedWorkers);
      setPendingTimesheets(timesheets.length);
      setIncidentCount(incidents.length);
      setNotice("Showing records from Supabase.");
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const todaysShifts = useMemo(() => shifts.filter(isTodayShift), [shifts]);
  const metrics = [
    { label: "Today's shifts", value: String(todaysShifts.length), delta: todaysShifts.length ? "Scheduled for today" : "No shifts scheduled today", tone: "gumleaf", icon: CalendarDays },
    { label: "Active participants", value: String(participants.length), delta: participants.length ? "Participant records in database" : "No participants yet", tone: "harbour", icon: ShieldCheck },
    { label: "Staff on duty", value: String(workers.length), delta: workers.length ? "Support worker records" : "No workers yet", tone: "banksia", icon: CalendarPlus },
    { label: "Pending timesheets", value: String(pendingTimesheets), delta: pendingTimesheets ? "Timesheet records waiting" : "No pending timesheets", tone: "coral", icon: CheckCircle2 }
  ];

  return (
    <AppShell title="Dashboard" eyebrow={`${formatToday()} | ${notice}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <ShiftTable title="Today's shifts" shifts={todaysShifts} emptyMessage="No shifts are scheduled for today." />
        <div className="space-y-6">
          <QuickActions />
          <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Incident reports</h2>
            <p className="mt-3 text-3xl font-semibold text-ink">{incidentCount}</p>
            <p className="mt-1 text-sm text-slate-500">{incidentCount ? "Incident report records in database" : "No incident reports recorded"}</p>
          </section>
        </div>
      </div>
    </AppShell>
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
      emergency_contact: get(form, "emergency"),
      support_needs: get(form, "needs")
    };
    const ok = await persist("participants", payload, setNotice, {
      action: "participant_update",
      recordLabel: payload.name,
      metadata: { operation: "create" }
    });
    if (ok) await refresh();
  }

  return (
    <AppShell title="Participants" eyebrow={notice}>
      {canManageParticipants ? (
        <RecordForm submitLabel="Add participant" onSubmit={submit}>
          <Field name="name" label="Participant profile" placeholder="Full name" />
          <Field name="ndis" label="NDIS number" placeholder="NDIS participant number" />
          <Field name="plan" label="Plan type" placeholder="NDIS managed, plan managed, or self managed" />
          <Field name="emergency" label="Emergency contact" placeholder="Name and phone number" />
          <Area name="needs" label="Support needs" placeholder="Support needs, routines, risks, and goals" />
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
              <Info label="Documents / Notes" value={`${participant.docs} documents, ${participant.notes} progress notes`} />
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

export function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [notice, setNotice] = useState("Loading support worker records from Supabase.");
  const [inviteLink, setInviteLink] = useState("");

  const refresh = useCallback(async () => {
    const rows = await loadWorkers();
    setWorkers(rows);
    setNotice(rows.length ? "Showing support worker records from the database." : "No support workers yet. Add a worker to create an invite.");
  }, []);

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
      compliance_status: get(form, "compliance")
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

      <RecordForm submitLabel="Add worker and send invite" onSubmit={submit}>
        <Field name="name" label="Staff profile" placeholder="Full name" />
        <Field name="email" label="Email invite address" type="email" placeholder="worker@example.com" />
        <Field name="role" label="Role" placeholder="Disability Support Worker" />
        <Field name="availability" label="Availability" placeholder="Available days and hours" />
        <Area name="qualifications" label="Qualifications" placeholder="Qualifications, training, clearances, and checks" />
        <Field name="compliance" label="Compliance documents" placeholder="Clear, pending, or renewal details" />
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
  const [notice, setNotice] = useState("Loading your worker portal.");

  const refresh = useCallback(async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const email = user?.email ?? "";
      const name = String(user?.user_metadata?.full_name || user?.email || user?.id || "");
      const shifts = email ? await loadShifts(email) : [];
      const participants = await loadParticipantsForShifts(shifts);
      setWorkerEmail(email);
      setWorkerNameFromSession(name);
      setVisibleShifts(shifts);
      setVisibleParticipants(participants);
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

  return (
    <AppShell title="Worker Portal" eyebrow={`${workerName || "Worker"} | ${notice}`}>
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <WorkerShiftMobilePanel shifts={visibleShifts} onClock={clockShift} onSubmit={async (shiftId) => {
            const ok = await runShiftWorkflow(shiftId, "submit", setNotice);
            if (ok) await refresh();
          }} />

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

        <div className="space-y-6">
          <WorkerProgressNoteForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
          <WorkerIncidentForm workerName={workerName} workerEmail={workerEmail} participants={visibleParticipants} />
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
    </AppShell>
  );
}

export function MyShiftsPage() {
  const [workerName, setWorkerName] = useState("");
  const [visibleShifts, setVisibleShifts] = useState<ShiftRecord[]>([]);
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

  async function submitShift(shiftId: string) {
    const ok = await runShiftWorkflow(shiftId, "submit", setNotice);
    if (ok) await refresh();
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
              onClick={() => void submitShift(shift.id)}
              className="rounded bg-gumleaf px-3 py-2 text-xs font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {shift.approvalStatus === "approved" ? "Approved" : shift.approvalStatus === "submitted" ? "Submitted" : "Submit completed shift"}
            </button>
          )}
        />
      </section>
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
  const [notice, setNotice] = useState("Loading scheduler records from Supabase.");
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [loadedShifts, loadedParticipants, loadedWorkers] = await Promise.all([loadShifts(), loadParticipants(), loadWorkers()]);
    setShifts(loadedShifts);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setNotice(loadedShifts.length ? "Showing shifts from the database." : "No shifts yet. Add a shift to build the roster.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const start = get(form, "start");
    const end = get(form, "end");
    const workerName = get(form, "worker");
    const participantName = get(form, "participant");
    const worker = workers.find((item) => item.name === workerName);
    const ok = await persist(
      "shifts",
      {
        participant_name: participantName,
        support_worker_name: workerName,
        support_worker_email: worker?.email ?? "",
        location: get(form, "location"),
        starts_at: start,
        ends_at: end,
        status: get(form, "status")
      },
      setNotice,
      {
        action: "create",
        recordLabel: `${participantName} shift`,
        metadata: { recordType: "shift", participantName, workerName }
      }
    );
    if (ok) await refresh();
    setCreateOpen(false);
  }

  return (
    <AppShell title="Rostering / Shifts" eyebrow={notice}>
      <SchedulerGrid shifts={shifts} workers={workers} onAddShift={() => setCreateOpen(true)} />
      {createOpen ? <ShiftCreateModal participants={participants} workers={workers} onClose={() => setCreateOpen(false)} onSubmit={submit} /> : null}
    </AppShell>
  );
}

export function ProgressNotesPage() {
  const [notes, setNotes] = useState<ProgressNoteRecord[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [context, setContext] = useState<{ role: UserRole; email: string; name: string }>({ role: "support_worker", email: "", name: "" });
  const [notice, setNotice] = useState("Loading progress notes from Supabase.");

  const refresh = useCallback(async () => {
    const userContext = await getCurrentUserContext();
    const userName = await getCurrentUserName();
    const assignedShifts = userContext.role === "support_worker" && userContext.email ? await loadShifts(userContext.email) : [];
    const [loadedNotes, loadedParticipants, loadedWorkers] = await Promise.all([
      loadProgressNotes(userContext.role === "support_worker" ? userContext.email : undefined),
      userContext.role === "support_worker" ? loadParticipantsForShifts(assignedShifts) : loadParticipants(),
      userContext.role === "support_worker" ? Promise.resolve([]) : loadWorkers()
    ]);
    setContext({ ...userContext, name: assignedShifts[0]?.worker || userName || userContext.email });
    setNotes(loadedNotes);
    setParticipants(loadedParticipants);
    setWorkers(loadedWorkers);
    setNotice(
      loadedNotes.length
        ? userContext.role === "support_worker"
          ? "Showing your submitted progress notes."
          : "Showing all progress notes from the database."
        : "No progress notes recorded yet."
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(form: FormData) {
    const workerName = context.role === "support_worker" ? context.name : get(form, "worker");
    const workerEmail = context.role === "support_worker" ? context.email : workers.find((worker) => worker.name === workerName)?.email ?? "";
    const participant = get(form, "participant");
    const ok = await persist(
      "progress_notes",
      {
        participant_name: participant,
        worker_name: workerName,
        worker_email: workerEmail,
        service_date: get(form, "serviceDate"),
        start_time: get(form, "startTime"),
        end_time: get(form, "endTime"),
        category: get(form, "category"),
        note: get(form, "note"),
        outcomes: get(form, "outcomes"),
        digital_signature: get(form, "signature"),
        is_important: get(form, "important") === "Important"
      },
      setNotice,
      {
        action: "progress_note",
        recordLabel: participant,
        metadata: {
          serviceDate: get(form, "serviceDate"),
          workerName,
          operation: "create"
        }
      }
    );
    if (ok) await refresh();
  }

  const canSubmit = participants.length > 0 && (context.role === "support_worker" || workers.length > 0);

  return (
    <AppShell title="Progress Notes" eyebrow={notice}>
      <section className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">New progress note</h2>
          <p className="text-sm text-slate-500">Record service delivery, outcomes, and a digital worker signature.</p>
        </div>
        {canSubmit ? (
          <RecordForm submitLabel="Save progress note" onSubmit={submit}>
            <div className="grid gap-4 lg:grid-cols-2">
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
              <div className="lg:col-span-2">
                <Area name="note" label="Notes" placeholder="Write what support was provided, observations, and participant response." />
              </div>
              <div className="lg:col-span-2">
                <Area name="outcomes" label="Outcomes" placeholder="Record achieved goals, progress, risks, follow-up, or coordinator actions." />
              </div>
              <div className="lg:col-span-2">
                <Field name="signature" label="Digital signature" placeholder="Type full name as signature" />
              </div>
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
                  <p className="text-sm text-slate-500">{note.category || "Progress note"} by {note.workerName || note.workerEmail || "Worker"}</p>
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

  const canSubmit = participants.length > 0 && (context.role === "support_worker" || workers.length > 0);

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
              <div className="lg:col-span-2">
                <Area name="summary" label="Incident details" placeholder="Describe what happened, immediate response, people notified, and current risk." />
              </div>
              <div className="lg:col-span-2">
                <Area name="investigationNotes" label="Investigation notes" placeholder="Record investigation findings, follow-up actions, and manager review notes." />
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
              <Info label="Investigation notes" value={incident.investigationNotes || "Not recorded"} />
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
        action: kind === "invoices" ? "invoice_action" : "create",
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
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
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
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
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

function WorkerShiftMobilePanel({ shifts, onClock, onSubmit }: { shifts: ShiftRecord[]; onClock: (shiftId: string, action: "in" | "out") => Promise<void>; onSubmit: (shiftId: string) => Promise<void> }) {
  const nextShift = shifts.find((shift) => !shift.clockOutAt) ?? shifts[0];

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Today&apos;s work</h2>
          <p className="mt-1 text-sm text-slate-500">Clock in, clock out, then submit completed shifts for approval.</p>
        </div>
        <CalendarDays className="h-5 w-5 shrink-0 text-gumleaf" />
      </div>

      {nextShift ? (
        <article className="mt-4 rounded border border-gumleaf/30 bg-gumleaf/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Current / next shift</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">{nextShift.participantName || nextShift.participant}</h3>
              <p className="text-sm text-slate-600">{nextShift.time || "Time not recorded"} | {nextShift.location || "Location not recorded"}</p>
            </div>
            <span className={`w-fit rounded px-2.5 py-1 text-xs font-semibold ${approvalBadgeClass(nextShift.approvalStatus)}`}>{approvalLabel(nextShift.approvalStatus)}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={Boolean(nextShift.clockInAt)}
              onClick={() => void onClock(nextShift.id, "in")}
              className="min-h-12 rounded bg-[#354aa3] px-4 py-3 text-base font-semibold text-white hover:bg-[#283a82] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {nextShift.clockInAt ? `Clocked in ${timeOnly(nextShift.clockInAt)}` : "Clock in"}
            </button>
            <button
              type="button"
              disabled={!nextShift.clockInAt || Boolean(nextShift.clockOutAt)}
              onClick={() => void onClock(nextShift.id, "out")}
              className="min-h-12 rounded bg-gumleaf px-4 py-3 text-base font-semibold text-white hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {nextShift.clockOutAt ? `Clocked out ${timeOnly(nextShift.clockOutAt)}` : "Clock out"}
            </button>
          </div>
          <button
            type="button"
            disabled={!canSubmitShift(nextShift) || !nextShift.clockOutAt}
            onClick={() => void onSubmit(nextShift.id)}
            className="mt-3 min-h-12 w-full rounded border border-gumleaf/30 bg-white px-4 py-3 text-base font-semibold text-gumleaf hover:bg-gumleaf/5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            Submit completed shift
          </button>
        </article>
      ) : (
        <EmptyWorkerState title="No assigned shifts" message="Assigned shifts will appear here when your coordinator adds them to the roster." />
      )}

      {shifts.length ? (
        <div className="mt-4 grid gap-3">
          {shifts.slice(0, 5).map((shift) => (
            <article key={shift.id} className="rounded border border-slate-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{shift.participantName || shift.participant}</p>
                  <p className="mt-1 text-slate-500">{dateOnly(shift.startsAt ?? "")} | {shift.time}</p>
                  <p className="mt-1 text-slate-600">{shift.location || "Location not recorded"}</p>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{shift.status || "Draft"}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>In: {shift.clockInAt ? timeOnly(shift.clockInAt) : "Not clocked"}</span>
                <span>Out: {shift.clockOutAt ? timeOnly(shift.clockOutAt) : "Not clocked"}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
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

function SchedulerGrid({ shifts, workers, onAddShift }: { shifts: ShiftRecord[]; workers: WorkerRecord[]; onAddShift: () => void }) {
  const days = weekDays();

  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <CalendarDays className="h-4 w-4 text-gumleaf" />
            Staff
          </button>
          <button className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Filter scheduler">
            <Filter className="h-4 w-4" />
          </button>
          <button className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
          <button className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-xl font-semibold text-ink">{monthYear()}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Weekly</button>
          <button onClick={onAddShift} className="inline-flex items-center gap-2 rounded bg-[#354aa3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#283a82]">
            <Plus className="h-4 w-4" />
            Add Shift
          </button>
          <button className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="More scheduler actions">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {workers.length ? (
        <div className="grid border-b border-slate-200 md:grid-cols-[310px_1fr]">
          <div className="border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3">
              <label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search by team, staff or client ..." />
              </label>
            </div>
            <VacantShiftRow shifts={shifts} />
            {workers.map((worker) => {
              const workerHours = shifts.filter((shift) => shift.worker === worker.name).length * 4;
              return <StaffScheduleRow key={worker.email || worker.name} worker={worker} hours={workerHours} />;
            })}
          </div>

          <div className="overflow-x-auto scrollbar-subtle">
            <div className="grid min-w-[980px] grid-cols-7">
              {days.map((day, index) => (
                <div key={day.label} className={`border-b border-r border-slate-200 p-3 text-center ${index === 0 ? "bg-banksia/15" : "bg-slate-50"}`}>
                  <p className="text-xs font-semibold uppercase text-slate-400">{day.label}</p>
                  <p className="font-semibold text-ink">{day.date}</p>
                </div>
              ))}
              {workers.map((worker) => (
                <ScheduleRow key={worker.email || worker.name} worker={worker} shifts={shifts} />
              ))}
            </div>
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

function ScheduleRow({ worker, shifts }: { worker: WorkerRecord; shifts: ShiftRecord[] }) {
  const days = weekDays();
  const workerShifts = shifts.filter((shift) => shift.worker === worker.name);
  return (
    <>
      {days.map((day, dayIndex) => {
        const shift = workerShifts.find((item) => dateKey(item.startsAt) === day.key);
        return (
          <div key={`${worker.email || worker.name}-${dayIndex}`} className={`min-h-[102px] border-b border-r border-slate-200 p-2 ${dayIndex === 0 ? "bg-banksia/15" : "bg-white"}`}>
            {shift ? (
              <div className="border-l-4 border-gumleaf bg-slate-50 px-2 py-2 text-xs shadow-sm">
                <div className="mb-1 h-1 rounded-full bg-slate-400" />
                <p className="font-semibold text-slate-600">{shift.time}</p>
                <p className="mt-1 truncate font-semibold text-ink">{shift.participantName || shift.participant}</p>
                <p className="mt-1 truncate text-slate-500">{shift.location}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function VacantShiftRow({ shifts }: { shifts: ShiftRecord[] }) {
  const vacant = shifts.filter((shift) => !shift.worker || shift.status.toLowerCase() === "unfilled").length;
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

function ShiftCreateModal({ participants, workers, onClose, onSubmit }: { participants: ParticipantRecord[]; workers: WorkerRecord[]; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const canCreate = participants.length > 0 && workers.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="create-shift-title">
      <div className="w-full max-w-xl rounded border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gumleaf">Weekly scheduler</p>
            <h2 id="create-shift-title" className="text-xl font-semibold text-ink">Create shift</h2>
          </div>
          <button onClick={onClose} className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close create shift">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {canCreate ? (
            <RecordForm submitLabel="Save shift" onSubmit={onSubmit}>
              <Select name="participant" label="Participant" options={participants.map((participant) => participant.name)} />
              <Select name="worker" label="Assign support worker" options={workers.map((item) => item.name)} />
              <Field name="location" label="Location" placeholder="Shift location" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="start" label="Start time" type="datetime-local" />
                <Field name="end" label="End time" type="datetime-local" />
              </div>
              <Select name="status" label="Shift status" options={statuses} />
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

function Field({ name, label, defaultValue = "", placeholder = "", type = "text" }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
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

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select name={name} required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
        {options.map((option) => (
          <option key={option}>{option}</option>
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

async function loadParticipants(): Promise<ParticipantRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    name: String(row.name ?? ""),
    ndis: String(row.ndis_number ?? ""),
    plan: String(row.plan_type ?? ""),
    emergency: String(row.emergency_contact ?? ""),
    needs: String(row.support_needs ?? ""),
    docs: Number(row.document_count ?? 0),
    notes: Number(row.note_count ?? 0)
  }));
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
      assigned: shifts.filter((shift) => shift.worker === name).length
    };
  });
}

async function loadProgressNotes(workerEmail?: string): Promise<ProgressNoteRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase.from("progress_notes").select("*").order("created_at", { ascending: false });
  if (workerEmail) query = query.eq("worker_email", workerEmail);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id ?? `${row.participant_name}-${row.created_at}`),
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
    isImportant: Boolean(row.is_important),
    createdAt: String(row.created_at ?? "")
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
      submittedAt: String(row.submitted_at ?? ""),
      submittedByEmail: String(row.submitted_by_email ?? ""),
      approvedAt: String(row.approved_at ?? ""),
      approvedByEmail: String(row.approved_by_email ?? ""),
      rejectionReason: String(row.rejection_reason ?? ""),
      payrollReadyAt: String(row.payroll_ready_at ?? ""),
      time: `${timeOnly(startsAt)} - ${timeOnly(endsAt)}`
    };
  });
}

async function loadParticipantsForShifts(shifts: ShiftRecord[]): Promise<ParticipantRecord[]> {
  const names = Array.from(new Set(shifts.map((shift) => shift.participantName).filter(Boolean)));
  if (!names.length || !isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("participants").select("*").in("name", names);
  if (error || !data) return [];
  return data.map((row) => ({
    name: String(row.name ?? ""),
    ndis: String(row.ndis_number ?? ""),
    plan: String(row.plan_type ?? ""),
    emergency: String(row.emergency_contact ?? ""),
    needs: String(row.support_needs ?? ""),
    docs: Number(row.document_count ?? 0),
    notes: Number(row.note_count ?? 0)
  }));
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

async function runShiftWorkflow(shiftId: string, action: "submit" | "approve" | "reject", setNotice: (message: string) => void, reason = "") {
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
    body: JSON.stringify({ action, reason })
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
  const response = await fetch(`/api/shifts/${shiftId}/clock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action })
  });
  const result = await response.json().catch(() => ({ message: "Clock action failed." }));
  setNotice(result.message);
  return response.ok;
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
  return ["not_submitted", "rejected"].includes(shift.approvalStatus) && !["Draft", "Offered"].includes(shift.status);
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

function normalizeTime(value: string) {
  if (!value) return "";
  return value.slice(0, 5);
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

function weekDays() {
  const now = new Date();
  const monday = new Date(now);
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

function monthYear() {
  return new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function formatToday() {
  return new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
