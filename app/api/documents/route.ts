import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser, type UserRole } from "@/lib/auth";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

const bucket = "care-documents";

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

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const participantName = String(form.get("participantName") ?? "").trim();

  if (!(file instanceof File) || !title) {
    return NextResponse.json({ message: "Document title and file are required." }, { status: 400 });
  }

  if (!(await canAccessParticipant(participantName, auth.user))) {
    return NextResponse.json({ message: "You do not have permission to upload documents for this participant." }, { status: 403 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const upload = await admin.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (upload.error) {
    return NextResponse.json({ message: upload.error.message }, { status: 400 });
  }

  const { data: document, error } = await admin
    .from("care_documents")
    .insert({
      title,
      participant_name: participantName || null,
      owner_user_id: auth.user.id,
      owner_email: auth.user.email,
      storage_bucket: bucket,
      storage_path: path,
      file_name: file.name,
      content_type: file.type || null,
      size_bytes: file.size
    })
    .select("id")
    .single();

  if (error) {
    await admin.storage.from(bucket).remove([path]);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(admin, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "create",
    tableName: "care_documents",
    recordId: document.id,
    recordLabel: title,
    metadata: { fileName: file.name, participantName, secureStorage: true }
  });

  const recipients = await getAdminNotificationRecipients(admin, { fallback: [auth.user.email] });
  await sendCareNotification(admin, {
    type: "document_upload",
    to: recipients,
    subject: `Secure document uploaded: ${title}`,
    text: [
      `A secure document was uploaded.`,
      `Title: ${title}`,
      `File: ${file.name}`,
      `Participant: ${participantName || "Not linked"}`,
      `Uploaded by: ${auth.user.name} (${auth.user.email})`,
      `Open documents: ${appUrl("/documents")}`
    ].join("\n"),
    metadata: {
      documentId: document.id,
      title,
      fileName: file.name,
      participantName,
      uploadedBy: auth.user.email
    }
  });

  return NextResponse.json({ message: "Document uploaded securely.", id: document.id });
}
