import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { JENIS_LABEL, TAHAP_LABEL, TINGKAT_LABEL } from "@/components/academic-form";
import { TableCard } from "@/components/table-card";
import type { AcademicWork, CoAuthor } from "@/lib/types";

function coAuthorText(list: CoAuthor[]): string {
  return list.map((c) => c.nama + (c.korespondensi ? "*" : "")).join(", ");
}

export async function AcademicSummary({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_works")
    .select(
      "id, jenis, tahap, judul, tanggal, status, verifier_note, tingkat, pembimbing2, penguji, co_authors",
    )
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });

  const works = (data ?? []) as AcademicWork[];
  if (works.length === 0) return null;

  const karya = works.filter((w) => w.jenis !== "tesis");
  const tesis = works
    .filter((w) => w.jenis === "tesis")
    .sort((a, b) =>
      Object.keys(TAHAP_LABEL).indexOf(a.tahap ?? "") -
      Object.keys(TAHAP_LABEL).indexOf(b.tahap ?? ""),
    );

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="h-4 w-1.5 rounded-full bg-fuchsia-500" />
        Karya &amp; Kegiatan Ilmiah
      </h2>
      <TableCard>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Jenis</th>
              <th className="px-4 py-2">Judul</th>
              <th className="px-4 py-2">Tanggal</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {karya.map((w) => (
              <tr key={w.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                  {JENIS_LABEL[w.jenis]}
                  {w.tingkat ? ` · ${TINGKAT_LABEL[w.tingkat]}` : ""}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  {w.judul}
                  {w.co_authors && w.co_authors.length > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Co-author: {coAuthorText(w.co_authors)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {w.tanggal ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <StatusBadge status={w.status} />
                </td>
              </tr>
            ))}
            {tesis.map((w) => (
              <tr key={w.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                  Tesis · {TAHAP_LABEL[w.tahap ?? ""] ?? ""}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  {w.judul}
                  {w.pembimbing2 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Pembimbing 2: {w.pembimbing2}
                    </div>
                  )}
                  {w.penguji && (
                    <div className="whitespace-pre-line text-xs text-slate-400 dark:text-slate-500">
                      Penguji: {w.penguji}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {w.tanggal ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <StatusBadge status={w.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </section>
  );
}
