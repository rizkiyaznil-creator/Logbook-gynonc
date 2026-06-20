export function ProgressBar({
  value,
  achieved,
}: {
  value: number;
  achieved?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color = achieved
    ? "bg-teal-600"
    : pct >= 60
      ? "bg-amber-500"
      : "bg-rose-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
