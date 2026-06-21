import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getGuide, STATUS_LEGEND } from "@/lib/panduan";
import { PrintButton } from "@/components/print-button";

const ROLE_LABEL: Record<string, string> = {
  residen: "Residen",
  supervisor: "Supervisor / DPJP",
  penguji: "Penguji",
  kps: "KPS / Admin Prodi",
  admin: "Administrator",
};

export default async function PanduanPage() {
  const me = await requireProfile();
  const guide = getGuide(me.role);
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print">
        <Link
          href="/profil"
          className="text-sm text-teal-700 hover:underline dark:text-teal-400"
        >
          ← Kembali ke Profil
        </Link>
      </div>

      <article className="space-y-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800">
        {/* Kop dokumen (ikut tercetak) */}
        <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Logbook Onkologi Ginekologi · PPDS Subspesialis Obstetri &amp;
            Ginekologi USU
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">
            {guide.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Peran: {ROLE_LABEL[me.role] ?? me.role} · Dicetak: {today}
          </p>
        </header>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {guide.intro}
        </p>

        {guide.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {s.heading}
            </h2>
            {s.body && (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {s.body}
              </p>
            )}
            {s.steps && (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {s.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
            {s.note && (
              <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
                💡 {s.note}
              </p>
            )}
          </section>
        ))}

        {guide.showStatus && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Legenda status laporan
            </h2>
            <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {STATUS_LEGEND.map((s) => (
                <div key={s.label} className="flex gap-3 py-1.5">
                  <dt className="w-28 shrink-0 font-medium text-slate-700 dark:text-slate-200">
                    {s.label}
                  </dt>
                  <dd className="text-slate-600 dark:text-slate-300">{s.arti}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Panduan lengkap untuk semua peran tersedia di berkas
          docs/panduan-pengguna.md.
        </p>
      </article>

      <div className="no-print flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <PrintButton />
      </div>
    </div>
  );
}
