"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function ResetPasswordCard() {
  const [message, setMessage] = useState("Enter a new password for your account.");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase credentials are not configured.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    setMessage(error ? error.message : "Password updated. You can now sign in.");
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-[36vh] items-end overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(23,32,51,0.86),rgba(35,117,111,0.86)),url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="relative max-w-xl">
          <ShieldCheck className="mb-5 h-12 w-12" />
          <h1 className="text-4xl font-semibold sm:text-5xl">CareOS NDIS</h1>
          <p className="mt-4 text-lg leading-8 text-white/84">Secure account recovery for your provider workspace.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <p className="text-sm font-semibold text-gumleaf">Password reset</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Create new password</h2>
          <p className="mt-3 text-sm text-slate-600">{message}</p>

          <div className="mt-8 grid gap-4">
            <PasswordField name="password" label="New password" show={showPassword} setShow={setShowPassword} />
            <PasswordField name="confirm" label="Confirm password" show={showPassword} setShow={setShowPassword} />
          </div>

          <button className="mt-6 w-full rounded bg-gumleaf px-4 py-3 font-semibold text-white hover:bg-[#1d625d]" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
          <Link className="mt-5 inline-flex font-semibold text-gumleaf hover:text-ink" href="/">
            Back to sign in
          </Link>
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
        <input name={name} type={show ? "text" : "password"} required minLength={6} className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400" />
        <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}
