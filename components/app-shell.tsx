"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navItems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { canAccessRoute, defaultRouteForRole, friendlyRole, roleForUser, type UserRole, visibleNavForRole } from "@/lib/auth";
import { CopyrightFooter } from "@/components/copyright-footer";
import { recordAudit } from "@/lib/audit";

const inactivityLimitMs = 30 * 60 * 1000;
const warningBeforeLogoutMs = 5 * 60 * 1000;
const lastActivityKey = "careos:last-activity";

export function AppShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [authChecked, setAuthChecked] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(warningBeforeLogoutMs / 1000);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (!supabase) {
        redirectToLogin();
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        redirectToLogin();
        return;
      }

      if (!active) return;
      const user = session.user;
      let role = roleForUser(user.user_metadata?.role, user.email);
      let profileName = "";
      if (!user.user_metadata?.role) {
        const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
        role = roleForUser(profile?.role, user.email);
        profileName = String(profile?.full_name ?? "");
      }

      if (!canAccessRoute(role, window.location.pathname)) {
        const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(`/unauthorised?from=${encodeURIComponent(requestedPath)}`);
        return;
      }

      setUserEmail(user.email ?? "");
      setUserName(String(user.user_metadata?.full_name || profileName || user.email || user.id));
      setUserRole(role);
      setAuthChecked(true);
    }

    function redirectToLogin() {
      if (typeof window === "undefined") return;
      const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
    }

    void checkSession();

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        redirectToLogin();
      }
    }) ?? { data: null };

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !supabase) return;

    let warningTimer: number | undefined;
    let logoutTimer: number | undefined;
    let countdownTimer: number | undefined;

    function clearTimers() {
      if (warningTimer) window.clearTimeout(warningTimer);
      if (logoutTimer) window.clearTimeout(logoutTimer);
      if (countdownTimer) window.clearInterval(countdownTimer);
    }

    function lastActivity() {
      return Number(window.localStorage.getItem(lastActivityKey) || Date.now());
    }

    function updateCountdown() {
      const expiresAt = lastActivity() + inactivityLimitMs;
      setSecondsUntilLogout(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }

    async function expireSession() {
      clearTimers();
      setShowIdleWarning(false);
      await recordAudit({
        action: "logout",
        tableName: "auth.users",
        recordLabel: userEmail,
        metadata: { reason: "inactivity_timeout", inactivityMinutes: 30, pathname: window.location.pathname }
      });
      await supabase?.auth.signOut();
      window.location.replace("/login?reason=session-expired");
    }

    function scheduleTimers() {
      clearTimers();
      const elapsed = Date.now() - lastActivity();
      const warningDelay = Math.max(0, inactivityLimitMs - warningBeforeLogoutMs - elapsed);
      const logoutDelay = Math.max(0, inactivityLimitMs - elapsed);

      warningTimer = window.setTimeout(() => {
        setShowIdleWarning(true);
        updateCountdown();
        countdownTimer = window.setInterval(updateCountdown, 1000);
      }, warningDelay);

      logoutTimer = window.setTimeout(() => {
        void expireSession();
      }, logoutDelay);
    }

    function markActivity() {
      window.localStorage.setItem(lastActivityKey, String(Date.now()));
      setShowIdleWarning(false);
      setSecondsUntilLogout(warningBeforeLogoutMs / 1000);
      scheduleTimers();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === lastActivityKey) {
        scheduleTimers();
        setShowIdleWarning(false);
      }
    }

    if (!window.localStorage.getItem(lastActivityKey)) {
      window.localStorage.setItem(lastActivityKey, String(Date.now()));
    }

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener("storage", handleStorage);
    scheduleTimers();

    return () => {
      clearTimers();
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener("storage", handleStorage);
    };
  }, [authChecked, userEmail]);

  const visibleNavItems = useMemo(() => visibleNavForRole(userRole, navItems), [userRole]);

  const initials = useMemo(() => {
    return userName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || userEmail.slice(0, 2).toUpperCase();
  }, [userEmail, userName]);

  async function signOut() {
    if (supabase) {
      await recordAudit({
        action: "logout",
        tableName: "auth.users",
        recordLabel: userEmail,
        metadata: { pathname: window.location.pathname }
      });
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  }

  function staySignedIn() {
    window.localStorage.setItem(lastActivityKey, String(Date.now()));
    setShowIdleWarning(false);
    setSecondsUntilLogout(warningBeforeLogoutMs / 1000);
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-ink">Checking secure session...</p>
          <p className="mt-1 text-xs text-slate-500">Private CareOS pages require sign in.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={defaultRouteForRole(userRole)} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-ink text-sm font-bold text-white">CO</span>
              <span>
                <span className="block text-base font-semibold text-ink">CareOS</span>
                <span className="block text-xs text-slate-500">NDIS operations</span>
              </span>
            </Link>
            <button className="rounded border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(!open)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className={`${open ? "grid" : "hidden"} mt-5 gap-1 lg:grid`}>
            {visibleNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-gumleaf text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded border border-slate-200 bg-slate-50 p-3 lg:block">
            <p className="text-xs font-semibold uppercase text-slate-400">Account</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
            <p className="mt-2 inline-flex rounded bg-gumleaf/10 px-2 py-1 text-xs font-semibold text-gumleaf">{friendlyRole(userRole)}</p>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-[65px] z-10 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur lg:top-0 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium text-gumleaf">{eyebrow}</p>
                <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {userRole === "admin" ? (
                  <form
                    className="flex min-w-0 items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-80"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (search.trim()) {
                        window.location.href = `/participants?search=${encodeURIComponent(search.trim())}`;
                      }
                    }}
                  >
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input className="w-full bg-transparent text-sm outline-none" placeholder="Search records" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </form>
                ) : null}
                <Link href="/profile" className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gumleaf text-xs font-bold text-white">{initials}</span>
                  <span className="hidden max-w-32 truncate md:inline">{userName}</span>
                  <UserCircle className="h-4 w-4 text-slate-400" />
                </Link>
                <button onClick={signOut} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-6 lg:px-8">{children}</div>
          <CopyrightFooter />
        </div>
      </section>
      {showIdleWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="idle-warning-title">
          <section className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 id="idle-warning-title" className="text-xl font-semibold text-ink">Session expiring soon</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              You have been inactive. For security, CareOS will sign you out in {formatCountdown(secondsUntilLogout)}.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={signOut} className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign out now
              </button>
              <button onClick={staySignedIn} className="rounded bg-gumleaf px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d625d]">
                Stay signed in
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
