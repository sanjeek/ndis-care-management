"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export function UnauthorisedPage() {
  return (
    <AppShell title="Unauthorised" eyebrow="Access restricted" hidePdf>
      <section className="mx-auto max-w-2xl rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-coral/10 text-coral">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink">You do not have permission to access this page.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account role does not include access to the page you requested.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/worker-portal" className="rounded bg-gumleaf px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d625d]">
            Worker Portal
          </Link>
          <Link href="/profile" className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            View Profile
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
