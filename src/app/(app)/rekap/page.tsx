import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type EntryRow = {
  status: string;
  rumah_sakit: string | null;
  supervisor_id: string | null;
};

type Agg = { key: string; label: string; total: number; verified: number };

function aggregate(
  rows: EntryRow[],
  pick: (r: EntryRow) => string | null,
  labelOf: (key: string) => string,
): Agg[] {
  const map = new Map<string, { total: number; verified: number }>();
  for (const r of rows) {
    const k = pick(r) ?? "—";
    const cur = map.get(k) ?? { total: 0, verified: 0 };
    cur.total += 1;
    if (r.status === "diverifikasi") cur.verified += 1;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, label: labelOf(key), ...v }))
    .sort((a, b) => b.total - a.total);
}

function Tabel({
  title,
  kolom,
  rows,
}: {
  title: string;
  kolom: string;
  rows: Agg[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{kolom}</th>
              <th className="px-4 py-2 text-right">Total Entri</th>
              <th className="px-4 py-2 text-right">Terverifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Belum ada data.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-4 py-2 text-slate-700">{r.label}</td>
                <td className="px-4 py-2 text-right text-slate-600">
                  {r.total}
                </td>
                <td className="px-4 py-2 text-right text-teal-700">
                  {r.verified}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function RekapPage() {
  const me = await requireProfile();
  if (!["kps", "admin"].includes(me.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [entryRes, supRes] = await Promise.all([
    supabase.from("log_entries").select("status, rumah_sakit, supervisor_id"),
    supabase.from("profiles").select("id, full_name").eq("role", "supervisor"),
  ]);

  const rows = (entryRes.data ?? []) as EntryRow[];
  const nameMap = new Map(
    ((supRes.data ?? []) as { id: string; full_name: string }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  const perRS = aggregate(rows, (r) => r.rumah_sakit, (k) => k);
  const perDPJP = aggregate(
    rows,
    (r) => r.supervisor_id,
    (k) => (k === "—" ? "(tanpa DPJP)" : nameMap.get(k) ?? "DPJP"),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800">
        Rekap Kegiatan
        <span className="ml-2 text-sm font-normal text-slate-400">
          {rows.length} entri total
        </span>
      </h1>
      <Tabel title="Per Rumah Sakit" kolom="Rumah Sakit" rows={perRS} />
      <Tabel title="Per DPJP" kolom="DPJP" rows={perDPJP} />
    </div>
  );
}
