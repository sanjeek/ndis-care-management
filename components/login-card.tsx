"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { canAccessRoute, defaultRouteForRole, roleForUser, type UserRole } from "@/lib/auth";
import { CopyrightFooter } from "@/components/copyright-footer";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("Use your provider account to continue.");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetLockedUntil, setResetLockedUntil] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        let role = roleForUser(data.session.user.user_metadata?.role, data.session.user.email);
        if (!data.session.user.user_metadata?.role) {
          const { data: profile } = await client.from("profiles").select("role").eq("id", data.session.user.id).maybeSingle();
          role = roleForUser(profile?.role, data.session.user.email);
        }
        window.location.replace(getSafeNextPath(role));
      }
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase credentials are not configured yet. Add them to .env.local.");
      setLoading(false);
      return;
    }
    const client = supabase;

    if (forgotMode) {
      if (Date.now() < resetLockedUntil) {
        const seconds = Math.ceil((resetLockedUntil - Date.now()) / 1000);
        setMessage(`Please wait ${seconds} seconds before requesting another reset email.`);
        setLoading(false);
        return;
      }

      const siteUrl = window.location.origin;
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`
      });
      setLoading(false);
      if (error) {
        if (error.message.toLowerCase().includes("rate")) {
          setResetLockedUntil(Date.now() + 60000);
          setMessage("Supabase has temporarily rate-limited reset emails. Please wait 60 seconds, then try again.");
          return;
        }
        setMessage(error.message);
        return;
      }
      setResetLockedUntil(Date.now() + 60000);
      setMessage("Password reset email sent. Check your inbox.");
      return;
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    let role = roleForUser(data.user?.user_metadata?.role, data.user?.email);
    if (!data.user?.user_metadata?.role && data.user?.id) {
      const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      role = roleForUser(profile?.role, data.user.email);
    }
    setMessage("Login successful. Redirecting...");
    window.location.href = getSafeNextPath(role);
  }

  return (
    <section className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative flex min-h-[44vh] items-end overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(35,117,111,0.88),rgba(23,32,51,0.82)),url('https://images.unsplash.com/photo-1576765608866-5b51046452be?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded bg-white/14 ring-1 ring-white/25">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Australian NDIS provider platform</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">CareOS NDIS</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-white/86">
            Coordinate participant care, staff compliance, shifts, and billing from one calm workspace.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-white/82 sm:grid-cols-3">
            <span>Rostering</span>
            <span>Progress notes</span>
            <span>Incident reporting</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm font-semibold text-gumleaf">CareOS</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">{forgotMode ? "Reset password" : "Sign in"}</h2>
            <p className="mt-3 text-sm text-slate-600">{message}</p>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
            <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
              <Mail className="h-5 w-5 text-slate-400" />
              <input
                className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400"
                type="email"
                placeholder="coordinator@provider.com.au"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>

          {!forgotMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
                <LockKeyhole className="h-5 w-5 text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>
          )}

          <div className="my-5 flex items-center justify-between gap-4 text-sm">
            {!forgotMode && <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-gumleaf focus:ring-gumleaf"
              />
              Remember me
            </label>}
            <button
              className="ml-auto font-medium text-gumleaf hover:text-ink"
              type="button"
              onClick={() => {
                setForgotMode((current) => !current);
                setMessage(forgotMode ? "Use your provider account to continue." : "Enter your email and we will send a reset link.");
              }}
            >
              {forgotMode ? "Back to sign in" : "Forgot password"}
            </button>
          </div>

          <button
            className="flex w-full items-center justify-center rounded bg-gumleaf px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1d625d] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : forgotMode ? "Send reset email" : "Sign in"}
          </button>
          <div className="mt-5 grid gap-3 text-center text-sm">
            <Link className="font-semibold text-gumleaf hover:text-ink" href="/register">
              Register a new provider account
            </Link>
          </div>
          <CopyrightFooter />
        </form>
      </div>
    </section>
  );
}

function getSafeNextPath(role: UserRole = "admin") {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return defaultRouteForRole(role);
  }
  const pathname = next.split(/[?#]/)[0] || "/";
  return canAccessRoute(role, pathname) ? next : defaultRouteForRole(role);
}
