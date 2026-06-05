export type UserRole = "super_admin" | "admin" | "support_worker" | "team_leader" | "family";

const workerRoutes = ["/worker-portal", "/my-shifts", "/travel", "/training-records", "/emergency-contacts", "/shift-attachments", "/checklists", "/messages", "/tasks", "/participant-goals", "/participants", "/care-plans", "/medications", "/progress-notes", "/incident-reports", "/risk-assessments", "/support-coordination", "/profile", "/unauthorised"];
const workerNavOrder = ["/worker-portal", "/my-shifts", "/travel", "/training-records", "/shift-attachments", "/checklists", "/messages", "/tasks", "/participant-goals", "/care-plans", "/medications", "/progress-notes", "/incident-reports", "/risk-assessments", "/support-coordination", "/profile"];
const teamLeaderRoutes = ["/dashboard", "/branches", "/timesheets", "/payroll", "/contractor-invoices", "/travel", "/training-records", "/emergency-contacts", "/visitors", "/vehicles", "/shift-attachments", "/checklists", "/messages", "/tasks", "/participant-goals", "/medications", "/incident-reports", "/risk-assessments", "/support-coordination", "/service-agreements", "/profile", "/unauthorised"];
const teamLeaderNavOrder = ["/dashboard", "/branches", "/timesheets", "/payroll", "/contractor-invoices", "/travel", "/training-records", "/visitors", "/vehicles", "/shift-attachments", "/checklists", "/messages", "/tasks", "/participant-goals", "/medications", "/incident-reports", "/risk-assessments", "/support-coordination", "/service-agreements", "/profile"];
const familyRoutes = ["/family-portal", "/participant-goals", "/profile", "/unauthorised"];
const familyNavOrder = ["/family-portal", "/participant-goals", "/profile"];
const superAdminEmails = ["sanjee@live.com"];

export function normalizeRole(role: unknown): UserRole {
  if (role === "super_admin") return "super_admin";
  if (role === "admin" || role === "provider_admin") return "admin";
  if (role === "team_leader") return "team_leader";
  if (role === "family") return "family";
  return "support_worker";
}

export function roleForUser(role: unknown, email?: string | null): UserRole {
  if (email && superAdminEmails.includes(email.toLowerCase())) return "super_admin";
  return normalizeRole(role);
}

export function canAccessRoute(role: UserRole, pathname: string) {
  if (role === "super_admin" || role === "admin") return true;
  if (role === "team_leader") return teamLeaderRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (role === "family") return familyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return workerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function defaultRouteForRole(role: UserRole) {
  if (role === "team_leader") return "/dashboard";
  if (role === "family") return "/family-portal";
  return role === "support_worker" ? "/worker-portal" : "/dashboard";
}

export function isAdminRole(role: UserRole | string) {
  return role === "admin" || role === "super_admin";
}

export function visibleNavForRole<T extends { href: string }>(role: UserRole, items: T[]) {
  if (role === "super_admin" || role === "admin") return items;
  if (role === "team_leader") return teamLeaderNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
  if (role === "family") return familyNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
  return workerNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
}

export function friendlyRole(role: UserRole | string) {
  const normalised = normalizeRole(role);
  if (normalised === "super_admin") return "Super admin";
  if (normalised === "team_leader") return "Team leader";
  if (normalised === "family") return "Family member";
  return normalised === "support_worker" ? "Support worker" : "Admin";
}
