import { createClient } from "@supabase/supabase-js";
import { roleForUser } from "@/lib/auth";

export function adminServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return { error: "Supabase URL or service role key is not configured." };
  }

  return {
    client: createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  };
}

export function hasAdminServiceClient(result: ReturnType<typeof adminServiceClient>): result is { client: NonNullable<ReturnType<typeof adminServiceClient>["client"]> } {
  return "client" in result && Boolean(result.client);
}

export async function requireAdminSession(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!url || !anon || !token) {
    return { error: "Admin session is required.", status: 401 };
  }

  const client = createClient(url, anon, {
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
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Admin session is invalid.", status: 401 };
  }

  let role = roleForUser(data.user.user_metadata?.role, data.user.email);
  if (!data.user.user_metadata?.role) {
    const admin = adminServiceClient();
    if (hasAdminServiceClient(admin)) {
      const { data: profile } = await admin.client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      role = roleForUser(profile?.role, data.user.email);
    }
  }

  if (role !== "admin") {
    return { error: "Only admin users can access this resource.", status: 403 };
  }

  return {
    userId: data.user.id,
    userEmail: data.user.email ?? "",
    userName: String(data.user.user_metadata?.full_name || data.user.email || data.user.id),
    userRole: role
  };
}
