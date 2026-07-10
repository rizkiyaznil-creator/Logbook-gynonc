"use client";

import { type MouseEvent, useActionState, useRef, useState } from "react";
import { Combobox } from "@/components/combobox";
import { saveTemplate } from "@/app/(app)/logbook/actions";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  EntryType,
  LogEntry,
  SupervisorOption,
  ProgramConfig,
} from "@/lib/types";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-200";

/** Penanda field wajib. */
function Star() {
  return <span className="text-rose-500">*</span>;
}

// Field wajib saat DIAJUKAN (harus sama dengan validasi server di actions.ts).
type ReqField = [name: string, label: string];
const REQ_COMMON: ReqField[] = [
  ["entry_date", "Tanggal"],
  ["setting", "Setting"],
  ["rumah_sakit", "Rumah Sakit"],
  ["supervisor_id", "DPJP penanggung jawab"],
  ["disease_id", "Diagnosis"],
  ["patient_code", "Kode pasien / No. RM"],
  ["patient_age", "Usia"],
  ["catatan", "Catatan"],
];
const REQ_BY_TYPE: Record<EntryType, ReqField[]> = {
  prosedur: [
    ["procedure_id", "Prosedur"],
    ["surgical_role", "Peran"],
    ["supervision_level", "Tingkat kemandirian"],
  ],
  penatalaksanaan: [["clinical_competency_id", "Komponen Penatalaksanaan"]],
  kasus: [],
};

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
  config,
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
  /** Konfigurasi program residen (label tabel, FIGO, opsi stadium). */
  config?: ProgramConfig;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState<EntryType>(initial?.entry_type ?? "prosedur");
  const templateNameRef = useRef<HTMLInputElement>(null);
  const [tplError, setTplError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validasi klien saat menekan "Ajukan": semua field wajib harus terisi.
  // "Simpan draft" & "Simpan template" tidak divalidasi.
  function handleAjukan(e: MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const fd = new FormData(form);
    const req = [...REQ_COMMON, ...REQ_BY_TYPE[type]];
    const missing = req
      .filter(([name]) => !String(fd.get(name) ?? "").trim())
      .map(([, lbl]) => lbl);
    if (missing.length > 0) {
      e.preventDefault();
      setSubmitError(`Lengkapi dulu sebelum diajukan: ${missing.join(", ")}.`);
    }
  }

  const figoEnabled = config?.figo_enabled ?? true;
  const stagingOptions = config?.staging_options ?? [];
  const labelProsedur = config?.label_tabel_prosedur?.trim();
  const labelPenatalaksanaan = config?.label_tabel_penatalaksanaan?.trim();
  const suffix = (s?: string) => (s ? ` (${s})` : "");

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {initial?.id && <input type="hidden" name="entry_id" value={initial.id} />}

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-800">
        Field bertanda <Star /> wajib diisi sebelum{" "}
        <b>Ajukan untuk verifikasi</b>. Anda tetap bisa <b>Simpan draft</b>{" "}
        meski belum lengkap.
      </p>

      <div>
        <label className={label}>
          Jenis Entri <Star />
        </label>
        <select
          name="entry_type"
          value={type}
          onChange={(e) => setType(e.target.value as EntryType)}
          disabled={lockType}
          className={input}
        >
          <option value="prosedur">
            Prosedur / Tindakan{suffix(labelProsedur)}
          </option>
          <option value="penatalaksanaan">
            Penatalaksanaan Klinis{suffix(labelPenatalaksanaan)}
          </option>
          <option value="kasus">Kasus / Encounter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>
            Tanggal <Star />
          </label>
          <input
            type="date"
            name="entry_date"
            required
            defaultValue={initial?.entry_date ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>
            Setting <Star />
          </label>
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
          Rumah Sakit <Star />
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
          DPJP penanggung jawab <Star />
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
            <label className={label}>
              Prosedur <Star />
            </label>
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
              <label className={label}>
                Peran <Star />
              </label>
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
              <label className={label}>
                Tingkat kemandirian <Star />
              </label>
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
            <label className={label}>
              Komponen Penatalaksanaan <Star />
            </label>
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
          <label className={label}>
            Diagnosis (spektrum penyakit) <Star />
          </label>
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
        {figoEnabled && (
          <div>
            <label className={label}>Stadium FIGO</label>
            {stagingOptions.length > 0 ? (
              <select
                name="figo_stage"
                defaultValue={initial?.figo_stage ?? ""}
                className={input}
              >
                <option value="">—</option>
                {stagingOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="figo_stage"
                defaultValue={initial?.figo_stage ?? ""}
                className={input}
                placeholder="mis. IIIC"
              />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>
            Kode pasien / No. RM (tersamar) <Star />
          </label>
          <input
            name="patient_code"
            defaultValue={initial?.patient_code ?? ""}
            className={input}
            placeholder="mis. PX-0421"
          />
        </div>
        <div>
          <label className={label}>
            Usia <Star />
          </label>
          <input
            type="number"
            name="patient_age"
            defaultValue={initial?.patient_age ?? ""}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>
          Catatan <Star />
        </label>
        <textarea
          name="catatan"
          rows={4}
          defaultValue={initial?.catatan ?? ""}
          className={input}
          placeholder="Resume medis pasien — riwayat singkat, temuan, tindakan, dan hasil. Jaga identitas pasien tetap tersamar."
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
          Dapat ditautkan laporan operasi, foto atau video tindakan, maupun
          resume medis pasien. Setel akses tautan ke “siapa saja yang memiliki
          link → Pelihat”, dan pastikan seluruh identitas pasien tersamar.
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

      {submitError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          name="aksi"
          value="draft"
          formNoValidate
          onClick={() => setSubmitError(null)}
          disabled={pending}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
        >
          Simpan draft
        </button>
        <button
          type="submit"
          name="aksi"
          value="ajukan"
          onClick={handleAjukan}
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Ajukan untuk verifikasi
        </button>
      </div>
    </form>
  );
}
