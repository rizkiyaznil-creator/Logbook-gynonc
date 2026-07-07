import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { accentHex, withDefaults } from "@/lib/program";
import { getKpsProgramIds } from "@/lib/kps";
import { isProdiScoped, isProdiStaff } from "@/lib/roles";
import {
  CurriculumManager,
  type ProcedureRow,
  type ClinicalRow,
} from "@/components/curriculum-manager";
import type { Program } from "@/lib/types";

export default async function KurikulumProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireProfile();
  const supabase = await createClient();
  // Akses: super-admin (semua) atau staf prodi (KPS/SPS kelola, Admin Prodi
  // read-only) yang membawahi program ini.
  const memberOfProgram =
    isProdiScoped(me.role) &&
    (await getKpsProgramIds(supabase, me.id)).includes(id);
  const allowed = me.role === "admin" || memberOfProgram;
  if (!allowed) redirect("/dashboard");
  // Hanya super-admin & KPS/SPS boleh menyunting; Admin Prodi read-only.
  const canEdit = me.role === "admin" || isProdiStaff(me.role);
  const { data: prog } = await supabase
    .from("programs")
    .select("id, kode, nama, config, aktif")
    .eq("id", id)
    .maybeSingle();
  if (!prog) redirect(me.role === "admin" ? "/kurikulum" : "/dashboard");
  const program = prog as Program;
  const cfg = withDefaults(program.config);

  const [procRes, clinRes] = await Promise.all([
    supabase
      .from("procedures")
      .select(
        "id, no, kode, nama, target_min, satuan, peran_disyaratkan, peran_dihitung, syarat_tambahan, perlu_verifikasi",
      )
      .eq("program_id", id)
      .order("no"),
    supabase
      .from("clinical_competencies")
      .select(
        "id, no, kode, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi",
      )
      .eq("program_id", id)
      .order("no"),
  ]);
  const procedures = (procRes.data ?? []) as ProcedureRow[];
  const clinical = (clinRes.data ?? []) as ClinicalRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        {me.role === "admin" && (
          <Link
            href="/kurikulum"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            ← Semua program
          </Link>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: accentHex(cfg.accent) }}
            aria-hidden
          />
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Kurikulum — {program.nama}
          </h1>
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {cfg.label_tabel_prosedur && `Prosedur: ${cfg.label_tabel_prosedur} · `}
          {cfg.label_tabel_penatalaksanaan &&
            `Penatalaksanaan: ${cfg.label_tabel_penatalaksanaan} · `}
          FIGO: {cfg.figo_enabled ? "aktif" : "nonaktif"}
        </p>
      </div>

      <CurriculumManager
        programId={id}
        procedures={procedures}
        clinical={clinical}
        canEdit={canEdit}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Catatan: menyimpan/menghapus prosedur otomatis menyelaraskan butir
        pengetahuan prosedur (1:1). Item yang sudah dirujuk entri logbook tidak
        dapat dihapus.
      </p>
    </div>
  );
}
