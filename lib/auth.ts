export type UserRole = "admin" | "support_worker";

const workerRoutes = ["/worker-portal", "/my-shifts", "/progress-notes", "/incident-reports", "/profile", "/unauthorised"];
const workerNavOrder = ["/worker-portal", "/my-shifts", "/progress-notes", "/incident-reports", "/profile"];

export function normalizeRole(role: unknown): UserRole {
  if (role === "admin" || role === "provider_admin") return "admin";
  return "support_worker";
}

export function canAccessRoute(role: UserRole, pathname: string) {
  if (role === "admin") return true;
  return workerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function defaultRouteForRole(role: UserRole) {
  return role === "support_worker" ? "/worker-portal" : "/dashboard";
}

export function visibleNavForRole<T extends { href: string }>(role: UserRole, items: T[]) {
  if (role === "admin") return items;
  return workerNavOrder.map((href) => items.find((item) => item.href === href)).filter((item): item is T => Boolean(item));
}

export function friendlyRole(role: UserRole | string) {
  return normalizeRole(role) === "support_worker" ? "Support worker" : "Admin";
}
