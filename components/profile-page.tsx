"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { friendlyRole, normalizeRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Profile = {
  email: string;
  name: string;
  organisation: string;
  role: string;
  id: string;
};

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    email: "",
    name: "Guest user",
    organisation: "Not set",
    role: "Not set",
    id: ""
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setProfile({
        email: user?.email ?? "No active session",
        name: String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Guest user"),
        organisation: String(user?.user_metadata?.organisation ?? "Not set"),
        role: normalizeRole(user?.user_metadata?.role),
        id: user?.id ?? "Not signed in"
      });
    });
  }, []);

  return (
    <AppShell title="Profile" eyebrow="Account, role, and portal access">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gumleaf text-xl font-bold text-white">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">{profile.name}</h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <ProfileRow icon={Mail} label="Email" value={profile.email} />
            <ProfileRow icon={ShieldCheck} label="Role" value={friendlyRole(profile.role)} />
            <ProfileRow icon={UserCircle} label="User ID" value={profile.id} />
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Provider details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoCard title="Organisation" value={profile.organisation} />
            <InfoCard title="Portal access" value={profile.role === "support_worker" ? "Worker portal, assigned shifts, notes, and incidents" : "All provider pages"} />
            <InfoCard title="Authentication" value="Supabase Auth" />
            <InfoCard title="Session" value={profile.email === "No active session" ? "Not signed in" : "Active"} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-gumleaf" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{value}</p>
    </article>
  );
}
