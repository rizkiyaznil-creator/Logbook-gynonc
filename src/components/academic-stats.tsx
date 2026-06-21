import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { JENIS_LABEL, TAHAP_LABEL, TINGKAT_LABEL } from "@/components/academic-form";
import type { AcademicWork } from "@/lib/types";

const TAHAP_ORDER = Object.keys(TAHAP_LABEL);

function Chip({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200 dark:bg-slate-800/40 dark:ring-slate-700">
      <div className={`text-lg font-semibold ${tone}`}>{n}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

/** Kartu ringkasan karya ilmiah untuk dashboard residen. */
export async function AcademicStats({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_works")
    .select(
      "id, jenis, tahap, judul, tanggal, status, tingkat, penerbit, bentuk",
    )
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });

  const works = (data ?? []) as AcademicWork[];

  const count = (fn: (w: AcademicWork) => boolean) => works.filter(fn).length;
  const verified = count((w) => w.status === "diverifikasi");
  const pending = count((w) => w.status === "diajukan");
  const revisi = count((w) => w.status === "revisi" || w.status === "ditolak");
  const pub = works.filter((w) => w.jenis === "publikasi");
  const pres = works.filter((w) => w.jenis === "presentasi");
  const intl = (arr: AcademicWork[]) =>
    arr.filter((w) => w.tingkat === "internasional").length;

  // Tahapan tesis → status terkini per tahap.
  const tesis = works.filter((w) => w.jenis === "tesis");
  const tahapStatus = (t: string) =>
    tesis.find((w) => w.tahap === t)?.status ?? null;
  const tesisSelesai = TAHAP_ORDER.filter(
    (t) => tahapStatus(t) === "diverifikasi",
  ).length;

  const recent = works.slice(0, 4);

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
            <Icons.research className="h-4 w-4" />
          </span>
          Karya &amp; Kegiatan Ilmiah
        </h2>
        <Link
          href="/karya"
          className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Kelola →
        </Link>
      </div>

      {works.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
          Belum ada karya ilmiah. Tambahkan lewat menu{" "}
          <Link href="/karya" className="text-teal-700 dark:text-teal-400">
            Karya Ilmiah
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <Chip
              n={verified}
              label="Terverifikasi"
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Chip
              n={pending}
              label="Menunggu"
              tone="text-amber-600 dark:text-amber-400"
            />
            <Chip
              n={revisi}
              label="Revisi/tolak"
              tone="text-orange-600 dark:text-orange-400"
            />
            <Chip
              n={pub.length}
              label={`Publikasi${intl(pub) ? ` · ${intl(pub)} int'l` : ""}`}
              tone="text-violet-600 dark:text-violet-400"
            />
            <Chip
              n={pres.length}
              label={`Presentasi${intl(pres) ? ` · ${intl(pres)} int'l` : ""}`}
              tone="text-sky-600 dark:text-sky-400"
            />
          </div>

          {/* Progres tesis */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Progres tesis / penelitian</span>
              <span>{tesisSelesai}/5 tahap selesai</span>
            </div>
            <ol className="flex items-center gap-1">
              {TAHAP_ORDER.map((t) => {
                const st = tahapStatus(t);
                const cls =
                  st === "diverifikasi"
                    ? "bg-emerald-500 text-white"
                    : st === "diajukan"
                      ? "bg-amber-400 text-white"
                      : st === "revisi" || st === "ditolak"
                        ? "bg-orange-400 text-white"
                        : st === "draft"
                          ? "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-200"
                          : "border border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500";
                return (
                  <li key={t} className="flex-1 text-center">
                    <div
                      className={`grid h-7 place-items-center rounded-md text-[11px] font-medium ${cls}`}
                      title={st ? `${TAHAP_LABEL[t]} — ${st}` : TAHAP_LABEL[t]}
                    >
                      {st === "diverifikasi" ? "✓" : st ? "•" : "·"}
                    </div>
                    <div className="mt-1 truncate text-[10px] text-slate-400 dark:text-slate-500">
                      {TAHAP_LABEL[t]}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Daftar terbaru */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Terbaru
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {w.judul}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {JENIS_LABEL[w.jenis]}
                      {w.tingkat ? ` · ${TINGKAT_LABEL[w.tingkat]}` : ""}
                      {w.tanggal ? ` · ${w.tanggal}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

/** Rekap agregat karya ilmiah seluruh residen untuk dashboard staf/KPS. */
export async function AcademicRekap() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_works")
    .select("jenis, tingkat, status");

  const works = (data ?? []) as Pick<
    AcademicWork,
    "jenis" | "tingkat" | "status"
  >[];
  if (works.length === 0) return null;

  const c = (fn: (w: (typeof works)[number]) => boolean) =>
    works.filter(fn).length;
  const verified = (j: AcademicWork["jenis"]) =>
    c((w) => w.jenis === j && w.status === "diverifikasi");
  const intlVerified = (j: AcademicWork["jenis"]) =>
    c(
      (w) =>
        w.jenis === j &&
        w.status === "diverifikasi" &&
        w.tingkat === "internasional",
    );

  const cards = [
    {
      label: "Karya terverifikasi",
      n: c((w) => w.status === "diverifikasi"),
      sub: `${c((w) => w.status === "diajukan")} menunggu`,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Publikasi",
      n: verified("publikasi"),
      sub: `${intlVerified("publikasi")} internasional`,
      tone: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Presentasi",
      n: verified("presentasi"),
      sub: `${intlVerified("presentasi")} internasional`,
      tone: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Laporan kasus",
      n: verified("laporan_kasus"),
      sub: "terverifikasi",
      tone: "text-teal-600 dark:text-teal-400",
    },
  ];

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Icons.research className="h-4 w-4 text-fuchsia-500" />
        Rekap Karya &amp; Kegiatan Ilmiah
        <span className="font-normal text-slate-400 dark:text-slate-500">
          (seluruh residen)
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div className={`text-2xl font-semibold ${card.tone}`}>
              {card.n}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {card.label}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {card.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
