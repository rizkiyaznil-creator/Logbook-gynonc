import { ProgressBar } from "./progress-bar";

export function StatCard({
  label,
  achieved,
  total,
}: {
  label: string;
  achieved: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">
        {achieved}
        <span className="text-base font-normal text-slate-400"> / {total}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={pct} achieved={achieved >= total && total > 0} />
      </div>
      <div className="mt-1 text-xs text-slate-400">{pct}% tercapai</div>
    </div>
  );
}
