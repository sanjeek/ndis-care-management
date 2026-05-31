"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navItems } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export function AppShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserEmail(user?.email ?? "");
      setUserName(String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User"));
    });
  }, []);

  const initials = useMemo(() => {
    return userName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  }, [userName]);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
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
            {navItems.map((item) => {
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
            <p className="text-xs font-semibold uppercase text-slate-400">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{userName || "Guest user"}</p>
            <p className="truncate text-xs text-slate-500">{userEmail || "No active session"}</p>
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
                <Link href="/profile" className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gumleaf text-xs font-bold text-white">{initials}</span>
                  <span className="hidden max-w-32 truncate md:inline">{userName || "Profile"}</span>
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
        </div>
      </section>
    </main>
  );
}
