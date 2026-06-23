"use client";

import { useState } from "react";
import Link from "next/link";
import { ProgramForm } from "@/components/program-form";
import { accentHex } from "@/lib/program";
import type { Program } from "@/lib/types";

export type ProgramWithCounts = Program & {
  residen_count: number;
  prosedur: number;
  penatalaksanaan: number;
  penyakit: number;
  pengetahuan: number;
};

export function ProgramsAdmin({ programs }: { programs: ProgramWithCounts[] }) {
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Program baru
        </button>
      ) : (
        <ProgramForm onDone={() => setCreating(false)} />
      )}

      <div className="grid gap-3">
        {programs.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accentHex(p.config?.accent) }}
                    aria-hidden
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {p.nama}
                  </span>
                  <span className="text-xs text-slate-400">{p.kode}</span>
                  {!p.aktif && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      nonaktif
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {p.residen_count} residen · {p.prosedur} prosedur ·{" "}
                  {p.penatalaksanaan} penatalaksanaan · {p.penyakit} penyakit ·{" "}
                  {p.pengetahuan} pengetahuan
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/kurikulum/${p.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Kelola kurikulum
                </Link>
                <button
                  onClick={() => setEditId(editId === p.id ? null : p.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {editId === p.id ? "Tutup" : "Edit config"}
                </button>
              </div>
            </div>
            {editId === p.id && (
              <div className="mt-3">
                <ProgramForm program={p} onDone={() => setEditId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
