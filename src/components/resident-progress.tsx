import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { ProgressBar } from "@/components/progress-bar";
import { DiseaseCoverage } from "@/components/disease-coverage";
import { ResidentIdentity } from "@/components/resident-identity";
import { PrintButton } from "@/components/print-button";
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

function ProgressTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Kompetensi</th>
              <th className="px-4 py-2 w-48">Progress</th>
              <th className="px-4 py-2 text-right">Capaian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.kode}>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                  {r.kode}
                </td>
                <td className="px-4 py-2 text-slate-700">{r.nama}</td>
                <td className="px-4 py-2">
                  <ProgressBar value={r.persen} achieved={r.tercapai} />
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={r.tercapai ? "text-teal-700" : "text-slate-600"}>
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ResidentIdentity residentId={residentId} />
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Prosedur" achieved={summary?.prosedur_tercapai ?? 0} total={summary?.prosedur_total ?? 0} />
        <StatCard label="Penatalaksanaan" achieved={summary?.penatalaksanaan_tercapai ?? 0} total={summary?.penatalaksanaan_total ?? 0} />
        <StatCard label="Pengetahuan (OSCE/MCQ)" achieved={summary?.pengetahuan_lulus ?? 0} total={summary?.pengetahuan_total ?? 0} />
        <StatCard label="Spektrum Penyakit" achieved={summary?.penyakit_tercakup ?? 0} total={summary?.penyakit_total ?? 0} />
      </div>

      <ProgressTable
        title="Kompetensi Penatalaksanaan (Tabel 18)"
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

      <DiseaseCoverage residentId={residentId} />
    </div>
  );
}
