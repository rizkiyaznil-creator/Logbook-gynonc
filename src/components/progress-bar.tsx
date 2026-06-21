export function ProgressBar({
  value,
  achieved,
}: {
  value: number;
  achieved?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color = achieved
    ? "from-teal-500 to-emerald-500"
    : pct >= 60
      ? "from-amber-500 to-yellow-400"
      : "from-rose-500 to-rose-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
