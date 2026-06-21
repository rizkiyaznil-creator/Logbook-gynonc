import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewEntry } from "@/app/(app)/logbook/actions";
import type { EntryType } from "@/lib/types";

type Row = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  surgical_role: string | null;
  figo_stage: string | null;
  catatan: string | null;
  residents: { profiles: { full_name: string } | null } | null;
  procedures: { kode: string; nama: string } | null;
  clinical_competencies: { kode: string; komponen: string } | null;
};

export default async function VerifikasiPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("log_entries")
    .select(
      "id, entry_date, entry_type, surgical_role, figo_stage, catatan, residents(profiles(full_name)), procedures(kode,nama), clinical_competencies(kode,komponen)",
    )
    .eq("status", "diajukan")
    .order("entry_date");

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">
        Antrean Verifikasi
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
          {rows.length}
        </span>
      </h1>

      {rows.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
          Tidak ada entri yang menunggu verifikasi.
        </p>
      )}

      <div className="space-y-4">
        {rows.map((r) => {
          const nama = r.residents?.profiles?.full_name ?? "Residen";
          const komp =
            r.procedures?.kode ?? r.clinical_competencies?.kode ?? "";
          const judul =
            r.procedures?.nama ??
            r.clinical_competencies?.komponen ??
            "Kasus klinis";
          return (
            <div
              key={r.id}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    <span className="font-mono text-xs text-slate-500">
                      {komp}
                    </span>{" "}
                    {judul}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {nama} · {r.entry_date}
                    {r.surgical_role ? ` · ${r.surgical_role}` : ""}
                    {r.figo_stage ? ` · FIGO ${r.figo_stage}` : ""}
                  </div>
                  {r.catatan && (
                    <p className="mt-2 text-sm text-slate-600">{r.catatan}</p>
                  )}
                </div>
              </div>

              <form action={reviewEntry} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="entry_id" value={r.id} />
                <input
                  name="verifier_note"
                  placeholder="Catatan (opsional)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  name="keputusan"
                  value="diverifikasi"
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Verifikasi
                </button>
                <button
                  name="keputusan"
                  value="revisi"
                  className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50"
                >
                  Minta revisi
                </button>
                <button
                  name="keputusan"
                  value="ditolak"
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Tolak
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
