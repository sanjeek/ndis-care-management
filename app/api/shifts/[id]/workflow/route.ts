import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser, type UserRole } from "@/lib/auth";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

type AuthContext = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type ShiftWorkflowRecord = {
  id: string;
  participant_name: string;
  support_worker_name: string;
  support_worker_email: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  status: string;
  approval_status: string | null;
  worker_signature: string | null;
  participant_signature: string | null;
};

async function requireUser(request: Request): Promise<{ user: AuthContext } | { response: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const admin = serviceClient();

  if (!url || !anon || !token || !admin) {
    return { response: NextResponse.json({ message: "Authenticated session is required." }, { status: 401 }) };
  }

  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { response: NextResponse.json({ message: "Invalid session." }, { status: 401 }) };
  }

  let role = roleForUser(data.user.user_metadata?.role, data.user.email);
  if (!data.user.user_metadata?.role) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    role = roleForUser(profile?.role, data.user.email);
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: String(data.user.user_metadata?.full_name || data.user.email || data.user.id),
      role
    }
  };
}

function isReviewer(role: UserRole) {
  return role === "admin" || role === "team_leader";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const reason = String(body.reason ?? "").trim();
  const workerSignature = String(body.workerSignature ?? "").trim();
  const participantSignature = String(body.participantSignature ?? "").trim();

  const { data: shift, error } = await admin
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, clock_in_at, clock_out_at, status, approval_status, worker_signature, participant_signature")
    .eq("id", id)
    .maybeSingle<ShiftWorkflowRecord>();

  if (error || !shift) {
    return NextResponse.json({ message: "Shift not found." }, { status: 404 });
  }

  const isAssignedWorker = (shift.support_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  const currentApproval = shift.approval_status ?? "not_submitted";

  if (action === "submit") {
    if (!isAssignedWorker) {
      return NextResponse.json({ message: "You can only submit shifts assigned to your login." }, { status: 403 });
    }
    if (currentApproval === "approved") {
      return NextResponse.json({ message: "This shift is already approved for payroll." }, { status: 400 });
    }
    if (currentApproval === "submitted") {
      return NextResponse.json({ message: "This shift is already submitted for approval." }, { status: 400 });
    }
    if (!shift.clock_out_at) {
      return NextResponse.json({ message: "Clock out before submitting this shift for approval." }, { status: 400 });
    }

    const finalWorkerSignature = workerSignature || shift.worker_signature || "";
    const finalParticipantSignature = participantSignature || shift.participant_signature || "";
    if (finalWorkerSignature.length < 2 || finalParticipantSignature.length < 2) {
      return NextResponse.json({ message: "Support worker and participant signatures are required before submitting a completed shift." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const signedRecord = {
      shiftId: shift.id,
      participantName: shift.participant_name,
      supportWorkerName: shift.support_worker_name,
      supportWorkerEmail: shift.support_worker_email,
      location: shift.location,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      clockInAt: shift.clock_in_at,
      clockOutAt: shift.clock_out_at,
      workerSignature: finalWorkerSignature,
      participantSignature: finalParticipantSignature,
      signedAt: now,
      capturedByEmail: auth.user.email
    };

    const update = await admin
      .from("shifts")
      .update({
        status: "Submitted for approval",
        approval_status: "submitted",
        submitted_at: now,
        submitted_by: auth.user.id,
        submitted_by_email: auth.user.email,
        worker_signature: finalWorkerSignature,
        worker_signed_at: now,
        participant_signature: finalParticipantSignature,
        participant_signed_at: now,
        signature_captured_by: auth.user.id,
        signature_captured_by_email: auth.user.email,
        signed_record: signedRecord,
        approved_at: null,
        approved_by: null,
        approved_by_email: null,
        rejection_reason: null,
        payroll_ready_at: null
      })
      .eq("id", shift.id);

    if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });

    await recordServerAudit(admin, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "update",
      tableName: "shifts",
      recordId: shift.id,
      recordLabel: `${shift.participant_name} shift`,
      metadata: { workflow: "submit_for_approval", participantName: shift.participant_name, signaturesCaptured: true }
    });

    return NextResponse.json({ message: "Shift signed by worker and participant, then submitted for approval." });
  }

  if (action === "approve" || action === "reject") {
    if (!isReviewer(auth.user.role)) {
      return NextResponse.json({ message: "Only team leaders or admin users can approve shifts." }, { status: 403 });
    }
    if (currentApproval !== "submitted") {
      return NextResponse.json({ message: "Only submitted shifts can be reviewed." }, { status: 400 });
    }

    const approved = action === "approve";
    const update = await admin
      .from("shifts")
      .update({
        status: approved ? "Approved for payroll" : "Rejected",
        approval_status: approved ? "approved" : "rejected",
        approved_at: approved ? new Date().toISOString() : null,
        approved_by: approved ? auth.user.id : null,
        approved_by_email: approved ? auth.user.email : null,
        rejection_reason: approved ? null : reason || "Returned for correction",
        payroll_ready_at: approved ? new Date().toISOString() : null
      })
      .eq("id", shift.id);

    if (update.error) return NextResponse.json({ message: update.error.message }, { status: 400 });

    await recordServerAudit(admin, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "update",
      tableName: "shifts",
      recordId: shift.id,
      recordLabel: `${shift.participant_name} shift`,
      metadata: { workflow: action, participantName: shift.participant_name, reason: approved ? undefined : reason }
    });

    return NextResponse.json({ message: approved ? "Shift approved for payroll." : "Shift returned to worker." });
  }

  return NextResponse.json({ message: "Unknown shift workflow action." }, { status: 400 });
}
