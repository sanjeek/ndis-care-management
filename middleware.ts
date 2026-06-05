import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute, roleForUser, type UserRole } from "@/lib/auth";

const privatePrefixes = [
  "/admin",
  "/branches",
  "/care-plans",
  "/checklists",
  "/dashboard",
  "/documents",
  "/family-portal",
  "/funding",
  "/incident-reports",
  "/invoices",
  "/medications",
  "/messages",
  "/my-shifts",
  "/participant-goals",
  "/participant-matching",
  "/participants",
  "/payroll",
  "/profile",
  "/progress-notes",
  "/risk-assessments",
  "/rostering",
  "/service-agreements",
  "/settings",
  "/shift-attachments",
  "/support-coordination",
  "/support-workers",
  "/tasks",
  "/timesheets",
  "/travel",
  "/unauthorised",
  "/vehicles",
  "/visitors",
  "/worker-portal"
];

type MiddlewareUser = {
  active: boolean;
  role: UserRole;
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/worker-portal/create-login") return NextResponse.next();

  const isPrivatePath = privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isPrivatePath) return NextResponse.next();

  const accessToken = request.cookies.get("careos-access-token")?.value;
  if (!accessToken) return redirectToLogin(request, pathname, search);

  const user = await validateSupabaseSession(accessToken);
  if (!user?.active) return redirectToLogin(request, pathname, search);

  if (pathname !== "/unauthorised" && !canAccessRoute(user.role, pathname)) {
    const unauthorisedUrl = request.nextUrl.clone();
    unauthorisedUrl.pathname = "/unauthorised";
    unauthorisedUrl.search = "";
    unauthorisedUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(unauthorisedUrl);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, pathname: string, search: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  for (const name of ["careos-access-token", "careos-session", "careos-role"]) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return response;
}

async function validateSupabaseSession(accessToken: string): Promise<MiddlewareUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anon
      }
    });

    if (!authResponse.ok) return null;
    const authUser = await authResponse.json();
    const profile = await readProfile(url, anon, accessToken, String(authUser.id ?? ""));
    const role = roleForUser(authUser.user_metadata?.role || profile?.role, authUser.email);

    return {
      active: profile?.active !== false,
      role
    };
  } catch {
    return null;
  }
}

async function readProfile(url: string, anon: string, accessToken: string, userId: string) {
  if (!userId) return null;
  const response = await fetch(`${url}/rest/v1/profiles?select=role,active&id=eq.${encodeURIComponent(userId)}&limit=1`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon
    }
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : null;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
