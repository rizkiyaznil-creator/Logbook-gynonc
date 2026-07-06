import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_NAME, accentHex, withDefaults } from "@/lib/program";
import { getKpsProgramIds } from "@/lib/kps";
import { isProdiScoped } from "@/lib/roles";
import {
  ProgramsAdmin,
  type ProgramWithCounts,
} from "@/components/programs-admin";
import type { Program } from "@/lib/types";

// Onboarding & manajemen kurikulum.
//  - super-admin: kelola SEMUA program (buat/edit/aktif) + kurikulumnya.
//  - KPS 1 prodi: langsung ke kurikulum prodinya.
//  - KPS >1 prodi: daftar prodi yang dikelolanya.
export default async function KurikulumPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  // KPS/SPS (kelola) & Admin Prodi (read-only) → daftar/kurikulum prodinya.
  if (isProdiScoped(me.role)) {
    const ids = await getKpsProgramIds(supabase, me.id);
    if (ids.length === 0) redirect("/dashboard");
    if (ids.length === 1) redirect(`/kurikulum/${ids[0]}`);

    const { data: progs } = await supabase
      .from("programs")
      .select("id, kode, nama, config, aktif")
      .in("id", ids)
      .order("kode");
    const mine = (progs ?? []) as Program[];

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Kurikulum Prodi
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Anda membawahi {mine.length} prodi. Pilih salah satu untuk mengelola
            kurikulumnya.
          </p>
        </div>
        <div className="space-y-3">
          {mine.map((p) => (
            <Link
              key={p.id}
              href={`/kurikulum/${p.id}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-teal-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-teal-700"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: accentHex(withDefaults(p.config).accent) }}
                  aria-hidden
                />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {p.nama}
                </span>
                <span className="text-xs text-slate-400">{p.kode}</span>
              </span>
              <span className="text-sm text-teal-700 dark:text-teal-400">
                Kelola kurikulum →
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (me.role !== "admin") redirect("/dashboard");
  const { data: progs } = await supabase
    .from("programs")
    .select("id, kode, nama, config, aktif")
    .order("kode");
  const programs = (progs ?? []) as Program[];

  // Hitung ukuran kurikulum & populasi per program (super-admin: RLS lihat semua).
  const counts = await Promise.all(
    programs.map(async (p) => {
      const c = (table: string) =>
        supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("program_id", p.id)
          .then((r) => r.count ?? 0);
      const [residen, prosedur, penatalaksanaan, penyakit, pengetahuan] =
        await Promise.all([
          c("residents"),
          c("procedures"),
          c("clinical_competencies"),
          c("diseases"),
          c("knowledge_items"),
        ]);
      return {
        ...p,
        residen_count: residen,
        prosedur,
        penatalaksanaan,
        penyakit,
        pengetahuan,
      } as ProgramWithCounts;
    }),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Program &amp; Kurikulum
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Onboarding program {PLATFORM_NAME} dan pengelolaan kurikulumnya.
          Penyakit &amp; pengetahuan penatalaksanaan dikelola lewat seed.
        </p>
      </div>
      <ProgramsAdmin programs={counts} />
    </div>
  );
}
