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

async function canAccessDocument(document: { participant_name: string | null }, user: AuthContext) {
  if (user.role === "admin") return true;
  if (!document.participant_name) return false;
  const admin = serviceClient();
  if (!admin) return false;
  const { data } = await admin
    .from("shifts")
    .select("id")
    .eq("participant_name", document.participant_name)
    .eq("support_worker_email", user.email)
    .limit(1);
  return Boolean(data?.length);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const { id } = await context.params;
  const { data: document, error } = await admin
    .from("care_documents")
    .select("id, title, participant_name, storage_bucket, storage_path, file_name")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ message: "Document not found." }, { status: 404 });
  }

  if (!(await canAccessDocument(document, auth.user))) {
    return NextResponse.json({ message: "You do not have permission to access this document." }, { status: 403 });
  }

  const signed = await admin.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 120, {
    download: document.file_name
  });

  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ message: signed.error?.message ?? "Could not create secure download link." }, { status: 400 });
  }

  await recordServerAudit(admin, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "document_access",
    tableName: "care_documents",
    recordId: document.id,
    recordLabel: document.title,
    metadata: { participantName: document.participant_name, signedUrlSeconds: 120 }
  });

  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 120 });
}
