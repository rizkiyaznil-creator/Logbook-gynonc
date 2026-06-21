import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TableCard } from "@/components/table-card";
import {
  AssessmentForm,
  type ResidentOption,
  type KnowledgeOption,
} from "@/components/assessment-form";

type RecentRow = {
  id: string;
  exam_type: string;
  score: number;
  max_score: number;
  persen: number;
  exam_date: string;
  residents: { profiles: { full_name: string } | null } | null;
  knowledge_items: { kode: string; topik: string } | null;
};

export default async function PenilaianPage() {
  const profile = await requireProfile();
  if (!["penguji", "kps", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [resRes, itemRes, recentRes] = await Promise.all([
    supabase
      .from("residents")
      .select("id, no_peserta, profiles(full_name)")
      .order("no_peserta"),
    supabase.from("knowledge_items").select("id, kode, topik, kategori").order("kode"),
    supabase
      .from("assessments")
      .select(
        "id, exam_type, score, max_score, persen, exam_date, residents(profiles(full_name)), knowledge_items(kode,topik)",
      )
      .order("exam_date", { ascending: false })
      .limit(20),
  ]);

  const residents: ResidentOption[] = (
    (resRes.data ?? []) as unknown as {
      id: string;
      no_peserta: string | null;
      profiles: { full_name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    no_peserta: r.no_peserta,
    nama: r.profiles?.full_name ?? "—",
  }));

  const items = (itemRes.data ?? []) as KnowledgeOption[];
  const recent = (recentRes.data ?? []) as unknown as RecentRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Input Nilai Pengetahuan (OSCE / MCQ)
      </h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <AssessmentForm residents={residents} items={items} />

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nilai Terbaru
          </h2>
          <TableCard>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Residen</th>
                  <th className="px-3 py-2">Butir</th>
                  <th className="px-3 py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                      Belum ada nilai.
                    </td>
                  </tr>
                )}
                {recent.map((a) => {
                  const lulus = a.persen >= 70;
                  return (
                    <tr key={a.id}>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{a.exam_date}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {a.residents?.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {a.knowledge_items?.kode}
                        </span>{" "}
                        <span className="uppercase text-xs text-slate-400 dark:text-slate-500">
                          {a.exam_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={lulus ? "text-teal-700" : "text-rose-600"}
                        >
                          {a.persen}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </section>
      </div>
    </div>
  );
}
