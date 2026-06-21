import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BarList } from "@/components/bar-list";
import { ExportCsvButton } from "@/components/export-csv-button";

// Asumsi durasi pendidikan (bulan) untuk proyeksi kelulusan — dapat disesuaikan.
const PROGRAM_BULAN = 24;

type Summary = {
  resident_id: string;
  prosedur_tercapai: number;
  prosedur_total: number;
  penatalaksanaan_tercapai: number;
  penatalaksanaan_total: number;
  pengetahuan_lulus: number;
  pengetahuan_total: number;
  penyakit_tercakup: number;
  penyakit_total: number;
};
type CompRow = {
  resident_id: string;
  kode: string;
  nama: string;
  tercapai: boolean;
};
type Resident = {
  id: string;
  no_peserta: string | null;
  angkatan: string | null;
  tanggal_mulai: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function nameOf(r: Resident) {
  const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  return p?.full_name ?? "—";
}
function monthsElapsed(start: string | null) {
  if (!start) return null;
  const ms = Date.now() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

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

const th =
  "px-4 py-2.5 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-4 py-2.5 text-slate-700 dark:text-slate-200";

export default async function RekapPage() {
  const me = await requireProfile();
  if (!["kps", "admin"].includes(me.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [resRes, sumRes, procRes, clinRes, entryRes, supRes] =
    await Promise.all([
      supabase
        .from("residents")
        .select("id, no_peserta, angkatan, tanggal_mulai, profiles(full_name)")
        .order("angkatan"),
      supabase.from("v_resident_summary").select("*"),
      supabase.from("v_procedure_progress").select("resident_id, kode, nama, tercapai"),
      supabase
        .from("v_clinical_progress")
        .select("resident_id, kode, komponen, tercapai"),
      supabase.from("log_entries").select("status, supervisor_id"),
      supabase.from("profiles").select("id, full_name").eq("role", "supervisor"),
    ]);

  const residents = (resRes.data ?? []) as Resident[];
  const summaries = (sumRes.data ?? []) as Summary[];
  const procRows = (procRes.data ?? []) as CompRow[];
  const clinRows = ((clinRes.data ?? []) as {
    resident_id: string;
    kode: string;
    komponen: string;
    tercapai: boolean;
  }[]).map((c) => ({ ...c, nama: c.komponen }) as CompRow);
  const entries = (entryRes.data ?? []) as {
    status: string;
    supervisor_id: string | null;
  }[];
  const supName = new Map(
    ((supRes.data ?? []) as { id: string; full_name: string }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  const sumMap = new Map(summaries.map((s) => [s.resident_id, s]));

  // --- Capaian per residen ---
  const perResiden = residents.map((r) => {
    const s = sumMap.get(r.id);
    const done = s
      ? s.prosedur_tercapai +
        s.penatalaksanaan_tercapai +
        s.pengetahuan_lulus +
        s.penyakit_tercakup
      : 0;
    const total = s
      ? s.prosedur_total +
        s.penatalaksanaan_total +
        s.pengetahuan_total +
        s.penyakit_total
      : 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { r, s, done, total, pct };
  });
  const perResidenSorted = [...perResiden].sort((a, b) => b.pct - a.pct);

  const avgPct =
    perResiden.length > 0
      ? Math.round(
          perResiden.reduce((a, x) => a + x.pct, 0) / perResiden.length,
        )
      : 0;
  const menunggu = entries.filter((e) => e.status === "diajukan").length;

  // --- Per angkatan ---
  const angMap = new Map<string, { sum: number; n: number }>();
  for (const x of perResiden) {
    const k = x.r.angkatan ?? "(tanpa angkatan)";
    const cur = angMap.get(k) ?? { sum: 0, n: 0 };
    cur.sum += x.pct;
    cur.n += 1;
    angMap.set(k, cur);
  }
  const perAngkatan = Array.from(angMap.entries())
    .map(([k, v]) => ({
      label: `${k} · ${v.n} residen`,
      value: Math.round(v.sum / v.n),
      display: `${Math.round(v.sum / v.n)}%`,
      color: "bg-teal-500",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // --- Kompetensi paling tertinggal (% residen tuntas terendah) ---
  const nRes = residents.length || 1;
  const compMap = new Map<
    string,
    { kode: string; nama: string; tuntas: number }
  >();
  for (const c of [...procRows, ...clinRows]) {
    const key = c.kode;
    const cur = compMap.get(key) ?? { kode: c.kode, nama: c.nama, tuntas: 0 };
    if (c.tercapai) cur.tuntas += 1;
    compMap.set(key, cur);
  }
  const lagging = Array.from(compMap.values())
    .map((c) => {
      const pct = Math.round((c.tuntas / nRes) * 100);
      return {
        label: `${c.kode} ${c.nama}`,
        value: pct,
        display: `${pct}%`,
        color:
          pct < 34 ? "bg-rose-500" : pct < 67 ? "bg-amber-500" : "bg-emerald-500",
      };
    })
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);

  // --- Beban verifikasi per DPJP ---
  const dpjpMap = new Map<
    string,
    { total: number; verified: number; pending: number }
  >();
  for (const e of entries) {
    const k = e.supervisor_id ?? "—";
    const cur = dpjpMap.get(k) ?? { total: 0, verified: 0, pending: 0 };
    cur.total += 1;
    if (e.status === "diverifikasi") cur.verified += 1;
    if (e.status === "diajukan") cur.pending += 1;
    dpjpMap.set(k, cur);
  }
  const perDPJP = Array.from(dpjpMap.entries())
    .map(([k, v]) => ({
      nama: k === "—" ? "(tanpa DPJP)" : supName.get(k) ?? "DPJP",
      ...v,
    }))
    .sort((a, b) => b.total - a.total);

  // --- Proyeksi kelulusan ---
  const proyeksi = perResiden.map((x) => {
    const me = monthsElapsed(x.r.tanggal_mulai);
    const remaining = Math.max(0, x.total - x.done);
    const pace = me ? x.done / me : 0;
    let eta: number | null = null;
    let status = "—";
    let color = "text-slate-500 dark:text-slate-400";
    if (!me) {
      status = "Tgl mulai kosong";
    } else if (remaining === 0) {
      status = "Selesai";
      eta = 0;
      color = "text-emerald-600 dark:text-emerald-400";
    } else if (pace <= 0) {
      status = "Belum ada progres";
      color = "text-rose-600 dark:text-rose-400";
    } else {
      eta = Math.ceil(remaining / pace);
      const projected = me + eta;
      if (projected <= PROGRAM_BULAN) {
        status = "Tepat waktu";
        color = "text-emerald-600 dark:text-emerald-400";
      } else {
        status = "Berisiko terlambat";
        color = "text-amber-600 dark:text-amber-400";
      }
    }
    return { x, me, pace, eta, status, color };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Analitik &amp; Laporan Prodi
      </h1>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          label="Jumlah residen"
          value={String(residents.length)}
          color="text-blue-700 dark:text-blue-400"
        />
        <Card
          label="Rata-rata capaian"
          value={`${avgPct}%`}
          sub="seluruh domain kompetensi"
          color="text-emerald-700 dark:text-emerald-400"
        />
        <Card
          label="Menunggu verifikasi"
          value={String(menunggu)}
          sub="entri berstatus diajukan"
          color="text-amber-700 dark:text-amber-400"
        />
        <Card
          label="Total entri"
          value={String(entries.length)}
          color="text-violet-700 dark:text-violet-400"
        />
      </div>

      {/* Capaian per residen */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Capaian per Residen
          </h2>
          <ExportCsvButton
            filename="capaian-residen.csv"
            headers={[
              "No. Peserta",
              "Nama",
              "Angkatan",
              "Prosedur",
              "Penatalaksanaan",
              "Pengetahuan",
              "Penyakit",
              "Total",
              "Capaian (%)",
            ]}
            rows={perResidenSorted.map((x) => [
              x.r.no_peserta ?? "",
              nameOf(x.r),
              x.r.angkatan ?? "",
              x.s ? `${x.s.prosedur_tercapai}/${x.s.prosedur_total}` : "0/0",
              x.s
                ? `${x.s.penatalaksanaan_tercapai}/${x.s.penatalaksanaan_total}`
                : "0/0",
              x.s ? `${x.s.pengetahuan_lulus}/${x.s.pengetahuan_total}` : "0/0",
              x.s ? `${x.s.penyakit_tercakup}/${x.s.penyakit_total}` : "0/0",
              `${x.done}/${x.total}`,
              x.pct,
            ])}
          />
        </div>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={th}>Nama</th>
                <th className={th}>Angkatan</th>
                <th className={`${th} text-right`}>Prosedur</th>
                <th className={`${th} text-right`}>Penatalaksanaan</th>
                <th className={`${th} text-right`}>Pengetahuan</th>
                <th className={`${th} text-right`}>Penyakit</th>
                <th className={`${th} w-40`}>Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {perResidenSorted.map((x) => (
                <tr
                  key={x.r.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className={`${td} font-medium`}>{nameOf(x.r)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {x.r.angkatan ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {x.s ? `${x.s.prosedur_tercapai}/${x.s.prosedur_total}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {x.s
                      ? `${x.s.penatalaksanaan_tercapai}/${x.s.penatalaksanaan_total}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {x.s
                      ? `${x.s.pengetahuan_lulus}/${x.s.pengetahuan_total}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {x.s
                      ? `${x.s.penyakit_tercakup}/${x.s.penyakit_total}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                          style={{ width: `${x.pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        {x.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {perResidenSorted.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada residen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per angkatan & lagging */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Rata-rata Capaian per Angkatan
          </h2>
          <BarList rows={perAngkatan} max={100} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kompetensi Paling Tertinggal
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
              (% residen tuntas)
            </span>
          </h2>
          <BarList rows={lagging} max={100} />
        </section>
      </div>

      {/* Beban verifikasi per DPJP */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Beban Verifikasi per DPJP
        </h2>
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={th}>DPJP</th>
                <th className={`${th} text-right`}>Total Entri</th>
                <th className={`${th} text-right`}>Terverifikasi</th>
                <th className={`${th} text-right`}>Menunggu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {perDPJP.map((d) => (
                <tr key={d.nama}>
                  <td className={td}>{d.nama}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {d.total}
                  </td>
                  <td className="px-4 py-2.5 text-right text-teal-700 dark:text-teal-400">
                    {d.verified}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">
                    {d.pending}
                  </td>
                </tr>
              ))}
              {perDPJP.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Proyeksi kelulusan */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Proyeksi Kelulusan
          </h2>
          <ExportCsvButton
            filename="proyeksi-kelulusan.csv"
            headers={[
              "No. Peserta",
              "Nama",
              "Angkatan",
              "Capaian (%)",
              "Bulan berjalan",
              "Laju/bln",
              "Estimasi selesai (bln lagi)",
              "Status",
            ]}
            rows={proyeksi.map((p) => [
              p.x.r.no_peserta ?? "",
              nameOf(p.x.r),
              p.x.r.angkatan ?? "",
              p.x.pct,
              p.me ?? "",
              p.pace ? p.pace.toFixed(1) : "0",
              p.eta ?? "",
              p.status,
            ])}
          />
        </div>
        <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
          Asumsi durasi pendidikan {PROGRAM_BULAN} bulan. Laju = capaian ÷ bulan
          berjalan; estimasi = sisa target ÷ laju.
        </p>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={th}>Nama</th>
                <th className={th}>Angkatan</th>
                <th className={`${th} text-right`}>Capaian</th>
                <th className={`${th} text-right`}>Bln berjalan</th>
                <th className={`${th} text-right`}>Laju/bln</th>
                <th className={`${th} text-right`}>Est. selesai</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {proyeksi.map((p) => (
                <tr
                  key={p.x.r.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className={`${td} font-medium`}>{nameOf(p.x.r)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {p.x.r.angkatan ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {p.x.pct}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {p.me ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {p.pace ? p.pace.toFixed(1) : "0"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {p.eta === null ? "—" : p.eta === 0 ? "—" : `${p.eta} bln`}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right text-xs font-semibold ${p.color}`}
                  >
                    {p.status}
                  </td>
                </tr>
              ))}
              {proyeksi.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada residen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
