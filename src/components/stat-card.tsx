import type { ReactNode } from "react";

export type StatColor = "blue" | "violet" | "amber" | "emerald";

const THEME: Record<
  StatColor,
  { ring: string; icon: string; bar: string; value: string }
> = {
  blue: {
    ring: "ring-blue-200",
    icon: "bg-blue-100 text-blue-600",
    bar: "from-blue-500 to-blue-400",
    value: "text-blue-700",
  },
  violet: {
    ring: "ring-violet-200",
    icon: "bg-violet-100 text-violet-600",
    bar: "from-violet-500 to-violet-400",
    value: "text-violet-700",
  },
  amber: {
    ring: "ring-amber-200",
    icon: "bg-amber-100 text-amber-600",
    bar: "from-amber-500 to-amber-400",
    value: "text-amber-700",
  },
  emerald: {
    ring: "ring-emerald-200",
    icon: "bg-emerald-100 text-emerald-600",
    bar: "from-emerald-500 to-emerald-400",
    value: "text-emerald-700",
  },
};

export function StatCard({
  label,
  achieved,
  total,
  color = "blue",
  icon,
}: {
  label: string;
  achieved: number;
  total: number;
  color?: StatColor;
  icon?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
  const t = THEME[color];
  return (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ring-1 transition-shadow hover:shadow-md ${t.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm text-slate-500">{label}</div>
        {icon && (
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg ${t.icon}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-1 text-2xl font-bold ${t.value}`}>
        {achieved}
        <span className="text-base font-normal text-slate-400"> / {total}</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${t.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-400">{pct}% tercapai</div>
    </div>
  );
}
