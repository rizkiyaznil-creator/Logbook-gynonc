"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProgram, updateProgram } from "@/app/(app)/kurikulum/actions";
import type { Program } from "@/lib/types";

const ACCENTS = [
  "teal",
  "emerald",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "rose",
  "amber",
  "slate",
];

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelCls =
  "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

/** Form buat/edit program + config. `program` null = mode buat. */
export function ProgramForm({
  program,
  onDone,
}: {
  program?: Program | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const c = program?.config ?? {};
  const [kode, setKode] = useState(program?.kode ?? "");
  const [nama, setNama] = useState(program?.nama ?? "");
  const [aktif, setAktif] = useState(program?.aktif ?? true);
  const [accent, setAccent] = useState(c.accent ?? "teal");
  const [labelProsedur, setLabelProsedur] = useState(c.label_tabel_prosedur ?? "");
  const [labelPenata, setLabelPenata] = useState(
    c.label_tabel_penatalaksanaan ?? "",
  );
  const [figo, setFigo] = useState(c.figo_enabled ?? false);
  const [staging, setStaging] = useState((c.staging_options ?? []).join(", "));

  const isEdit = !!program;

  function submit() {
    setError(null);
    const config = {
      accent,
      label_tabel_prosedur: labelProsedur.trim(),
      label_tabel_penatalaksanaan: labelPenata.trim(),
      figo_enabled: figo,
      staging_options: staging
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    start(async () => {
      const res = isEdit
        ? await updateProgram(program!.id, { nama, aktif, config })
        : await createProgram({ kode, nama, config });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Kode program</label>
          <input
            className={inputCls}
            value={kode}
            disabled={isEdit}
            placeholder="mis. obgin"
            onChange={(e) => setKode(e.target.value)}
          />
          {isEdit && (
            <p className="mt-1 text-[11px] text-slate-400">
              Kode tidak dapat diubah.
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Nama program</label>
          <input
            className={inputCls}
            value={nama}
            placeholder="mis. Dokter Spesialis Obstetri & Ginekologi"
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Warna aksen</label>
          <select
            className={inputCls}
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
          >
            {ACCENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Label tabel prosedur</label>
          <input
            className={inputCls}
            value={labelProsedur}
            placeholder="mis. Tabel 21"
            onChange={(e) => setLabelProsedur(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Label tabel penatalaksanaan</label>
          <input
            className={inputCls}
            value={labelPenata}
            placeholder="mis. Tabel 15"
            onChange={(e) => setLabelPenata(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Opsi stadium FIGO (pisahkan dengan koma)
        </label>
        <input
          className={inputCls}
          value={staging}
          placeholder="IA, IB, II, IIIA, IVB"
          onChange={(e) => setStaging(e.target.value)}
          disabled={!figo}
        />
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={figo}
            onChange={(e) => setFigo(e.target.checked)}
          />
          Aktifkan stadium FIGO
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
            />
            Program aktif
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Buat program"}
        </button>
        {onDone && (
          <button
            onClick={onDone}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
}
