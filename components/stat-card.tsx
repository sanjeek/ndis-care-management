import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  tone: string;
  icon: LucideIcon;
};

const toneClasses: Record<string, string> = {
  gumleaf: "bg-indigo-50 text-gumleaf ring-1 ring-indigo-100",
  harbour: "bg-sky-50 text-harbour ring-1 ring-sky-100",
  banksia: "bg-amber-50 text-banksia ring-1 ring-amber-100",
  coral: "bg-rose-50 text-coral ring-1 ring-rose-100"
};

export function StatCard({ label, value, delta, tone, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-lg border border-indigo-100/80 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-600">{delta}</p>
    </article>
  );
}
