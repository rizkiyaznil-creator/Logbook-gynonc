"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { TableCard } from "@/components/table-card";
import type { EntryStatus, EntryType } from "@/lib/types";

export type FlatRow = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  status: EntryStatus;
  rumah_sakit: string | null;
  komp: string;
  nama: string;
  dpjp: string;
  verified_at: string | null;
  verifier: string | null;
  verifier_note: string | null;
  evidence_url: string | null;
};

const TYPE_LABEL: Record<EntryType, string> = {
  prosedur: "Prosedur",
  penatalaksanaan: "Penatalaksanaan",
  kasus: "Kasus",
};

const STATUS_LABEL: Record<EntryStatus, string> = {
  draft: "Draft",
  diajukan: "Menunggu",
  diverifikasi: "Terverifikasi",
  revisi: "Perlu revisi",
  ditolak: "Ditolak",
};

const selCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

export function LogbookTable({ rows }: { rows: FlatRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EntryStatus | "">("");
  const [type, setType] = useState<EntryType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (type && r.entry_type !== type) return false;
      if (from && r.entry_date < from) return false;
      if (to && r.entry_date > to) return false;
      if (needle) {
        const hay = `${r.komp} ${r.nama} ${r.rumah_sakit ?? ""} ${
          r.dpjp
        }`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, status, type, from, to]);

  const hasFilter = q || status || type || from || to;

  function reset() {
    setQ("");
    setStatus("");
    setType("");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kompetensi, RS, DPJP…"
          className={`${selCls} min-w-48 flex-1`}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EntryType | "")}
          className={selCls}
        >
          <option value="">Semua jenis</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as EntryStatus | "")}
          className={selCls}
        >
          <option value="">Semua status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={selCls}
          title="Dari tanggal"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={selCls}
          title="Sampai tanggal"
        />
        {hasFilter && (
          <button
            onClick={reset}
            className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            Reset
          </button>
        )}
      </div>

      <div className="text-xs text-slate-400 dark:text-slate-500">
        Menampilkan {filtered.length} dari {rows.length} entri
      </div>

      <TableCard>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Tanggal</th>
              <th className="px-4 py-2">Kompetensi</th>
              <th className="px-4 py-2">Rumah Sakit</th>
              <th className="px-4 py-2">DPJP</th>
              <th className="px-4 py-2">Status &amp; Verifikasi</th>
              <th className="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  {rows.length === 0
                    ? "Belum ada entri. Mulai dengan “+ Entri Baru”."
                    : "Tidak ada entri yang cocok dengan filter."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.entry_date}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {r.komp}
                  </span>{" "}
                  {r.nama}
                  {r.evidence_url && (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      bukti ↗
                    </a>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.rumah_sakit ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.dpjp}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                  {r.verified_at && (
                    <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {new Date(r.verified_at).toLocaleDateString("id-ID")}
                      {r.verifier ? ` · oleh ${r.verifier}` : ""}
                    </div>
                  )}
                  {r.verifier_note && (
                    <div className="mt-1 text-xs italic text-orange-600 dark:text-orange-400">
                      “{r.verifier_note}”
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {(r.status === "draft" || r.status === "revisi") && (
                    <Link
                      href={`/logbook/${r.id}/edit`}
                      className="text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Sunting
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
