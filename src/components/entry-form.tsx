"use client";

import { useActionState, useRef, useState } from "react";
import { Combobox } from "@/components/combobox";
import { saveTemplate } from "@/app/(app)/logbook/actions";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  EntryType,
  LogEntry,
  SupervisorOption,
} from "@/lib/types";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-200";

type FormAction = (
  prev: unknown,
  formData: FormData,
) => Promise<{ error?: string } | void>;

export function EntryForm({
  diseases,
  procedures,
  competencies,
  supervisors,
  hospitals,
  action,
  initial,
  lockType = false,
}: {
  diseases: Disease[];
  procedures: Procedure[];
  competencies: ClinicalCompetency[];
  supervisors: SupervisorOption[];
  hospitals: string[];
  action: FormAction;
  initial?: Partial<LogEntry>;
  /** Kunci jenis entri (mode sunting). Saat prefill template tetap bisa diubah. */
  lockType?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState<EntryType>(initial?.entry_type ?? "prosedur");
  const templateNameRef = useRef<HTMLInputElement>(null);
  const [tplError, setTplError] = useState<string | null>(null);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {initial?.id && <input type="hidden" name="entry_id" value={initial.id} />}

      <div>
        <label className={label}>Jenis Entri</label>
        <select
          name="entry_type"
          value={type}
          onChange={(e) => setType(e.target.value as EntryType)}
          disabled={lockType}
          className={input}
        >
          <option value="prosedur">Prosedur / Tindakan (Tabel 24)</option>
          <option value="penatalaksanaan">
            Penatalaksanaan Klinis (Tabel 18)
          </option>
          <option value="kasus">Kasus / Encounter (Tabel 10)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Tanggal</label>
          <input
            type="date"
            name="entry_date"
            required
            defaultValue={initial?.entry_date ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Setting</label>
          <select
            name="setting"
            defaultValue={initial?.setting ?? ""}
            className={input}
          >
            <option value="">—</option>
            <option>Poliklinik</option>
            <option>Bangsal</option>
            <option>Kamar Operasi</option>
            <option>IGD</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>
          Rumah Sakit{" "}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            (wajib saat diajukan)
          </span>
        </label>
        <input
          name="rumah_sakit"
          list="rs-list"
          defaultValue={initial?.rumah_sakit ?? ""}
          placeholder="Pilih atau ketik nama RS…"
          className={input}
          autoComplete="off"
        />
        <datalist id="rs-list">
          {hospitals.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </div>

      <div>
        <label className={label}>
          DPJP penanggung jawab{" "}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            (wajib saat diajukan)
          </span>
        </label>
        <Combobox
          name="supervisor_id"
          defaultValue={initial?.supervisor_id ?? ""}
          placeholder="Cari DPJP…"
          options={supervisors.map((s) => ({ value: s.id, label: s.full_name }))}
        />
      </div>

      {type === "prosedur" && (
        <>
          <div>
            <label className={label}>Prosedur</label>
            <Combobox
              name="procedure_id"
              defaultValue={initial?.procedure_id ?? ""}
              placeholder="Cari prosedur (mis. ‘radikal’, ‘USG’)…"
              options={procedures.map((p) => ({
                value: p.id,
                label: `${p.kode} — ${p.nama}`,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Peran</label>
              <select
                name="surgical_role"
                defaultValue={initial?.surgical_role ?? "operator_utama"}
                className={input}
              >
                <option value="operator_utama">Operator utama</option>
                <option value="ko_operator">Ko-operator senior</option>
                <option value="asisten">Asisten</option>
                <option value="observer">Observer</option>
              </select>
            </div>
            <div>
              <label className={label}>Tingkat kemandirian</label>
              <select
                name="supervision_level"
                defaultValue={initial?.supervision_level ?? ""}
                className={input}
              >
                <option value="">—</option>
                <option value="observasi">Observasi</option>
                <option value="dibantu_penuh">Dibantu penuh</option>
                <option value="dibantu_sebagian">Dibantu sebagian</option>
                <option value="mandiri">Mandiri</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Komplikasi (bila ada)</label>
            <input
              name="complications"
              defaultValue={initial?.complications ?? ""}
              className={input}
            />
          </div>
        </>
      )}

      {type === "penatalaksanaan" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Komponen Penatalaksanaan</label>
            <Combobox
              name="clinical_competency_id"
              defaultValue={initial?.clinical_competency_id ?? ""}
              placeholder="Cari komponen…"
              options={competencies.map((c) => ({
                value: c.id,
                label: `${c.kode} — ${c.komponen}`,
              }))}
            />
          </div>
          <div>
            <label className={label}>Jenis dokumentasi (untuk PK-09)</label>
            <select
              name="dokumentasi_jenis"
              defaultValue={initial?.dokumentasi_jenis ?? ""}
              className={input}
            >
              <option value="">—</option>
              <option value="mdt">Presentasi MDT</option>
              <option value="breaking_bad_news">Breaking bad news</option>
              <option value="handover">Handover (SBAR)</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Diagnosis (spektrum penyakit)</label>
          <Combobox
            name="disease_id"
            defaultValue={initial?.disease_id ?? ""}
            placeholder="Cari diagnosis (mis. ‘serviks’)…"
            options={diseases.map((d) => ({
              value: d.id,
              label: `${d.no}. ${d.nama_id}`,
            }))}
          />
        </div>
        <div>
          <label className={label}>Stadium FIGO</label>
          <input
            name="figo_stage"
            defaultValue={initial?.figo_stage ?? ""}
            className={input}
            placeholder="mis. IIIC"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Kode pasien (tersamar)</label>
          <input
            name="patient_code"
            defaultValue={initial?.patient_code ?? ""}
            className={input}
            placeholder="mis. PX-0421"
          />
        </div>
        <div>
          <label className={label}>Usia</label>
          <input
            type="number"
            name="patient_age"
            defaultValue={initial?.patient_age ?? ""}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Catatan</label>
        <textarea
          name="catatan"
          rows={3}
          defaultValue={initial?.catatan ?? ""}
          className={input}
        />
      </div>

      <div>
        <label className={label}>
          Tautan bukti{" "}
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
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Setel akses tautan ke “siapa saja yang memiliki link → Pelihat”, dan
          pastikan identitas pasien tersamar.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {/* Simpan sebagai template */}
      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Simpan sebagai template
        </div>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Isian saat ini (jenis, kompetensi, DPJP, RS, peran, dll.) disimpan agar
          bisa dipakai ulang. Tanggal & data pasien tidak ikut.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={templateNameRef}
            name="template_nama"
            placeholder="Nama template, mis. ‘Operator histerektomi radikal’"
            className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            formAction={saveTemplate}
            formNoValidate
            onClick={(e) => {
              if (!templateNameRef.current?.value.trim()) {
                e.preventDefault();
                setTplError("Beri nama template terlebih dahulu.");
              }
            }}
            className="rounded-lg border border-teal-300 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-500/10"
          >
            Simpan template
          </button>
        </div>
        {tplError && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {tplError}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          name="aksi"
          value="draft"
          disabled={pending}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
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
