"use client";

import { useActionState, useState } from "react";
import { Combobox } from "@/components/combobox";
import type {
  AcademicJenis,
  AcademicWork,
  SupervisorOption,
} from "@/lib/types";

export const JENIS_LABEL: Record<AcademicJenis, string> = {
  sari_pustaka: "Sari pustaka",
  telaah_jurnal: "Telaah/baca jurnal",
  laporan_kasus: "Laporan kasus",
  tesis: "Tesis / penelitian",
};
export const TAHAP_LABEL: Record<string, string> = {
  proposal: "Proposal",
  kaji_etik: "Kaji etik",
  pengumpulan_data: "Pengumpulan data",
  seminar_hasil: "Seminar hasil",
  sidang: "Sidang/ujian",
};

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
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
          Tautan berkas{" "}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            (opsional — URL Google Drive/cloud)
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
