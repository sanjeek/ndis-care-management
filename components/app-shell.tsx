"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, Download, LogOut, Menu, MessageSquare, Search, UserCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navItems } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { canAccessRoute, defaultRouteForRole, friendlyRole, roleForUser, type UserRole, visibleNavForRole } from "@/lib/auth";
import { CopyrightFooter } from "@/components/copyright-footer";
import { recordAudit } from "@/lib/audit";
import { clearServerSession, syncServerSession } from "@/lib/session-sync";

const inactivityLimitMs = 30 * 60 * 1000;
const warningBeforeLogoutMs = 5 * 60 * 1000;
const lastActivityKey = "careos:last-activity";
const appTimeZone = "Australia/Sydney";

type AppNotification = {
  id: string;
  title: string;
  body: string;
  linkUrl: string;
  readAt: string;
  createdAt: string;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export function AppShell({ title, eyebrow, children, hidePdf }: { title: string; eyebrow?: string; children: React.ReactNode; hidePdf?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [authChecked, setAuthChecked] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(warningBeforeLogoutMs / 1000);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayInAppTimeZone);
  const [dateManuallyChanged, setDateManuallyChanged] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchNotice, setSearchNotice] = useState("");
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  const lastServerSessionSync = useRef(0);

  useEffect(() => {
    let active = true;

    async function readSessionWithRetry() {
      if (!supabase) return null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data.session;
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      return null;
    }

    async function checkSession() {
      if (!supabase) {
        redirectToLogin();
        return;
      }

      const session = await readSessionWithRetry();

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

      setSessionMarker(role);
      await syncServerSession(role);
      lastServerSessionSync.current = Date.now();
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

    const { data: authListener } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSessionMarker();
        void clearServerSession();
        redirectToLogin();
        return;
      }
      if (session) {
        void checkSession();
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
      await clearServerSession();
      clearSessionMarker();
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
      setSessionMarker(userRole);
      const now = Date.now();
      if (now - lastServerSessionSync.current > 5 * 60 * 1000) {
        lastServerSessionSync.current = now;
        void syncServerSession(userRole);
      }
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
  }, [authChecked, userEmail, userRole]);

  useEffect(() => {
    if (!authChecked || !supabase || !userEmail) return;

    let active = true;
    const client = supabase;
    async function loadNotifications() {
      const { data } = await client
        .from("app_notifications")
        .select("id, title, body, link_url, read_at, created_at")
        .eq("recipient_email", userEmail.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(8);
      if (!active) return;
      setNotifications((data ?? []).map((row) => ({
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        body: String(row.body ?? ""),
        linkUrl: String(row.link_url ?? ""),
        readAt: String(row.read_at ?? ""),
        createdAt: String(row.created_at ?? "")
      })));
    }

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [authChecked, userEmail]);

  useEffect(() => {
    if (!authChecked || !supabase) return;
    const client = supabase;
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchNotice(query ? "Type at least 2 characters to search." : "");
      setSearchLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      const token = (await client.auth.getSession()).data.session?.access_token;
      if (!token) {
        setSearchNotice("Please sign in again before searching.");
        setSearchLoading(false);
        return;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => ({ results: [], message: "Search failed." }));
      if (!active) return;
      setSearchResults(result.results ?? []);
      setSearchNotice(response.ok ? (result.results?.length ? "" : "No matching records found.") : result.message);
      setSearchLoading(false);
      setSearchOpen(true);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authChecked, search]);

  const visibleNavItems = useMemo(() => visibleNavForRole(userRole, navItems), [userRole]);
  const groupedNavItems = useMemo(() => groupNavigation(visibleNavItems, pathname), [pathname, visibleNavItems]);
  const activeNavGroup = groupedNavItems.find((group) => group.active)?.label ?? "";
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    setOpenNavGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (dateManuallyChanged) return;
    setSelectedDate(todayInAppTimeZone());
    const interval = window.setInterval(() => {
      setSelectedDate(todayInAppTimeZone());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [dateManuallyChanged]);

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
    await clearServerSession();
    clearSessionMarker();
    window.location.href = "/login";
  }

  function staySignedIn() {
    window.localStorage.setItem(lastActivityKey, String(Date.now()));
    setSessionMarker(userRole);
    lastServerSessionSync.current = Date.now();
    void syncServerSession(userRole);
    setShowIdleWarning(false);
    setSecondsUntilLogout(warningBeforeLogoutMs / 1000);
  }

  async function openNotification(notification: AppNotification) {
    if (supabase && !notification.readAt) {
      const readAt = new Date().toISOString();
      await supabase.from("app_notifications").update({ read_at: readAt }).eq("id", notification.id);
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt } : item));
    }
    setNotificationsOpen(false);
    if (notification.linkUrl) window.location.href = notification.linkUrl;
  }

  function openSearchResult(result: SearchResult) {
    setSearchOpen(false);
    setSearch("");
    window.location.href = result.href;
  }

  function downloadCurrentPagePdf() {
    const exportRoot = document.querySelector<HTMLElement>("[data-careos-export]");
    const report = buildPagePdfReport({
      title,
      eyebrow,
      root: exportRoot,
      userName,
      userEmail,
      role: friendlyRole(userRole)
    });
    const pdf = buildCareOsReportPdf(report);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(title)}-${todayInAppTimeZone()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    void recordAudit({
      action: "download_pdf",
      tableName: "ui.page_export",
      recordLabel: title,
      metadata: { pathname: window.location.pathname, title }
    });
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
    <main className="min-h-screen bg-[#f8fbff]">
      <section className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="sticky top-0 z-20 flex flex-col border-b border-indigo-100/80 bg-[#fbfdff]/95 px-4 py-3 backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href={defaultRouteForRole(userRole)} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-sm font-bold text-gumleaf shadow-[0_8px_18px_rgba(75,95,232,0.08)]">CO</span>
              <span>
                <span className="block text-base font-semibold text-ink">CareOS</span>
                <span className="block text-xs text-slate-500">NDIS operations</span>
              </span>
            </Link>
            <button className="rounded border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(!open)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className={`${open ? "grid" : "hidden"} mt-5 gap-1 lg:grid lg:flex-1 lg:overflow-y-auto lg:pr-1`}>
            {groupedNavItems.map((group) => {
              if (group.items.length === 1 && group.href) {
                const item = group.items[0];
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={group.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      active ? "border border-indigo-100 bg-indigo-50 text-gumleaf shadow-none" : "text-slate-600 hover:bg-indigo-50/70 hover:text-ink"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {group.label}
                  </Link>
                );
              }

              const isOpen = group.label === (openNavGroup ?? activeNavGroup);
              const Icon = group.icon;
              return (
                <div key={group.label} className="grid gap-1">
                  <button
                    type="button"
                    onClick={() => setOpenNavGroup(isOpen ? "" : group.label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                      group.active ? "border border-indigo-100 bg-indigo-50 text-gumleaf" : "text-slate-600 hover:bg-indigo-50/70 hover:text-ink"
                    }`}
                    aria-expanded={isOpen}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen ? (
                    <div className="grid gap-1 border-l border-slate-200 pl-4 ml-5">
                      {group.items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setOpen(false);
                              setOpenNavGroup(group.label);
                            }}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                              active ? "bg-white text-gumleaf ring-1 ring-indigo-100" : "text-slate-600 hover:bg-indigo-50/70 hover:text-ink"
                            }`}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-lg border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Account</p>
            <p className="mt-1 truncate text-xs font-semibold text-ink">{userName}</p>
            <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
            <p className="mt-1.5 inline-flex rounded bg-gumleaf/10 px-2 py-0.5 text-[10px] font-semibold text-gumleaf">{friendlyRole(userRole)}</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-[65px] z-10 border-b border-indigo-100/80 bg-[#fbfdff]/95 px-4 py-4 backdrop-blur lg:top-0 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                {eyebrow ? <p className="truncate text-sm font-medium text-gumleaf">{eyebrow}</p> : null}
                <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-96">
                  <form
                    className="flex min-w-0 items-center gap-2 rounded border border-indigo-100 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (searchResults[0]) openSearchResult(searchResults[0]);
                    }}
                  >
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Search participants, workers, shifts, invoices, documents..."
                      value={search}
                      onFocus={() => setSearchOpen(true)}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setSearchOpen(true);
                      }}
                    />
                  </form>
                  {searchOpen && (search.trim().length > 0 || searchResults.length > 0) ? (
                    <div className="absolute right-0 z-40 mt-2 w-[min(32rem,calc(100vw-2rem))] rounded border border-indigo-100 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <p className="font-semibold text-ink">Global search</p>
                        <p className="text-xs text-slate-500">Results are filtered by your account permissions.</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {searchLoading ? (
                          <p className="px-4 py-5 text-sm text-slate-500">Searching records...</p>
                        ) : searchResults.length ? (
                          searchResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              onClick={() => openSearchResult(result)}
                              className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <span className="text-xs font-semibold uppercase tracking-wide text-gumleaf">{result.type}</span>
                              <span className="mt-1 block font-semibold text-ink">{result.title}</span>
                              <span className="mt-1 block text-sm text-slate-500">{result.subtitle}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-5 text-sm text-slate-500">{searchNotice || "Start typing to search records."}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => setSearchOpen(false)} className="w-full px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        Close search
                      </button>
                    </div>
                  ) : null}
                </div>
                {canAccessRoute(userRole, "/messages") ? (
                  <Link href="/messages" className="inline-flex items-center justify-center rounded-lg border border-indigo-100 bg-white p-2.5 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] hover:bg-indigo-50/60" aria-label="Open messages">
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                ) : null}
                {!hidePdf ? (
                  <button
                    type="button"
                    onClick={downloadCurrentPagePdf}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] hover:bg-indigo-50/60"
                    aria-label="Download this page as PDF"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">PDF</span>
                  </button>
                ) : null}
                <label className="hidden items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] md:flex">
                  <CalendarDays className="h-4 w-4 text-gumleaf" />
                  <span className="sr-only">Selected date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      setDateManuallyChanged(true);
                      setSelectedDate(event.target.value);
                    }}
                    className="border-0 bg-transparent p-0 text-sm font-semibold text-slate-700 outline-none"
                  />
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative inline-flex items-center justify-center rounded-lg border border-indigo-100 bg-white p-2.5 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] hover:bg-indigo-50/60"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded border border-indigo-100 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <p className="font-semibold text-ink">Notifications</p>
                        <p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : "No unread notifications"}</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length ? notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => void openNotification(notification)}
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-start gap-2">
                              {!notification.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gumleaf" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-200" />}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{notification.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.body}</p>
                              </div>
                            </div>
                          </button>
                        )) : (
                          <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.035)] hover:bg-indigo-50/60"
                    aria-label="Open user profile menu"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-gumleaf ring-1 ring-indigo-100">{initials}</span>
                    <span className="hidden max-w-32 truncate md:inline">{userName}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
                  </button>
                  {profileOpen ? (
                    <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-indigo-100 bg-white p-2 shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="font-semibold text-ink">{userName}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{userEmail}</p>
                        <p className="mt-2 inline-flex rounded bg-gumleaf/10 px-2.5 py-1 text-xs font-semibold text-gumleaf">{friendlyRole(userRole)}</p>
                      </div>
                      <Link href="/profile" onClick={() => setProfileOpen(false)} className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <UserCircle className="h-4 w-4 text-gumleaf" />
                        Profile
                      </Link>
                      {canAccessRoute(userRole, "/settings") ? (
                        <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <UserCircle className="h-4 w-4 text-gumleaf" />
                          Settings
                        </Link>
                      ) : null}
                      <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-coral hover:bg-coral/5">
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-8" data-careos-export>{children}</div>
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

type PdfFieldRow = {
  label: string;
  value: string;
};

type PagePdfReport = {
  title: string;
  eyebrow: string;
  generatedAt: string;
  userName: string;
  userEmail: string;
  role: string;
  contentLines: string[];
  fieldRows: PdfFieldRow[];
};

type PdfColor = [number, number, number];

function buildPagePdfReport({
  title,
  eyebrow,
  root,
  userName,
  userEmail,
  role
}: {
  title: string;
  eyebrow: string;
  root: HTMLElement | null;
  userName: string;
  userEmail: string;
  role: string;
}): PagePdfReport {
  const generatedAt = new Intl.DateTimeFormat("en-AU", {
    timeZone: appTimeZone,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());
  const contentLines = root ? extractVisibleText(root) : [];
  const fieldRows = root ? extractFormFieldRows(root) : [];
  return {
    title: cleanPdfText(title),
    eyebrow: cleanPdfText(eyebrow),
    generatedAt,
    userName: cleanPdfText(userName || "CareOS user"),
    userEmail: cleanPdfText(userEmail),
    role: cleanPdfText(role),
    contentLines: uniqueConsecutive(contentLines).slice(0, 180),
    fieldRows: fieldRows.slice(0, 120)
  };
}

function extractVisibleText(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("button, input, select, textarea, svg, script, style").forEach((element) => element.remove());
  return clone.innerText
    .split(/\n+/)
    .map((line) => cleanPdfText(line))
    .filter(Boolean);
}

function extractFormFieldRows(root: HTMLElement): PdfFieldRow[] {
  const fields = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
  return fields
    .map((field) => {
      if (field instanceof HTMLInputElement && ["hidden", "password", "submit", "button"].includes(field.type)) return null;
      const label = fieldLabel(field);
      const value = fieldValue(field);
      if (!label && !value) return null;
      return {
        label: cleanPdfText(label || field.name || "Field"),
        value: cleanPdfText(value || "Not completed")
      };
    })
    .filter((row): row is PdfFieldRow => Boolean(row));
}

function fieldLabel(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const explicitLabel = field.id ? document.querySelector<HTMLLabelElement>(`label[for="${cssEscape(field.id)}"]`)?.innerText : "";
  const wrappingLabel = field.closest("label")?.innerText ?? "";
  const ariaLabel = field.getAttribute("aria-label") ?? "";
  const raw = explicitLabel || wrappingLabel || ariaLabel || field.name;
  return raw
    .replace(/\s*\*?\s*(Not completed|Leave unchanged)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldValue(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (field instanceof HTMLSelectElement) return field.selectedOptions[0]?.textContent?.trim() ?? field.value;
  if (field instanceof HTMLTextAreaElement) return field.value.trim();
  if (field.type === "checkbox" || field.type === "radio") return field.checked ? "Yes" : "No";
  if (field.type === "file") return field.files?.length ? `${field.files.length} file selected` : "No file selected";
  return field.value.trim();
}

function buildCareOsReportPdf(report: PagePdfReport) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const bodyBottom = 76;
  const bodyWidth = pageWidth - margin * 2;
  const colors = {
    ink: [0.09, 0.13, 0.2] as PdfColor,
    slate: [0.39, 0.45, 0.55] as PdfColor,
    muted: [0.58, 0.64, 0.72] as PdfColor,
    line: [0.83, 0.87, 0.94] as PdfColor,
    paper: [0.98, 0.99, 1] as PdfColor,
    panel: [0.95, 0.97, 1] as PdfColor,
    indigo: [0.3, 0.28, 0.88] as PdfColor,
    indigoSoft: [0.93, 0.94, 1] as PdfColor,
    gumleaf: [0.14, 0.46, 0.44] as PdfColor,
    gumleafSoft: [0.91, 0.98, 0.97] as PdfColor,
    amber: [0.79, 0.45, 0.1] as PdfColor,
    amberSoft: [1, 0.97, 0.9] as PdfColor,
    white: [1, 1, 1] as PdfColor
  };
  const pageStreams: string[] = [];
  let commands: string[] = [];
  let y = 0;

  function startPage(pageNumber: number) {
    commands = [];
    drawRect(commands, 0, 0, pageWidth, pageHeight, colors.paper);
    drawRect(commands, margin - 10, 710, bodyWidth + 20, 96, colors.white, colors.line);
    drawRect(commands, margin - 10, 710, 8, 96, colors.gumleaf);
    drawRect(commands, margin + 316, 736, 92, 34, colors.indigoSoft, colors.line);
    drawRect(commands, margin + 418, 736, 92, 34, colors.gumleafSoft, colors.line);
    drawText(commands, "CareOS NDIS", margin + 10, 780, 13, "F2", colors.gumleaf);
    drawText(commands, "Professional provider report", margin + 10, 764, 8.5, "F3", colors.slate);
    drawWrappedText(commands, report.title || "CareOS report", margin + 10, 742, 290, 21, "F2", colors.ink, 21);
    drawWrappedText(commands, report.eyebrow || "", margin + 10, 718, 300, 8.5, "F1", colors.slate, 11);
    drawText(commands, "Generated", margin + 326, 758, 7.5, "F2", colors.indigo);
    drawWrappedText(commands, report.generatedAt, margin + 326, 746, 78, 7.5, "F1", colors.ink, 9);
    drawText(commands, "Role", margin + 428, 758, 7.5, "F2", colors.gumleaf);
    drawText(commands, report.role || "User", margin + 428, 746, 8.5, "F1", colors.ink);
    drawLine(commands, margin - 10, 696, margin + bodyWidth + 10, 696, colors.line, 0.8);
    drawFooter(commands, pageNumber);
    y = 668;
  }

  function finishPage() {
    pageStreams.push(commands.join("\n"));
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight >= bodyBottom) return;
    finishPage();
    startPage(pageStreams.length + 1);
  }

  function sectionTitle(label: string) {
    ensureSpace(34);
    drawText(commands, label, margin, y, 13, "F2", colors.ink);
    drawLine(commands, margin, y - 8, margin + bodyWidth, y - 8, colors.line, 0.6);
    y -= 28;
  }

  function summaryCard(x: number, label: string, value: string, tone: "indigo" | "gumleaf" | "amber") {
    const fill = tone === "gumleaf" ? colors.gumleafSoft : tone === "amber" ? colors.amberSoft : colors.indigoSoft;
    const accent = tone === "gumleaf" ? colors.gumleaf : tone === "amber" ? colors.amber : colors.indigo;
    drawRect(commands, x, y - 58, 158, 58, fill, colors.line);
    drawRect(commands, x, y - 58, 4, 58, accent);
    drawText(commands, label, x + 14, y - 20, 7.5, "F2", accent);
    drawWrappedText(commands, value, x + 14, y - 35, 128, 9, "F1", colors.ink, 11);
  }

  startPage(1);
  sectionTitle("Report overview");
  ensureSpace(76);
  summaryCard(margin, "PAGE", report.title || "CareOS report", "indigo");
  summaryCard(margin + 176, "GENERATED FOR", report.userName, "gumleaf");
  summaryCard(margin + 352, "ACCOUNT", report.userEmail || "No email recorded", "amber");
  y -= 82;

  sectionTitle("Visible page information");
  const visibleLines = report.contentLines.length ? report.contentLines : ["No visible page content was available for export."];
  visibleLines.forEach((line, index) => {
    const wrapped = wrapPdfText(line, bodyWidth - 42, 9.4);
    const rowHeight = Math.max(28, 14 + wrapped.length * 12);
    ensureSpace(rowHeight + 4);
    drawRect(commands, margin, y - rowHeight, bodyWidth, rowHeight, index % 2 === 0 ? colors.white : colors.panel, colors.line);
    drawText(commands, String(index + 1).padStart(2, "0"), margin + 12, y - 18, 7.5, "F2", colors.muted);
    wrapped.forEach((text, lineIndex) => {
      drawText(commands, text, margin + 42, y - 18 - lineIndex * 12, 9.4, "F1", colors.ink);
    });
    y -= rowHeight;
  });

  if (report.fieldRows.length) {
    y -= 20;
    sectionTitle("Form field snapshot");
    report.fieldRows.forEach((row, index) => {
      const labelLines = wrapPdfText(row.label, 142, 8.6);
      const valueLines = wrapPdfText(row.value, bodyWidth - 196, 9);
      const rowHeight = Math.max(32, 16 + Math.max(labelLines.length, valueLines.length) * 12);
      ensureSpace(rowHeight + 4);
      drawRect(commands, margin, y - rowHeight, bodyWidth, rowHeight, index % 2 === 0 ? colors.white : colors.panel, colors.line);
      labelLines.forEach((text, lineIndex) => {
        drawText(commands, text, margin + 12, y - 18 - lineIndex * 12, 8.6, "F2", colors.slate);
      });
      drawLine(commands, margin + 176, y - rowHeight, margin + 176, y, colors.line, 0.4);
      valueLines.forEach((text, lineIndex) => {
        drawText(commands, text, margin + 190, y - 18 - lineIndex * 12, 9, "F1", colors.ink);
      });
      y -= rowHeight;
    });
  }

  finishPage();

  const fontObjectNumber = 3 + pageStreams.length * 2;
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageRefs: string[] = [];

  pageStreams.forEach((stream, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R /F2 ${fontObjectNumber + 1} 0 R /F3 ${fontObjectNumber + 2} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageStreams.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");
  return buildPdfFile(objects);
}

function drawFooter(commands: string[], pageNumber: number) {
  const line: PdfColor = [0.83, 0.87, 0.94];
  const slate: PdfColor = [0.39, 0.45, 0.55];
  drawLine(commands, 42, 54, 553, 54, line, 0.6);
  drawText(commands, "Copyright (c) 2026 CareOS NDIS. All rights reserved.", 42, 36, 8, "F1", slate);
  drawText(commands, `Version 0.1.0 | Page ${pageNumber}`, 461, 36, 8, "F1", slate);
}

function drawRect(commands: string[], x: number, y: number, width: number, height: number, fill: PdfColor, stroke?: PdfColor) {
  commands.push(`q ${color(fill)} rg ${num(x)} ${num(y)} ${num(width)} ${num(height)} re f Q`);
  if (stroke) commands.push(`q ${color(stroke)} RG ${num(x)} ${num(y)} ${num(width)} ${num(height)} re S Q`);
}

function drawLine(commands: string[], x1: number, y1: number, x2: number, y2: number, stroke: PdfColor, width = 1) {
  commands.push(`q ${color(stroke)} RG ${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S Q`);
}

function drawText(commands: string[], text: string, x: number, y: number, size: number, font: "F1" | "F2" | "F3", fill: PdfColor) {
  commands.push(`BT /${font} ${num(size)} Tf ${color(fill)} rg ${num(x)} ${num(y)} Td (${pdfEscape(text)}) Tj ET`);
}

function drawWrappedText(commands: string[], text: string, x: number, y: number, width: number, size: number, font: "F1" | "F2" | "F3", fill: PdfColor, lineHeight: number) {
  const lines = wrapPdfText(text, width, size);
  lines.forEach((line, index) => drawText(commands, line, x, y - index * lineHeight, size, font, fill));
  return y - lines.length * lineHeight;
}

function wrapPdfText(line: string, width: number, fontSize: number) {
  const maxLength = Math.max(18, Math.floor(width / (fontSize * 0.52)));
  const clean = cleanPdfText(line);
  if (!clean) return [""];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [clean.slice(0, maxLength)];
}

function uniqueConsecutive(lines: string[]) {
  const result: string[] = [];
  lines.forEach((line) => {
    if (line && line !== result[result.length - 1]) result.push(line);
  });
  return result;
}

function color(value: PdfColor) {
  return value.map((channel) => num(channel)).join(" ");
}

function num(value: number) {
  return Number(value.toFixed(3)).toString();
}

function buildPdfFile(objects: string[]) {
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function pdfEscape(value: string) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function cleanPdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeFileName(value: string) {
  return cleanPdfText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "careos-page";
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function todayInAppTimeZone() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function setSessionMarker(role: UserRole) {
  if (typeof document === "undefined") return;
  document.cookie = `careos-client-session=active; path=/; max-age=${Math.floor(inactivityLimitMs / 1000)}; SameSite=Lax`;
  document.cookie = `careos-client-role=${encodeURIComponent(role)}; path=/; max-age=${Math.floor(inactivityLimitMs / 1000)}; SameSite=Lax`;
}

function clearSessionMarker() {
  if (typeof document === "undefined") return;
  document.cookie = "careos-client-session=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "careos-client-role=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "careos-session=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "careos-role=; path=/; max-age=0; SameSite=Lax";
}

type NavItem = (typeof navItems)[number];

const navGroupDefinitions = [
  { label: "Dashboard", hrefs: ["/dashboard"] },
  { label: "Participants", hrefs: ["/participants", "/participant-goals", "/care-plans", "/medications", "/risk-assessments", "/checklists", "/family-portal"] },
  { label: "Workforce", hrefs: ["/support-workers", "/training-records", "/admin/users", "/worker-portal", "/my-shifts", "/travel", "/profile"] },
  { label: "Rostering", hrefs: ["/rostering", "/participant-matching", "/timesheets", "/payroll"] },
  { label: "Service Delivery", hrefs: ["/progress-notes", "/incident-reports", "/support-coordination", "/tasks", "/messages", "/visitors", "/vehicles"] },
  { label: "Finance", hrefs: ["/invoices", "/funding", "/service-agreements"] },
  { label: "Reports", hrefs: ["/admin/compliance", "/admin/audit", "/admin/reminders"] },
  { label: "Documents", hrefs: ["/documents", "/shift-attachments"] },
  { label: "Administration", hrefs: ["/branches", "/admin/backups", "/settings"] }
];

function groupNavigation(items: NavItem[], pathname: string) {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const used = new Set<string>();
  const groups = navGroupDefinitions
    .map((definition) => {
      const groupItems = definition.hrefs.map((href) => byHref.get(href)).filter((item): item is NavItem => Boolean(item));
      groupItems.forEach((item) => used.add(item.href));
      const active = groupItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
      return {
        label: definition.label,
        href: groupItems[0]?.href,
        icon: groupItems[0]?.icon ?? navItems[0].icon,
        active,
        items: groupItems
      };
    })
    .filter((group) => group.items.length > 0);

  const leftover = items.filter((item) => !used.has(item.href));
  if (leftover.length) {
    groups.push({
      label: "More",
      href: leftover[0].href,
      icon: leftover[0].icon,
      active: leftover.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
      items: leftover
    });
  }

  return groups;
}
