export type BarRow = {
  label: string;
  value: number;
  /** Teks nilai yang ditampilkan (default: value) */
  display?: string;
  /** kelas warna bar, mis. "bg-blue-500" */
  color?: string;
};

export function BarList({
  rows,
  max,
  empty = "Belum ada data.",
}: {
  rows: BarRow[];
  /** nilai maksimum untuk skala (default: nilai terbesar) */
  max?: number;
  empty?: string;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">
        {empty}
      </p>
    );
  }
  return (
    <div className="space-y-2.5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-44 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300">
            {r.label}
          </div>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${r.color ?? "bg-teal-500"}`}
              style={{ width: `${Math.min(100, (r.value / top) * 100)}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-sm font-medium text-slate-700 dark:text-slate-200">
            {r.display ?? r.value}
          </div>
        </div>
      ))}
    </div>
  );
}
