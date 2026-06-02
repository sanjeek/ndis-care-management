import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser } from "@/lib/auth";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

type AuthContext = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "support_worker";
};

type IncidentAttachmentRecord = {
  id: string;
  incident_number: string | null;
  participant_name: string;
  worker_email: string | null;
  attachment_names: string[] | null;
  attachment_paths: string[] | null;
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

async function canAccessIncident(incident: IncidentAttachmentRecord, user: AuthContext) {
  if (user.role === "admin") return true;
  if ((incident.worker_email ?? "").toLowerCase() !== user.email.toLowerCase()) return false;
  const admin = serviceClient();
  if (!admin) return false;
  const { data } = await admin
    .from("shifts")
    .select("id")
    .eq("participant_name", incident.participant_name)
    .eq("support_worker_email", user.email)
    .limit(1);
  return Boolean(data?.length);
}

export async function GET(request: Request, context: { params: Promise<{ id: string; index: string }> }) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const { id, index } = await context.params;
  const attachmentIndex = Number(index);
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) {
    return NextResponse.json({ message: "Attachment not found." }, { status: 404 });
  }

  const { data: incident, error } = await admin
    .from("incident_reports")
    .select("id, incident_number, participant_name, worker_email, attachment_names, attachment_paths")
    .eq("id", id)
    .maybeSingle<IncidentAttachmentRecord>();

  if (error || !incident) {
    return NextResponse.json({ message: "Incident not found." }, { status: 404 });
  }

  if (!(await canAccessIncident(incident, auth.user))) {
    return NextResponse.json({ message: "You do not have permission to access this incident attachment." }, { status: 403 });
  }

  const path = incident.attachment_paths?.[attachmentIndex];
  const fileName = incident.attachment_names?.[attachmentIndex] ?? "incident-attachment";
  if (!path) {
    return NextResponse.json({ message: "Attachment not found." }, { status: 404 });
  }

  const signed = await admin.storage.from("incident-attachments").createSignedUrl(path, 120, {
    download: fileName
  });

  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ message: signed.error?.message ?? "Could not create secure attachment link." }, { status: 400 });
  }

  await recordServerAudit(admin, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "document_access",
    tableName: "incident_reports",
    recordId: incident.id,
    recordLabel: incident.incident_number ?? incident.id,
    metadata: { participantName: incident.participant_name, fileName, signedUrlSeconds: 120 }
  });

  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 120 });
}
