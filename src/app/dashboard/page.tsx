import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { ProgressBar } from "@/components/progress-bar";
import type {
  ResidentSummary,
  ProcedureProgress,
  ClinicalProgress,
} from "@/lib/types";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "residen") {
    return <ResidentDashboard residentId={profile.id} />;
  }
  return <StaffDashboard />;
}

async function ResidentDashboard({ residentId }: { residentId: string }) {
  const supabase = await createClient();

  const [summaryRes, procRes, clinRes] = await Promise.all([
    supabase
      .from("v_resident_summary")
      .select("*")
      .eq("resident_id", residentId)
      .maybeSingle(),
    supabase
      .from("v_procedure_progress")
      .select("*")
      .eq("resident_id", residentId)
      .order("kode"),
    supabase
      .from("v_clinical_progress")
      .select("*")
      .eq("resident_id", residentId)
      .order("kode"),
  ]);

  const summary = summaryRes.data as ResidentSummary | null;
  const procedures = (procRes.data ?? []) as ProcedureProgress[];
  const clinical = (clinRes.data ?? []) as ClinicalProgress[];

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800">
        Ringkasan Pencapaian Kompetensi
      </h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Prosedur"
          achieved={summary?.prosedur_tercapai ?? 0}
          total={summary?.prosedur_total ?? 0}
        />
        <StatCard
          label="Penatalaksanaan"
          achieved={summary?.penatalaksanaan_tercapai ?? 0}
          total={summary?.penatalaksanaan_total ?? 0}
        />
        <StatCard
          label="Pengetahuan (OSCE/MCQ)"
          achieved={summary?.pengetahuan_lulus ?? 0}
          total={summary?.pengetahuan_total ?? 0}
        />
        <StatCard
          label="Spektrum Penyakit"
          achieved={summary?.penyakit_tercakup ?? 0}
          total={summary?.penyakit_total ?? 0}
        />
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
    </div>
  );
}

function ProgressTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    kode: string;
    nama: string;
    n: number;
    target: number;
    persen: number;
    tercapai: boolean;
    menunggu?: number;
  }[];
}) {
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
                  <span
                    className={
                      r.tercapai ? "text-teal-700" : "text-slate-600"
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

async function StaffDashboard() {
  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, no_peserta, angkatan, profiles(full_name)")
    .order("angkatan");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">Daftar Residen</h1>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">No. Peserta</th>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Angkatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(residents ?? []).map(
              (r: {
                id: string;
                no_peserta: string | null;
                angkatan: string | null;
                profiles: { full_name: string } | { full_name: string }[] | null;
              }) => {
                const nama = Array.isArray(r.profiles)
                  ? r.profiles[0]?.full_name
                  : r.profiles?.full_name;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {r.no_peserta ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{nama ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.angkatan ?? "—"}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
