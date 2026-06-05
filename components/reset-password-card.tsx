"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { CopyrightFooter } from "@/components/copyright-footer";
import { recordAudit } from "@/lib/audit";
import { clearServerSession } from "@/lib/session-sync";

type RecoveryState = "checking" | "ready" | "invalid" | "complete";

export function ResetPasswordCard() {
  const [message, setMessage] = useState("Checking your secure recovery link.");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      if (!isSupabaseConfigured || !supabase) {
        setRecoveryState("invalid");
        setMessage("Supabase credentials are not configured.");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const type = hash.get("type") || url.searchParams.get("type");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!active) return;
          setRecoveryState("invalid");
          setMessage(error.message);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) {
          if (!active) return;
          setRecoveryState("invalid");
          setMessage(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      const isRecoveryLink = type === "recovery" || Boolean(code || accessToken);
      if (!active) return;

      if (!data.session || !isRecoveryLink) {
        setRecoveryState("invalid");
        setMessage("This password reset link is invalid or has expired. Please request a new reset email.");
        return;
      }

      window.history.replaceState({}, document.title, "/reset-password");
      setRecoveryState("ready");
      setMessage("Enter and confirm your new password.");
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recoveryState !== "ready") return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase credentials are not configured.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    await recordAudit({
      action: "update",
      tableName: "auth.users",
      recordId: data.user?.id,
      recordLabel: data.user?.email ?? "password recovery",
      metadata: { operation: "password_reset_recovery" }
    });
    await supabase.auth.signOut();
    await clearServerSession();
    setLoading(false);
    setRecoveryState("complete");
    setMessage("Password updated. You can now sign in with your new password.");
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-[36vh] items-end overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(23,32,51,0.86),rgba(35,117,111,0.86)),url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="relative max-w-xl">
          <ShieldCheck className="mb-5 h-12 w-12" />
          <h1 className="text-4xl font-semibold sm:text-5xl">CareOS NDIS</h1>
          <p className="mt-4 text-lg leading-8 text-white/84">Secure Supabase Auth recovery for your provider workspace.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <p className="text-sm font-semibold text-gumleaf">Password recovery</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Create new password</h2>
          <p className="mt-3 text-sm text-slate-600">{message}</p>

          {recoveryState === "ready" ? (
            <>
              <div className="mt-8 grid gap-4">
                <PasswordField name="password" label="New password" show={showPassword} setShow={setShowPassword} />
                <PasswordField name="confirm" label="Confirm password" show={showPassword} setShow={setShowPassword} />
              </div>

              <button className="mt-6 w-full rounded border border-[#cfe9e4] bg-[#eef7f5] px-4 py-3 font-semibold text-[#236f69] shadow-[0_10px_24px_rgba(47,125,115,0.10)] transition hover:bg-[#dff0ec] focus:outline-none focus:ring-2 focus:ring-[#2f7d73]/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </>
          ) : recoveryState === "checking" ? (
            <div className="mt-8 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Validating recovery link...</div>
          ) : (
            <div className="mt-8 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {recoveryState === "complete" ? "Your password has been changed." : "Request a fresh password reset email from the sign in page."}
            </div>
          )}

          <Link className="mt-5 inline-flex font-semibold text-[#2f766f] hover:text-ink" href="/login">
            Back to sign in
          </Link>
          <CopyrightFooter />
        </form>
      </section>
    </main>
  );
}

function PasswordField({ name, label, show, setShow }: { name: string; label: string; show: boolean; setShow: (show: boolean) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
        <LockKeyhole className="h-5 w-5 text-slate-400" />
        <input name={name} type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400" />
        <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}
