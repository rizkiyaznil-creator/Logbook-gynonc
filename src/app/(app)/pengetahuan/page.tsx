import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TableCard } from "@/components/table-card";

type KRow = {
  knowledge_item_id: string;
  kode: string;
  topik: string;
  kategori: string;
  nilai_osce: number | null;
  nilai_mcq: number | null;
  osce_min: number;
  mcq_min: number;
  lulus: boolean;
};

function Cell({ nilai, min }: { nilai: number | null; min: number }) {
  if (nilai === null) return <span className="text-slate-300">—</span>;
  const ok = nilai >= min;
  return (
    <span className={ok ? "text-teal-700" : "text-rose-600"}>{nilai}%</span>
  );
}

function Tabel({ title, rows }: { title: string; rows: KRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      <TableCard>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Topik</th>
              <th className="px-4 py-2 text-center">OSCE</th>
              <th className="px-4 py-2 text-center">MCQ</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.knowledge_item_id}>
                <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {r.kode}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.topik}</td>
                <td className="px-4 py-2 text-center">
                  <Cell nilai={r.nilai_osce} min={r.osce_min} />
                </td>
                <td className="px-4 py-2 text-center">
                  <Cell nilai={r.nilai_mcq} min={r.mcq_min} />
                </td>
                <td className="px-4 py-2 text-right">
                  {r.lulus ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">
                      Lulus
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Belum
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </section>
  );
}

export default async function PengetahuanPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_knowledge_progress")
    .select("*")
    .eq("resident_id", profile.id)
    .order("kode");

  const rows = (data ?? []) as KRow[];
  const penatalaksanaan = rows.filter((r) => r.kategori === "penatalaksanaan");
  const prosedur = rows.filter((r) => r.kategori === "prosedur");

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Penguasaan Pengetahuan (OSCE/MCQ ≥ 70%)
      </h1>
      <Tabel title="Penatalaksanaan (Tabel 30)" rows={penatalaksanaan} />
      <Tabel title="Prosedur (Tabel 36)" rows={prosedur} />
    </div>
  );
}
