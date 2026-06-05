import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleForUser } from "@/lib/auth";
import { serviceClient } from "@/lib/server-audit";

const sessionCookie = "careos-session";
const roleCookie = "careos-role";
const accessTokenCookie = "careos-access-token";
const sessionMaxAge = 30 * 60;

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = serviceClient();

  if (!url || !anon || !admin) {
    return NextResponse.json({ message: "Supabase credentials are not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const accessToken = String(body.accessToken ?? "");
  if (!accessToken) {
    return clearSessionResponse("Supabase session token is required.", 401);
  }

  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return clearSessionResponse("Invalid Supabase session.", 401);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.active === false) {
    return clearSessionResponse("This user account is inactive.", 403);
  }

  const role = roleForUser(data.user.user_metadata?.role || profile?.role, data.user.email);
  const response = NextResponse.json({
    email: data.user.email ?? "",
    name: String(data.user.user_metadata?.full_name || profile?.full_name || data.user.email || data.user.id),
    role
  });

  setSessionCookies(response, accessToken, role);
  return response;
}

export async function DELETE() {
  return clearSessionResponse("Session cleared.", 200);
}

function setSessionCookies(response: NextResponse, accessToken: string, role: string) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(accessTokenCookie, accessToken, {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure
  });
  response.cookies.set(sessionCookie, "active", {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure
  });
  response.cookies.set(roleCookie, role, {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure
  });
}

function clearSessionResponse(message: string, status: number) {
  const response = NextResponse.json({ message }, { status });
  const secure = process.env.NODE_ENV === "production";
  for (const name of [accessTokenCookie, sessionCookie, roleCookie]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure
    });
  }
  return response;
}
