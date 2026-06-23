import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "@/components/export-csv-button";
import { TableCard } from "@/components/table-card";
import { accentHex, PLATFORM_NAME } from "@/lib/program";
import type { ProgramConfig } from "@/lib/types";

// Laporan lintas-program untuk pemilik platform (super-admin). KPS tetap
// memakai /rekap (per program). Halaman ini me-rollup seluruh program agar
// dapat dibandingkan berdampingan.

type Overview = {
  program_id: string;
  kode: string;
  nama: string;
  config: ProgramConfig | null;
  aktif: boolean;
  residen_count: number;
  prosedur_total: number;
  penatalaksanaan_total: number;
  pengetahuan_total: number;
  penyakit_total: number;
  prosedur_tercapai: number;
  penatalaksanaan_tercapai: number;
  pengetahuan_lulus: number;
  penyakit_tercakup: number;
  entri_total: number;
  entri_menunggu: number;
  entri_terverifikasi: number;
};

const th =
  "px-4 py-2.5 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-4 py-2.5 text-slate-700 dark:text-slate-200";

function Card({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {sub && (
        <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {sub}
        </div>
      )}
    </div>
  );
}

export default async function LaporanPlatformPage() {
  const me = await requireProfile();
  // Lintas-program: khusus pemilik platform (super-admin).
  if (me.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_program_overview")
    .select("*")
    .order("kode");
  const rows = (data ?? []) as Overview[];

  // Capaian agregat program = komponen tuntas ÷ (residen × ukuran kurikulum).
  const withPct = rows.map((p) => {
    const done =
      p.prosedur_tercapai +
      p.penatalaksanaan_tercapai +
      p.pengetahuan_lulus +
      p.penyakit_tercakup;
    const target =
      p.residen_count *
      (p.prosedur_total +
        p.penatalaksanaan_total +
        p.pengetahuan_total +
        p.penyakit_total);
    const pct = target > 0 ? Math.round((done / target) * 100) : 0;
    return { p, done, target, pct };
  });

  // Ringkasan platform.
  const totalProgram = rows.length;
  const totalAktif = rows.filter((p) => p.aktif).length;
  const totalResiden = rows.reduce((a, p) => a + p.residen_count, 0);
  const totalEntri = rows.reduce((a, p) => a + p.entri_total, 0);
  const totalMenunggu = rows.reduce((a, p) => a + p.entri_menunggu, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Laporan Platform
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Rollup lintas-program {PLATFORM_NAME} — khusus pemilik platform.
        </p>
      </div>

      {/* Ringkasan platform */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          label="Program"
          value={String(totalProgram)}
          sub={`${totalAktif} aktif`}
          color="text-blue-700 dark:text-blue-400"
        />
        <Card
          label="Total residen"
          value={String(totalResiden)}
          sub="seluruh program"
          color="text-emerald-700 dark:text-emerald-400"
        />
        <Card
          label="Total entri"
          value={String(totalEntri)}
          color="text-violet-700 dark:text-violet-400"
        />
        <Card
          label="Menunggu verifikasi"
          value={String(totalMenunggu)}
          sub="entri berstatus diajukan"
          color="text-amber-700 dark:text-amber-400"
        />
      </div>

      {/* Tabel per program */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ringkasan per Program
          </h2>
          <ExportCsvButton
            filename="laporan-platform.csv"
            headers={[
              "Kode",
              "Program",
              "Aktif",
              "Residen",
              "Prosedur (tuntas/target)",
              "Penatalaksanaan",
              "Pengetahuan",
              "Penyakit",
              "Capaian agregat (%)",
              "Entri total",
              "Terverifikasi",
              "Menunggu",
            ]}
            rows={withPct.map(({ p, pct }) => [
              p.kode,
              p.nama,
              p.aktif ? "ya" : "tidak",
              p.residen_count,
              `${p.prosedur_tercapai}/${p.residen_count * p.prosedur_total}`,
              `${p.penatalaksanaan_tercapai}/${p.residen_count * p.penatalaksanaan_total}`,
              `${p.pengetahuan_lulus}/${p.residen_count * p.pengetahuan_total}`,
              `${p.penyakit_tercakup}/${p.residen_count * p.penyakit_total}`,
              pct,
              p.entri_total,
              p.entri_terverifikasi,
              p.entri_menunggu,
            ])}
          />
        </div>
        <TableCard>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={th}>Program</th>
                <th className={`${th} text-right`}>Residen</th>
                <th className={`${th} text-right`}>Kurikulum</th>
                <th className={`${th} w-44`}>Capaian agregat</th>
                <th className={`${th} text-right`}>Entri</th>
                <th className={`${th} text-right`}>Terverif.</th>
                <th className={`${th} text-right`}>Menunggu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {withPct.map(({ p, pct }) => {
                const kurikulum =
                  p.prosedur_total +
                  p.penatalaksanaan_total +
                  p.pengetahuan_total +
                  p.penyakit_total;
                return (
                  <tr
                    key={p.program_id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className={`${td} font-medium`}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: accentHex(p.config?.accent) }}
                          aria-hidden
                        />
                        <span>
                          {p.nama}
                          {!p.aktif && (
                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              nonaktif
                            </span>
                          )}
                          <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                            {p.kode}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                      {p.residen_count}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                      {kurikulum}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: accentHex(p.config?.accent),
                            }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                      {p.entri_total}
                    </td>
                    <td className="px-4 py-2.5 text-right text-teal-700 dark:text-teal-400">
                      {p.entri_terverifikasi}
                    </td>
                    <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">
                      {p.entri_menunggu}
                    </td>
                  </tr>
                );
              })}
              {withPct.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada program.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Capaian agregat = komponen kompetensi tuntas ÷ (jumlah residen ×
          ukuran kurikulum program). Untuk rincian per residen, buka{" "}
          <span className="font-medium">Rekap</span> pada program terkait.
        </p>
      </section>
    </div>
  );
}
