import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser, type UserRole } from "@/lib/auth";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

const bucket = "incident-attachments";

type AuthContext = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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

async function canAccessParticipant(participantName: string, user: AuthContext) {
  if (user.role === "admin") return true;
  if (!participantName) return false;
  const admin = serviceClient();
  if (!admin) return false;
  const { data } = await admin
    .from("shifts")
    .select("id")
    .eq("participant_name", participantName)
    .eq("support_worker_email", user.email)
    .limit(1);
  return Boolean(data?.length);
}

function read(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function normaliseStatus(value: string) {
  return value || "Submitted";
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const form = await request.formData();
  const incidentNumber = read(form, "incidentNumber");
  const participantName = read(form, "participantName");
  const staffName = read(form, "staffName") || auth.user.name;
  const staffEmail = read(form, "staffEmail") || auth.user.email;
  const severity = read(form, "severity");
  const summary = read(form, "summary");
  const reportableIncidentType = read(form, "reportableType");
  const reportableToCommission = reportableIncidentType !== "" && reportableIncidentType !== "Not reportable";

  if (!incidentNumber || !participantName || !severity || !summary) {
    return NextResponse.json({ message: "Incident number, participant, severity, and incident details are required." }, { status: 400 });
  }

  if (auth.user.role === "support_worker" && staffEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
    return NextResponse.json({ message: "Support workers can only submit incidents under their own login." }, { status: 403 });
  }

  if (!(await canAccessParticipant(participantName, auth.user))) {
    return NextResponse.json({ message: "You do not have permission to create incidents for this participant." }, { status: 403 });
  }

  const uploadedPaths: string[] = [];
  const attachmentNames: string[] = [];
  const files = form.getAll("attachments").filter((file): file is File => file instanceof File && file.size > 0);

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${auth.user.id}/${incidentNumber}/${crypto.randomUUID()}-${safeName}`;
    const upload = await admin.storage.from(bucket).upload(path, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (upload.error) {
      if (uploadedPaths.length) await admin.storage.from(bucket).remove(uploadedPaths);
      return NextResponse.json({ message: upload.error.message }, { status: 400 });
    }
    uploadedPaths.push(path);
    attachmentNames.push(file.name);
  }

  const { data: incident, error } = await admin
    .from("incident_reports")
    .insert({
      incident_number: incidentNumber,
      participant_name: participantName,
      worker_name: staffName,
      worker_email: staffEmail,
      staff_involved: staffName,
      priority: severity,
      severity,
      incident_date: read(form, "incidentDate") || null,
      incident_time: read(form, "incidentTime") || null,
      location: read(form, "location"),
      summary,
      investigation_notes: read(form, "investigationNotes"),
      reportable_to_commission: reportableToCommission,
      reportable_incident_type: reportableToCommission ? reportableIncidentType : null,
      notification_due_at: read(form, "notificationDueAt") || null,
      immediate_actions: read(form, "immediateActions"),
      impacted_person_supported: read(form, "impactedPersonSupported"),
      participant_informed: read(form, "participantInformed"),
      guardian_notified: read(form, "guardianNotified"),
      corrective_actions: read(form, "correctiveActions"),
      status: normaliseStatus(read(form, "status")),
      attachment_names: attachmentNames,
      attachment_paths: uploadedPaths
    })
    .select("id")
    .single();

  if (error) {
    if (uploadedPaths.length) await admin.storage.from(bucket).remove(uploadedPaths);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(admin, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "incident_report",
    tableName: "incident_reports",
    recordId: incident.id,
    recordLabel: incidentNumber,
    metadata: {
      participantName,
      staffName,
      severity,
      reportableToCommission,
      reportableIncidentType: reportableToCommission ? reportableIncidentType : null,
      notificationDueAt: read(form, "notificationDueAt") || null,
      status: normaliseStatus(read(form, "status")),
      attachmentCount: uploadedPaths.length
    }
  });

  return NextResponse.json({ message: "Incident saved.", id: incident.id });
}
