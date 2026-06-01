"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navItems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { canAccessRoute, defaultRouteForRole, friendlyRole, normalizeRole, type UserRole, visibleNavForRole } from "@/lib/auth";
import { CopyrightFooter } from "@/components/copyright-footer";

export function AppShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [authChecked, setAuthChecked] = useState(false);

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
      let role = normalizeRole(user.user_metadata?.role);
      let profileName = "";
      if (!user.user_metadata?.role) {
        const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
        role = normalizeRole(profile?.role);
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
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
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
    </main>
  );
}
