import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser } from "@/lib/auth";
import { recordServerAudit, serviceClient } from "@/lib/server-audit";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!url || !anon || !token) {
    return NextResponse.json({ message: "Authenticated session is required for audit logging." }, { status: 401 });
  }

  const authClient = createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ message: "Invalid audit session." }, { status: 401 });
  }

  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const action = String(body.action ?? "").trim();
  if (!action) {
    return NextResponse.json({ message: "Audit action is required." }, { status: 400 });
  }

  let role = roleForUser(data.user.user_metadata?.role, data.user.email);
  if (!data.user.user_metadata?.role) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    role = roleForUser(profile?.role, data.user.email);
  }

  await recordServerAudit(admin, {
    userId: data.user.id,
    userEmail: data.user.email,
    userName: String(data.user.user_metadata?.full_name || data.user.email || data.user.id),
    userRole: role,
    action,
    tableName: String(body.tableName ?? ""),
    recordId: String(body.recordId ?? ""),
    recordLabel: String(body.recordLabel ?? ""),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {}
  });

  return NextResponse.json({ message: "Audit recorded." });
}
