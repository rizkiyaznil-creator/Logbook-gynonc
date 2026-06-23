import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_NAME } from "@/lib/program";
import {
  ProgramsAdmin,
  type ProgramWithCounts,
} from "@/components/programs-admin";
import type { Program } from "@/lib/types";

// Onboarding & manajemen kurikulum.
//  - super-admin: kelola SEMUA program (buat/edit/aktif) + kurikulumnya.
//  - KPS: langsung ke kurikulum programnya sendiri.
export default async function KurikulumPage() {
  const me = await requireProfile();
  if (me.role === "kps") {
    if (me.program_id) redirect(`/kurikulum/${me.program_id}`);
    redirect("/dashboard");
  }
  if (me.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
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
