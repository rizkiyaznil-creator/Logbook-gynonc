import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { ProgressBar } from "@/components/progress-bar";
import { DiseaseCoverage } from "@/components/disease-coverage";
import { ResidentIdentity } from "@/components/resident-identity";
import { SignatureBlock } from "@/components/signature-block";
import { PrintButton } from "@/components/print-button";
import { Skeleton } from "@/components/skeleton";
import { Icons } from "@/components/icons";
import type {
  ResidentSummary,
  ProcedureProgress,
  ClinicalProgress,
  SubtargetProgress,
} from "@/lib/types";

type Row = {
  kode: string;
  nama: string;
  n: number;
  target: number;
  persen: number;
  tercapai: boolean;
  menunggu?: number;
};

const ACCENT: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
};

function ProgressTable({
  title,
  rows,
  accent = "blue",
}: {
  title: string;
  rows: Row[];
  accent?: keyof typeof ACCENT;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className={`h-4 w-1.5 rounded-full ${ACCENT[accent]}`} />
        {title}
      </h2>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2.5">Kode</th>
              <th className="px-4 py-2.5">Kompetensi</th>
              <th className="px-4 py-2.5 w-48">Progress</th>
              <th className="px-4 py-2.5 text-right">Capaian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr
                key={r.kode}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {r.kode}
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  {r.nama}
                </td>
                <td className="px-4 py-2.5">
                  <ProgressBar value={r.persen} achieved={r.tercapai} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={
                      r.tercapai
                        ? "font-semibold text-teal-700 dark:text-teal-400"
                        : "text-slate-600 dark:text-slate-300"
                    }
                  >
                    {r.n}/{r.target}
                  </span>
                  {r.menunggu ? (
                    <span className="ml-1 text-xs text-amber-600">
                      (+{r.menunggu} menunggu)
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export async function ResidentProgress({ residentId }: { residentId: string }) {
  const supabase = await createClient();

  const [summaryRes, procRes, clinRes, subRes] = await Promise.all([
    supabase.from("v_resident_summary").select("*").eq("resident_id", residentId).maybeSingle(),
    supabase.from("v_procedure_progress").select("*").eq("resident_id", residentId).order("kode"),
    supabase.from("v_clinical_progress").select("*").eq("resident_id", residentId).order("kode"),
    supabase.from("v_subtarget_progress").select("*").eq("resident_id", residentId).order("subtarget_kode"),
  ]);

  const summary = summaryRes.data as ResidentSummary | null;
  const procedures = (procRes.data ?? []) as ProcedureProgress[];
  const clinical = (clinRes.data ?? []) as ClinicalProgress[];
  const subtargets = (subRes.data ?? []) as SubtargetProgress[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <ResidentIdentity residentId={residentId} />
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Prosedur"
          color="blue"
          icon={<Icons.activity className="h-4 w-4" />}
          achieved={summary?.prosedur_tercapai ?? 0}
          total={summary?.prosedur_total ?? 0}
        />
        <StatCard
          label="Penatalaksanaan"
          color="violet"
          icon={<Icons.stethoscope className="h-4 w-4" />}
          achieved={summary?.penatalaksanaan_tercapai ?? 0}
          total={summary?.penatalaksanaan_total ?? 0}
        />
        <StatCard
          label="Pengetahuan (OSCE/MCQ)"
          color="amber"
          icon={<Icons.brain className="h-4 w-4" />}
          achieved={summary?.pengetahuan_lulus ?? 0}
          total={summary?.pengetahuan_total ?? 0}
        />
        <StatCard
          label="Spektrum Penyakit"
          color="emerald"
          icon={<Icons.dna className="h-4 w-4" />}
          achieved={summary?.penyakit_tercakup ?? 0}
          total={summary?.penyakit_total ?? 0}
        />
      </div>

      <ProgressTable
        title="Kompetensi Penatalaksanaan (Tabel 18)"
        accent="violet"
        rows={clinical.map((c) => ({
          kode: c.kode,
          nama: c.komponen,
          n: c.jumlah_terverifikasi,
          target: c.target_min,
          persen: c.persen,
          tercapai: c.tercapai,
        }))}
      />

      {subtargets.length > 0 && (
        <ProgressTable
          title="Sub-target Dokumentasi (PK-09)"
          accent="cyan"
          rows={subtargets.map((s) => ({
            kode: s.competency_kode,
            nama: s.nama,
            n: s.jumlah_terverifikasi,
            target: s.target_min,
            persen: s.persen,
            tercapai: s.tercapai,
          }))}
        />
      )}

      <ProgressTable
        title="Kompetensi Prosedur (Tabel 24)"
        accent="blue"
        rows={procedures.map((p) => ({
          kode: p.kode,
          nama: p.nama,
          n: p.jumlah_terverifikasi,
          target: p.target_min,
          persen: p.persen,
          tercapai: p.tercapai,
          menunggu: p.jumlah_menunggu,
        }))}
      />

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <DiseaseCoverage residentId={residentId} />
      </Suspense>

      <SignatureBlock residentId={residentId} />
    </div>
  );
}
