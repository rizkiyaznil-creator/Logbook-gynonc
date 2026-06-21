"use client";

import { useActionState } from "react";
import { createAssessment } from "@/app/(app)/penilaian/actions";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const label = "block text-sm font-medium text-slate-700";

export type ResidentOption = { id: string; nama: string; no_peserta: string | null };
export type KnowledgeOption = {
  id: string;
  kode: string;
  topik: string;
  kategori: string;
};

export function AssessmentForm({
  residents,
  items,
}: {
  residents: ResidentOption[];
  items: KnowledgeOption[];
}) {
  const [state, formAction, pending] = useActionState(createAssessment, null);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <label className={label}>Residen</label>
        <select name="resident_id" required className={input}>
          <option value="">Pilih residen…</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.no_peserta ? `${r.no_peserta} — ` : ""}
              {r.nama}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Butir Pengetahuan</label>
        <select name="knowledge_item_id" required className={input}>
          <option value="">Pilih butir…</option>
          <optgroup label="Penatalaksanaan">
            {items
              .filter((i) => i.kategori === "penatalaksanaan")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.kode} — {i.topik}
                </option>
              ))}
          </optgroup>
          <optgroup label="Prosedur">
            {items
              .filter((i) => i.kategori === "prosedur")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.kode} — {i.topik}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Jenis ujian</label>
          <select name="exam_type" required className={input}>
            <option value="osce">OSCE</option>
            <option value="mcq">MCQ</option>
          </select>
        </div>
        <div>
          <label className={label}>Tanggal</label>
          <input type="date" name="exam_date" required className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Nilai</label>
          <input
            type="number"
            name="score"
            step="0.01"
            min="0"
            required
            className={input}
          />
        </div>
        <div>
          <label className={label}>Nilai maksimal</label>
          <input
            type="number"
            name="max_score"
            step="0.01"
            min="1"
            defaultValue={100}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Catatan</label>
        <input name="catatan" className={input} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-teal-700">Nilai tersimpan.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Simpan Nilai"}
      </button>
    </form>
  );
}
