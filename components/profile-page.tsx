"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { friendlyRole, roleForUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Profile = {
  email: string;
  name: string;
  organisation?: string;
  role: string;
  id: string;
};

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      client
        .from("profiles")
        .select("full_name, organisation, role")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data: profileData }) => {
          const role = roleForUser(user.user_metadata?.role ?? profileData?.role, user.email);
          setProfile({
            email: user.email ?? user.id,
            name: String(user.user_metadata?.full_name || profileData?.full_name || user.email || user.id),
            organisation: String(user.user_metadata?.organisation || profileData?.organisation || ""),
            role,
            id: user.id
          });
        });
    });
  }, []);

  return (
    <AppShell title="Profile" eyebrow="Account, role, and portal access">
      {!profile ? (
        <section className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading profile...</section>
      ) : (
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
            {profile.organisation ? <InfoCard title="Organisation" value={profile.organisation} /> : null}
            <InfoCard title="Portal access" value={portalAccess(profile.role)} />
            <InfoCard title="Authentication" value="Supabase Auth" />
          </div>
        </section>
      </div>
      )}
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

function portalAccess(role: string) {
  if (role === "support_worker") return "Worker portal, assigned shifts, notes, and incidents";
  if (role === "team_leader") return "Dashboard, timesheets, and profile";
  if (role === "family") return "Family portal only: participant schedules, goals, notes, and service updates";
  return "All provider pages";
}
