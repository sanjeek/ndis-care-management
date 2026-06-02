export type UserRole = "admin" | "support_worker" | "team_leader" | "family";

const workerRoutes = ["/worker-portal", "/my-shifts", "/participants", "/care-plans", "/medications", "/progress-notes", "/incident-reports", "/profile", "/unauthorised"];
const workerNavOrder = ["/worker-portal", "/my-shifts", "/care-plans", "/medications", "/progress-notes", "/incident-reports", "/profile"];
const teamLeaderRoutes = ["/dashboard", "/timesheets", "/medications", "/profile", "/unauthorised"];
const teamLeaderNavOrder = ["/dashboard", "/timesheets", "/medications", "/profile"];
const familyRoutes = ["/family-portal", "/profile", "/unauthorised"];
const familyNavOrder = ["/family-portal", "/profile"];
const adminEmails = ["sanjee@live.com"];

export function normalizeRole(role: unknown): UserRole {
  if (role === "admin" || role === "provider_admin") return "admin";
  if (role === "team_leader") return "team_leader";
  if (role === "family") return "family";
  return "support_worker";
}

export function roleForUser(role: unknown, email?: string | null): UserRole {
  if (email && adminEmails.includes(email.toLowerCase())) return "admin";
  return normalizeRole(role);
}

export function canAccessRoute(role: UserRole, pathname: string) {
  if (role === "admin") return true;
  if (role === "team_leader") return teamLeaderRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (role === "family") return familyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return workerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function defaultRouteForRole(role: UserRole) {
  if (role === "team_leader") return "/dashboard";
  if (role === "family") return "/family-portal";
  return role === "support_worker" ? "/worker-portal" : "/dashboard";
}

export function visibleNavForRole<T extends { href: string }>(role: UserRole, items: T[]) {
  if (role === "admin") return items;
  if (role === "team_leader") return teamLeaderNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
  if (role === "family") return familyNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
  return workerNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
}

export function friendlyRole(role: UserRole | string) {
  const normalised = normalizeRole(role);
  if (normalised === "team_leader") return "Team leader";
  if (normalised === "family") return "Family member";
  return normalised === "support_worker" ? "Support worker" : "Admin";
}
