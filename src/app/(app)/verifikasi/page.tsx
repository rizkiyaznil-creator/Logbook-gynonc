import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewEntry } from "@/app/(app)/logbook/actions";
import { reviewWork } from "@/app/(app)/karya/actions";
import { JENIS_LABEL, TAHAP_LABEL } from "@/components/academic-form";
import { accentHex } from "@/lib/program";
import type { AcademicWork, EntryType, ProgramConfig } from "@/lib/types";

type ProgramRef = { nama: string; kode: string; config: ProgramConfig | null };

type Row = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  surgical_role: string | null;
  figo_stage: string | null;
  rumah_sakit: string | null;
  catatan: string | null;
  evidence_url: string | null;
  residents: { profiles: { full_name: string } | null } | null;
  procedures: { kode: string; nama: string } | null;
  clinical_competencies: { kode: string; komponen: string } | null;
  programs: ProgramRef | null;
};

/** Badge nama program (antrean gabungan lintas program berlabel). */
function ProgramBadge({ program }: { program: ProgramRef | null }) {
  if (!program) return null;
  const color = accentHex(program.config?.accent);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
      title={program.nama}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {program.nama}
    </span>
  );
}

export default async function VerifikasiPage() {
  const profile = await requireProfile();
  // Admin Prodi: memantau antrean secara read-only (tanpa tombol keputusan).
  const canDecide = profile.role !== "admin_prodi";
  const supabase = await createClient();

  const [{ data }, { data: workData }] = await Promise.all([
    supabase
      .from("log_entries")
      .select(
        "id, entry_date, entry_type, surgical_role, figo_stage, rumah_sakit, catatan, evidence_url, residents(profiles(full_name)), procedures(kode,nama), clinical_competencies(kode,komponen), programs(nama,kode,config)",
      )
      .eq("status", "diajukan")
      .order("entry_date"),
    supabase
      .from("academic_works")
      .select(
        "id, jenis, tahap, judul, tanggal, evidence_url, catatan, resident_id, profiles!academic_works_resident_id_fkey(full_name), programs(nama,kode,config)",
      )
      .eq("status", "diajukan")
      .order("tanggal"),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const works = (workData ?? []) as unknown as (AcademicWork & {
    profiles: { full_name: string } | null;
    programs: ProgramRef | null;
  })[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Antrean Verifikasi
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
          {rows.length}
        </span>
      </h1>

      {!canDecide && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-800">
          Mode Admin Prodi (read-only): Anda dapat memantau antrean, tetapi tidak
          dapat memberi keputusan verifikasi.
        </p>
      )}

      {rows.length === 0 && (
        <p className="rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-slate-400 dark:text-slate-500 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
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
              className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-1.5">
                    <ProgramBadge program={r.programs} />
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {komp}
                    </span>{" "}
                    {judul}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {nama} · {r.entry_date}
                    {r.rumah_sakit ? ` · ${r.rumah_sakit}` : ""}
                    {r.surgical_role ? ` · ${r.surgical_role}` : ""}
                    {/* FIGO hanya bila program entri mengaktifkannya. */}
                    {(r.programs?.config?.figo_enabled ?? true) && r.figo_stage
                      ? ` · FIGO ${r.figo_stage}`
                      : ""}
                  </div>
                  {r.catatan && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.catatan}</p>
                  )}
                  {r.evidence_url && (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Lihat bukti ↗
                    </a>
                  )}
                </div>
              </div>

              {canDecide && (
              <form action={reviewEntry} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="entry_id" value={r.id} />
                <input
                  name="verifier_note"
                  placeholder="Catatan (opsional)"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm"
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
              )}
            </div>
          );
        })}
      </div>

      {/* Karya ilmiah menunggu verifikasi */}
      <div className="pt-2">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Karya Ilmiah Menunggu
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {works.length}
          </span>
        </h2>
        {works.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">
            Tidak ada karya ilmiah menunggu verifikasi.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {works.map((w) => (
              <div
                key={w.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="mb-1.5">
                  <ProgramBadge program={w.programs} />
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {JENIS_LABEL[w.jenis]}
                    {w.tahap ? ` · ${TAHAP_LABEL[w.tahap]}` : ""}
                  </span>{" "}
                  {w.judul}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {w.profiles?.full_name ?? "Residen"}
                  {w.tanggal ? ` · ${w.tanggal}` : ""}
                </div>
                {w.catatan && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {w.catatan}
                  </p>
                )}
                {w.evidence_url && (
                  <a
                    href={w.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Lihat berkas ↗
                  </a>
                )}
                {canDecide && (
                <form action={reviewWork} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="work_id" value={w.id} />
                  <input
                    name="verifier_note"
                    placeholder="Catatan (opsional)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-500/10"
                  >
                    Minta revisi
                  </button>
                  <button
                    name="keputusan"
                    value="ditolak"
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    Tolak
                  </button>
                </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
