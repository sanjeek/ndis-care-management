import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  tone: string;
  icon: LucideIcon;
};

const toneClasses: Record<string, string> = {
  gumleaf: "bg-gumleaf/10 text-gumleaf",
  harbour: "bg-harbour/10 text-harbour",
  banksia: "bg-banksia/15 text-banksia",
  coral: "bg-coral/10 text-coral"
};

export function StatCard({ label, value, delta, tone, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
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
