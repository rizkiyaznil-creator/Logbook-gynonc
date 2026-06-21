import { createClient } from "@/lib/supabase/server";

type Row = {
  disease_id: string;
  no: number;
  nama_id: string;
  jumlah: number;
  pernah_ditangani: boolean;
};

export async function DiseaseCoverage({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_disease_coverage")
    .select("*")
    .eq("resident_id", residentId)
    .order("no");

  const rows = (data ?? []) as Row[];
  const tercakup = rows.filter((r) => r.pernah_ditangani).length;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="h-4 w-1.5 rounded-full bg-emerald-500" />
        Spektrum Penyakit (Tabel 10) — {tercakup}/{rows.length} tercakup
      </h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 w-10">No</th>
              <th className="px-4 py-2">Penyakit</th>
              <th className="px-4 py-2 text-center w-24">Jumlah</th>
              <th className="px-4 py-2 text-right w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr
                key={r.disease_id}
                className={
                  r.pernah_ditangani ? "" : "bg-slate-50/40 dark:bg-slate-800/30"
                }
              >
                <td className="px-4 py-2 text-slate-400 dark:text-slate-500">
                  {r.no}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  {r.nama_id}
                </td>
                <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-300">
                  {r.jumlah}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.pernah_ditangani ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                      Tercakup
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400 dark:bg-slate-700 dark:text-slate-400">
                      Belum
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
