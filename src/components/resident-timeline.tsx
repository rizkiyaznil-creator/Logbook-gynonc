import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProgram, withDefaults } from "@/lib/program";

// Lini masa pendidikan residen: tanggal mulai → perkiraan lulus, sisa waktu,
// dan perbandingan "waktu berjalan" vs "capaian kompetensi" agar residen tahu
// apakah lajunya sesuai tenggat. Durasi diambil per-prodi (config).

function fmtTanggal(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}

type Sum = {
  prosedur_tercapai: number; prosedur_total: number;
  penatalaksanaan_tercapai: number; penatalaksanaan_total: number;
  pengetahuan_lulus: number; pengetahuan_total: number;
  penyakit_tercakup: number; penyakit_total: number;
};

export async function ResidentTimeline({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const [{ data: res }, { data: sum }] = await Promise.all([
    supabase
      .from("residents")
      .select("tanggal_mulai, program_id")
      .eq("id", residentId)
      .maybeSingle(),
    supabase
      .from("v_resident_summary")
      .select(
        "prosedur_tercapai, prosedur_total, penatalaksanaan_tercapai, penatalaksanaan_total, pengetahuan_lulus, pengetahuan_total, penyakit_tercakup, penyakit_total",
      )
      .eq("resident_id", residentId)
      .maybeSingle(),
  ]);

  const start = res?.tanggal_mulai ? new Date(res.tanggal_mulai) : null;
  const program = await getProgram(supabase, res?.program_id);
  const durasi = withDefaults(program?.config).durasi_bulan;

  const s = (sum ?? null) as Sum | null;
  const done = s
    ? s.prosedur_tercapai + s.penatalaksanaan_tercapai + s.pengetahuan_lulus + s.penyakit_tercakup
    : 0;
  const total = s
    ? s.prosedur_total + s.penatalaksanaan_total + s.pengetahuan_total + s.penyakit_total
    : 0;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const card =
    "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";

  // Tanggal mulai belum diisi → ajak lengkapi profil.
  if (!start || isNaN(start.getTime())) {
    return (
      <div className={card}>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Lini Masa Pendidikan
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tanggal mulai pendidikan belum diisi, sehingga perkiraan kelulusan
          belum dapat dihitung.{" "}
          <Link href="/profil" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Lengkapi di Profil →
          </Link>
        </p>
      </div>
    );
  }

  const end = addMonths(start, durasi);
  const now = new Date();
  const MS_BULAN = 1000 * 60 * 60 * 24 * 30.44;
  const elapsed = Math.max(0, (now.getTime() - start.getTime()) / MS_BULAN);
  const sisaBulan = Math.round((end.getTime() - now.getTime()) / MS_BULAN);
  const timePct = Math.min(100, Math.round((elapsed / durasi) * 100));

  const selesai = total > 0 && done >= total;
  // Status: capaian mengejar waktu? (toleransi 5%).
  let status: { label: string; cls: string };
  if (selesai) {
    status = { label: "Semua target tercapai", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" };
  } else if (progressPct + 5 >= timePct) {
    status = { label: "Sesuai jadwal", cls: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" };
  } else {
    status = { label: "Perlu dikejar", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" };
  }

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );

  const Bar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-700 dark:text-slate-200">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  return (
    <div className={card}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Lini Masa Pendidikan
        </h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Mulai" value={fmtTanggal(start)} />
        <Stat label="Perkiraan lulus" value={fmtTanggal(end)} sub={`${durasi} bulan`} />
        <Stat
          label="Sisa waktu"
          value={sisaBulan >= 0 ? `${sisaBulan} bulan` : `Lewat ${Math.abs(sisaBulan)} bln`}
        />
        <Stat label="Capaian" value={`${done}/${total}`} sub="target tercapai" />
      </div>

      <div className="mt-4 space-y-3">
        <Bar label="Waktu berjalan" pct={timePct} color="bg-slate-400 dark:bg-slate-500" />
        <Bar
          label="Capaian kompetensi"
          pct={progressPct}
          color={progressPct + 5 >= timePct ? "bg-teal-500" : "bg-amber-500"}
        />
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Idealnya “Capaian kompetensi” mengejar atau melampaui “Waktu berjalan”.
        Perkiraan kelulusan = tanggal mulai + durasi prodi ({durasi} bulan).
      </p>
    </div>
  );
}
