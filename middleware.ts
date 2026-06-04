import { NextResponse, type NextRequest } from "next/server";

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

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/worker-portal/create-login") return NextResponse.next();

  const isPrivatePath = privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isPrivatePath) return NextResponse.next();

  const hasSessionMarker = request.cookies.get("careos-session")?.value === "active";
  if (hasSessionMarker) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
