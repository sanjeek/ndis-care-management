import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { roleForUser, type UserRole } from "@/lib/auth";
import { serviceClient } from "@/lib/server-audit";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type ApiAuthResult = { user: ApiUser; client: SupabaseClient } | { response: NextResponse };

export async function requireApiUser(request: Request): Promise<ApiAuthResult> {
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

  const { data: profile } = await admin.from("profiles").select("role, full_name, active").eq("id", data.user.id).maybeSingle();
  const role = roleForUser(data.user.user_metadata?.role || profile?.role, data.user.email);
  if (profile?.active === false) {
    return { response: NextResponse.json({ message: "This user account is inactive." }, { status: 403 }) };
  }

  return {
    client: admin,
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: String(data.user.user_metadata?.full_name || profile?.full_name || data.user.email || data.user.id),
      role
    }
  };
}

export function requireRole(user: ApiUser, roles: UserRole[]) {
  return roles.includes(user.role);
}
