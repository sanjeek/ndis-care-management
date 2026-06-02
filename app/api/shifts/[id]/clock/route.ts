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

type ShiftClockRecord = {
  id: string;
  participant_name: string;
  support_worker_email: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  approval_status: string | null;
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

  const { data: shift, error } = await admin
    .from("shifts")
    .select("id, participant_name, support_worker_email, clock_in_at, clock_out_at, approval_status")
    .eq("id", id)
    .maybeSingle<ShiftClockRecord>();

  if (error || !shift) {
    return NextResponse.json({ message: "Shift not found." }, { status: 404 });
  }

  const isAssignedWorker = (shift.support_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!isAssignedWorker) {
    return NextResponse.json({ message: "You can only clock shifts assigned to your login." }, { status: 403 });
  }

  if (shift.approval_status === "approved") {
    return NextResponse.json({ message: "This shift is already approved for payroll and cannot be changed." }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (action === "in") {
    if (shift.clock_in_at) {
      return NextResponse.json({ message: "You have already clocked in for this shift." }, { status: 400 });
    }
    const update = await admin
      .from("shifts")
      .update({
        status: "In progress",
        clock_in_at: now,
        clocked_by: auth.user.id,
        clocked_by_email: auth.user.email
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
      metadata: { workflow: "clock_in", participantName: shift.participant_name }
    });

    return NextResponse.json({ message: "Clock in saved." });
  }

  if (action === "out") {
    if (!shift.clock_in_at) {
      return NextResponse.json({ message: "Clock in before clocking out." }, { status: 400 });
    }
    if (shift.clock_out_at) {
      return NextResponse.json({ message: "You have already clocked out for this shift." }, { status: 400 });
    }
    const update = await admin
      .from("shifts")
      .update({
        status: "Completed",
        clock_out_at: now,
        clocked_by: auth.user.id,
        clocked_by_email: auth.user.email
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
      metadata: { workflow: "clock_out", participantName: shift.participant_name }
    });

    return NextResponse.json({ message: "Clock out saved. Submit the shift for approval when your notes are complete." });
  }

  return NextResponse.json({ message: "Unknown clock action." }, { status: 400 });
}
