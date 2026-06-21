import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import type { EntryStatus, EntryType } from "@/lib/types";

type Row = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  status: EntryStatus;
  rumah_sakit: string | null;
  supervisor_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verifier_note: string | null;
  procedures: { kode: string; nama: string } | null;
  clinical_competencies: { kode: string; komponen: string } | null;
};

export default async function LogbookPage() {
  const supabase = await createClient();

  const [entryRes, supRes] = await Promise.all([
    supabase
      .from("log_entries")
      .select(
        "id, entry_date, entry_type, status, rumah_sakit, supervisor_id, verified_by, verified_at, verifier_note, procedures(kode,nama), clinical_competencies(kode,komponen)",
      )
      .order("entry_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["supervisor", "kps", "admin"]),
  ]);

  const rows = (entryRes.data ?? []) as unknown as Row[];
  const nameMap = new Map(
    ((supRes.data ?? []) as { id: string; full_name: string }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

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
              <th className="px-4 py-2">Kompetensi</th>
              <th className="px-4 py-2">Rumah Sakit</th>
              <th className="px-4 py-2">DPJP</th>
              <th className="px-4 py-2">Status &amp; Verifikasi</th>
              <th className="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
              const dpjp = r.supervisor_id
                ? nameMap.get(r.supervisor_id) ?? "DPJP"
                : "—";
              const verifier = r.verified_by
                ? nameMap.get(r.verified_by) ?? "—"
                : null;
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-2 text-slate-600">{r.entry_date}</td>
                  <td className="px-4 py-2 text-slate-700">
                    <span className="font-mono text-xs text-slate-500">
                      {komp}
                    </span>{" "}
                    {nama}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.rumah_sakit ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{dpjp}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                    {r.verified_at && (
                      <div className="mt-1 text-xs text-slate-400">
                        {new Date(r.verified_at).toLocaleDateString("id-ID")}
                        {verifier ? ` · oleh ${verifier}` : ""}
                      </div>
                    )}
                    {r.verifier_note && (
                      <div className="mt-1 text-xs italic text-orange-600">
                        “{r.verifier_note}”
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(r.status === "draft" || r.status === "revisi") && (
                      <Link
                        href={`/logbook/${r.id}/edit`}
                        className="text-teal-700 hover:underline"
                      >
                        Sunting
                      </Link>
                    )}
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
