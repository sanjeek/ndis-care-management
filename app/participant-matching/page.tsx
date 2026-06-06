"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Search, Users, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type MatchResult = {
  name: string;
  email: string;
  score: number;
  reasons: string[];
};

type ParticipantOption = { name: string };

export default function Page() {
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [notice, setNotice] = useState("Select a participant and shift time to find the best available workers.");
  const [busy, setBusy] = useState(false);

  const loadParticipants = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("participants").select("name").order("name", { ascending: true });
    setParticipants((data ?? []) as ParticipantOption[]);
  }, []);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  async function findMatches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMatches([]);

    const form = new FormData(event.currentTarget);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before searching.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/shifts/match", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        participant_name: String(form.get("participant") ?? ""),
        starts_at: String(form.get("starts_at") ?? ""),
        ends_at: String(form.get("ends_at") ?? ""),
        location: String(form.get("location") ?? "")
      })
    });

    const result = await response.json().catch(() => ({ message: "Matching failed." }));
    setNotice(result.message);
    setMatches(result.matches ?? []);
    setBusy(false);
  }

  return (
    <AppShell title="Worker Matching" eyebrow={notice}>
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-gumleaf" />
            <h2 className="font-semibold text-ink">Find available workers</h2>
          </div>
          <p className="mb-4 text-sm leading-6 text-slate-600">
            Enter shift details to score all support workers by availability, compliance, and qualification fit.
          </p>
          <form onSubmit={findMatches} className="grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Participant</span>
              <select name="participant" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                <option value="">Select participant</option>
                {participants.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Shift start</span>
                <input name="starts_at" type="datetime-local" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Shift end</span>
                <input name="ends_at" type="datetime-local" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
              </label>
            </div>
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Location <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="location" type="text" placeholder="Suburb or service location" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d625d] disabled:opacity-60"
            >
              <Users className="h-4 w-4" />
              {busy ? "Searching…" : "Find matching workers"}
            </button>
          </form>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gumleaf" />
            <h2 className="font-semibold text-ink">Match results</h2>
            {matches.length > 0 && (
              <span className="ml-auto rounded-full bg-gumleaf/10 px-2.5 py-0.5 text-xs font-semibold text-gumleaf">
                {matches.length} worker{matches.length !== 1 ? "s" : ""} scored
              </span>
            )}
          </div>

          {matches.length === 0 ? (
            <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {busy ? "Scoring workers…" : "Results will appear after you run a match."}
            </p>
          ) : (
            <div className="grid gap-3">
              {matches.map((match, index) => (
                <article key={match.email} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${scoreBg(match.score)}`}>
                        {match.score}
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{match.name}</p>
                        <p className="text-xs text-slate-500">{match.email}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreLabel(match.score)}`}>
                      {index === 0 ? "Best match" : match.score >= 80 ? "Good fit" : match.score >= 50 ? "Available" : "Conflicts"}
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-1.5">
                    {match.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                        {reasonIcon(reason)}
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-gumleaf";
  if (score >= 50) return "bg-banksia";
  return "bg-coral";
}

function scoreLabel(score: number) {
  if (score >= 80) return "bg-gumleaf/10 text-gumleaf";
  if (score >= 50) return "bg-banksia/10 text-banksia";
  return "bg-coral/10 text-coral";
}

function reasonIcon(reason: string) {
  const lower = reason.toLowerCase();
  if (lower.includes("conflict") || lower.includes("unavailable") || lower.includes("warning") || lower.includes("blocked")) {
    return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />;
  }
  if (lower.includes("blocked")) {
    return <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />;
  }
  return <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gumleaf" />;
}
