"use client";

import { useActionState, useState } from "react";
import { Combobox } from "@/components/combobox";
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
}: {
  diseases: Disease[];
  procedures: Procedure[];
  competencies: ClinicalCompetency[];
  supervisors: SupervisorOption[];
  hospitals: string[];
  action: FormAction;
  initial?: LogEntry;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState<EntryType>(initial?.entry_type ?? "prosedur");

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {initial && <input type="hidden" name="entry_id" value={initial.id} />}

      <div>
        <label className={label}>Jenis Entri</label>
        <select
          name="entry_type"
          value={type}
          onChange={(e) => setType(e.target.value as EntryType)}
          disabled={!!initial}
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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

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
