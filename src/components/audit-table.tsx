"use client";

import { useMemo, useState } from "react";

export type AuditRow = {
  id: number;
  created_at: string;
  actor_name: string | null;
  action: string;
  entity: string;
  summary: string | null;
};

const ACTION_STYLE: Record<string, string> = {
  entri_dibuat: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  entri_diajukan:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  entri_diverifikasi:
    "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  entri_revisi:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  entri_ditolak:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  entri_dihapus:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  peran_diubah:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  user_dinonaktifkan:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  user_diaktifkan:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

function actionLabel(a: string) {
  return a.replace(/_/g, " ");
}

const selCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const actions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (action && r.action !== action) return false;
      if (needle) {
        const hay = `${r.actor_name ?? ""} ${r.summary ?? ""} ${
          r.action
        }`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, action]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari pelaku / ringkasan…"
          className={`${selCls} min-w-48 flex-1`}
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className={selCls}
        >
          <option value="">Semua aksi</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-slate-400 dark:text-slate-500">
        Menampilkan {filtered.length} dari {rows.length} aktivitas
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2.5 whitespace-nowrap">Waktu</th>
              <th className="px-4 py-2.5">Pelaku</th>
              <th className="px-4 py-2.5">Aksi</th>
              <th className="px-4 py-2.5">Ringkasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  Tidak ada aktivitas.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  {r.actor_name ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ACTION_STYLE[r.action] ??
                      "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {actionLabel(r.action)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {r.summary ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
