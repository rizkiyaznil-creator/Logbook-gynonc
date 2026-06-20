import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import type { EntryStatus, EntryType } from "@/lib/types";

type Row = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  status: EntryStatus;
  figo_stage: string | null;
  procedures: { kode: string; nama: string } | null;
  clinical_competencies: { kode: string; komponen: string } | null;
  diseases: { nama_id: string } | null;
};

export default async function LogbookPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("log_entries")
    .select(
      "id, entry_date, entry_type, status, figo_stage, procedures(kode,nama), clinical_competencies(kode,komponen), diseases(nama_id)",
    )
    .order("entry_date", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Logbook Saya</h1>
        <Link
          href="/logbook/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Entri Baru
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Tanggal</th>
              <th className="px-4 py-2">Jenis</th>
              <th className="px-4 py-2">Kompetensi</th>
              <th className="px-4 py-2">Diagnosis</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Belum ada entri. Mulai dengan “+ Entri Baru”.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const komp =
                r.procedures?.kode ?? r.clinical_competencies?.kode ?? "—";
              const nama =
                r.procedures?.nama ??
                r.clinical_competencies?.komponen ??
                (r.entry_type === "kasus" ? "Kasus klinis" : "—");
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-600">{r.entry_date}</td>
                  <td className="px-4 py-2 text-slate-500">{r.entry_type}</td>
                  <td className="px-4 py-2 text-slate-700">
                    <span className="font-mono text-xs text-slate-500">
                      {komp}
                    </span>{" "}
                    {nama}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.diseases?.nama_id ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
