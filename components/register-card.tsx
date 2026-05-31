"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { CopyrightFooter } from "@/components/copyright-footer";

export function RegisterCard() {
  const [message, setMessage] = useState("Create a provider account for your team.");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);

    const response = await fetch("/api/register-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        organisation: String(form.get("organisation")),
        email: String(form.get("email")),
        password: String(form.get("password"))
      })
    });
    const result = await response.json();

    setMessage(result.message ?? (response.ok ? "Account created. You can now sign in." : "Registration failed."));
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-[36vh] items-end overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(23,32,51,0.86),rgba(35,117,111,0.86)),url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="relative max-w-xl">
          <ShieldCheck className="mb-5 h-12 w-12" />
          <h1 className="text-4xl font-semibold sm:text-5xl">CareOS NDIS</h1>
          <p className="mt-4 text-lg leading-8 text-white/84">Coordinate participant care, staff compliance, shifts, and billing from one calm workspace.</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <p className="text-sm font-semibold text-gumleaf">Register</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Create account</h2>
          <p className="mt-3 text-sm text-slate-600">{message}</p>

          <div className="mt-8 grid gap-4">
            <Input icon={UserRound} name="name" label="Full name" placeholder="Priya Coordinator" />
            <Input icon={Building2} name="organisation" label="Provider name" placeholder="Bright Path Supports" />
            <Input icon={Mail} name="email" label="Email address" type="email" placeholder="admin@provider.com.au" />
            <PasswordInput show={showPassword} setShow={setShowPassword} />
          </div>

          <button className="mt-6 w-full rounded bg-gumleaf px-4 py-3 font-semibold text-white hover:bg-[#1d625d]" disabled={loading}>
            {loading ? "Creating account..." : "Register user"}
          </button>

          <div className="mt-5 flex justify-between text-sm">
            <Link className="font-semibold text-gumleaf hover:text-ink" href="/">
              Back to sign in
            </Link>
            <Link className="font-semibold text-ink hover:text-gumleaf" href="/dashboard">
              Dashboard
            </Link>
          </div>
          <CopyrightFooter />
        </form>
      </section>
    </main>
  );
}

function PasswordInput({ show, setShow }: { show: boolean; setShow: (show: boolean) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
      <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
        <LockKeyhole className="h-5 w-5 text-slate-400" />
        <input name="password" type={show ? "text" : "password"} required placeholder="Create password" className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400" />
        <button type="button" className="text-slate-400 hover:text-gumleaf" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

function Input({
  icon: Icon,
  name,
  label,
  placeholder,
  type = "text"
}: {
  icon: typeof Mail;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-gumleaf focus-within:ring-2 focus-within:ring-gumleaf/15">
        <Icon className="h-5 w-5 text-slate-400" />
        <input name={name} type={type} required placeholder={placeholder} className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-slate-400" />
      </span>
    </label>
  );
}
