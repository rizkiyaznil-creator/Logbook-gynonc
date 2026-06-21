"use client";

import { useActionState, useState } from "react";
import { Combobox } from "@/components/combobox";
import type {
  AcademicJenis,
  AcademicWork,
  CoAuthor,
  SupervisorOption,
} from "@/lib/types";

export const JENIS_LABEL: Record<AcademicJenis, string> = {
  sari_pustaka: "Sari pustaka",
  telaah_jurnal: "Telaah/baca jurnal",
  laporan_kasus: "Laporan kasus",
  tesis: "Tesis / penelitian",
  publikasi: "Publikasi",
  presentasi: "Presentasi (event)",
};
export const TAHAP_LABEL: Record<string, string> = {
  proposal: "Proposal",
  kaji_etik: "Kaji etik",
  pengumpulan_data: "Pengumpulan data",
  seminar_hasil: "Seminar hasil",
  sidang: "Sidang/ujian",
};
export const TINGKAT_LABEL: Record<string, string> = {
  nasional: "Nasional",
  internasional: "Internasional",
};
export const BENTUK_LABEL: Record<string, string> = {
  oral: "Oral / presentasi lisan",
  poster: "Poster",
};

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const inputSm =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const miniBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-200";

type FormAction = (
  prev: unknown,
  formData: FormData,
) => Promise<{ error?: string } | void>;

export function AcademicForm({
  supervisors,
  action,
  initial,
}: {
  supervisors: SupervisorOption[];
  action: FormAction;
  initial?: Partial<AcademicWork>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [jenis, setJenis] = useState<AcademicJenis>(
    initial?.jenis ?? "sari_pustaka",
  );
  const [coAuthors, setCoAuthors] = useState<CoAuthor[]>(
    initial?.co_authors ?? [],
  );

  const setCo = (i: number, patch: Partial<CoAuthor>) =>
    setCoAuthors((arr) => arr.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const moveCo = (i: number, dir: -1 | 1) =>
    setCoAuthors((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      {initial?.id && <input type="hidden" name="work_id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Jenis</label>
          <select
            name="jenis"
            value={jenis}
            onChange={(e) => setJenis(e.target.value as AcademicJenis)}
            className={input}
          >
            {Object.entries(JENIS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {jenis === "tesis" && (
          <div>
            <label className={label}>Tahap</label>
            <select
              name="tahap"
              defaultValue={initial?.tahap ?? "proposal"}
              className={input}
            >
              {Object.entries(TAHAP_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className={label}>Judul</label>
        <input
          name="judul"
          required
          defaultValue={initial?.judul ?? ""}
          className={input}
          placeholder="Judul karya / penelitian"
        />
      </div>

      {jenis === "tesis" && (
        <div className="grid gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2 dark:bg-slate-800/40 dark:ring-slate-700">
          <p className="text-xs text-slate-500 sm:col-span-2 dark:text-slate-400">
            Pembimbing utama (yang memverifikasi) dipilih pada kolom
            “Pembimbing” di bawah.
          </p>
          <div className="sm:col-span-2">
            <label className={label}>Pembimbing 2 (nama)</label>
            <input
              name="pembimbing2"
              defaultValue={initial?.pembimbing2 ?? ""}
              className={input}
              placeholder="Nama pembimbing kedua"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>
              Penguji{" "}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                (3–5 DPJP, satu nama per baris)
              </span>
            </label>
            <textarea
              name="penguji"
              rows={4}
              defaultValue={initial?.penguji ?? ""}
              className={input}
              placeholder={"Prof. dr. A, Sp.OG(K)\ndr. B, Sp.OG(K)\ndr. C, Sp.OG(K)"}
            />
          </div>
        </div>
      )}

      {(jenis === "publikasi" || jenis === "presentasi") && (
        <div className="grid gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2 dark:bg-slate-800/40 dark:ring-slate-700">
          <div className={jenis === "presentasi" ? "" : "sm:col-span-2"}>
            <label className={label}>
              {jenis === "publikasi"
                ? "Nama jurnal / prosiding"
                : "Nama event / konferensi"}
            </label>
            <input
              name="penerbit"
              defaultValue={initial?.penerbit ?? ""}
              className={input}
              placeholder={
                jenis === "publikasi"
                  ? "mis. Indonesian Journal of Obstetrics…"
                  : "mis. PIT POGI 2026"
              }
            />
          </div>
          {jenis === "presentasi" && (
            <div>
              <label className={label}>Bentuk</label>
              <select
                name="bentuk"
                defaultValue={initial?.bentuk ?? "oral"}
                className={input}
              >
                {Object.entries(BENTUK_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={label}>Tingkat</label>
            <select
              name="tingkat"
              defaultValue={initial?.tingkat ?? "nasional"}
              className={input}
            >
              {Object.entries(TINGKAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {(jenis === "publikasi" || jenis === "presentasi") && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/40 dark:ring-slate-700">
          <div className="flex items-center justify-between">
            <label className={label}>Co-author (selain pembimbing)</label>
            <button
              type="button"
              onClick={() =>
                setCoAuthors((a) => [...a, { nama: "", korespondensi: false }])
              }
              className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              + Tambah co-author
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Urutan dari atas = urutan penulis. Centang penulis korespondensi.
          </p>
          {coAuthors.length === 0 && (
            <p className="py-1 text-xs text-slate-400 dark:text-slate-500">
              Belum ada co-author.
            </p>
          )}
          {coAuthors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {i + 1}.
              </span>
              <input
                value={c.nama}
                onChange={(e) => setCo(i, { nama: e.target.value })}
                className={`${inputSm} min-w-0 flex-1`}
                placeholder="Nama co-author"
              />
              <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!c.korespondensi}
                  onChange={(e) =>
                    setCo(i, { korespondensi: e.target.checked })
                  }
                />
                koresp.
              </label>
              <button
                type="button"
                onClick={() => moveCo(i, -1)}
                disabled={i === 0}
                aria-label="Naikkan"
                className={miniBtn}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveCo(i, 1)}
                disabled={i === coAuthors.length - 1}
                aria-label="Turunkan"
                className={miniBtn}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  setCoAuthors((a) => a.filter((_, j) => j !== i))
                }
                aria-label="Hapus"
                className={`${miniBtn} text-rose-600 dark:text-rose-400`}
              >
                ✕
              </button>
            </div>
          ))}
          <input
            type="hidden"
            name="co_authors"
            value={JSON.stringify(coAuthors.filter((c) => c.nama.trim()))}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Tanggal</label>
          <input
            type="date"
            name="tanggal"
            defaultValue={initial?.tanggal ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>
            Pembimbing{" "}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              (wajib saat diajukan)
            </span>
          </label>
          <Combobox
            name="pembimbing_id"
            defaultValue={initial?.pembimbing_id ?? ""}
            placeholder="Cari pembimbing…"
            options={supervisors.map((s) => ({
              value: s.id,
              label: s.full_name,
            }))}
          />
        </div>
      </div>

      <div>
        <label className={label}>
          {jenis === "publikasi" ? "DOI / tautan publikasi" : "Tautan berkas"}{" "}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            (opsional — URL Drive/DOI/sertifikat)
          </span>
        </label>
        <input
          type="url"
          name="evidence_url"
          defaultValue={initial?.evidence_url ?? ""}
          className={input}
          placeholder="https://drive.google.com/…"
        />
      </div>

      <div>
        <label className={label}>Catatan</label>
        <textarea
          name="catatan"
          rows={2}
          defaultValue={initial?.catatan ?? ""}
          className={input}
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          name="aksi"
          value="draft"
          disabled={pending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/50"
        >
          Simpan draft
        </button>
        <button
          type="submit"
          name="aksi"
          value="ajukan"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Ajukan untuk verifikasi
        </button>
      </div>
    </form>
  );
}
