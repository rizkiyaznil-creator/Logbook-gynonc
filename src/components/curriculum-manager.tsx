"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveProcedure,
  deleteProcedure,
  saveClinical,
  deleteClinical,
  type ProcedureInput,
  type ClinicalInput,
} from "@/app/(app)/kurikulum/actions";

export type ProcedureRow = {
  id: string;
  no: number;
  kode: string;
  nama: string;
  target_min: number;
  satuan: string | null;
  peran_disyaratkan: string | null;
  peran_dihitung: string[];
  syarat_tambahan: string | null;
  perlu_verifikasi: boolean;
};
export type ClinicalRow = {
  id: string;
  no: number;
  kode: string;
  komponen: string;
  penjabaran: string | null;
  kriteria_kinerja: string | null;
  target_min: number;
  satuan: string | null;
  perlu_verifikasi: boolean;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelCls = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";
const th =
  "px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-3 py-2 align-top text-slate-700 dark:text-slate-200";
const btnGhost =
  "rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

// peran_dihitung array <-> preset
const PERAN_PRESETS = [
  { v: "all", label: "Hitung semua peran", arr: [] as string[] },
  { v: "op_ko", label: "Operator & ko-operator", arr: ["operator_utama", "ko_operator"] },
  { v: "op", label: "Operator utama saja", arr: ["operator_utama"] },
];
function arrToPreset(arr: string[]): string {
  if (!arr || arr.length === 0) return "all";
  if (arr.includes("ko_operator")) return "op_ko";
  return "op";
}
function presetToArr(v: string): string[] {
  return PERAN_PRESETS.find((p) => p.v === v)?.arr ?? [];
}

function ConfirmDelete({
  onConfirm,
  pending,
}: {
  onConfirm: () => void;
  pending: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button onClick={() => setArmed(true)} className={btnGhost}>
        Hapus
      </button>
    );
  return (
    <span className="inline-flex gap-1">
      <button
        onClick={onConfirm}
        disabled={pending}
        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        Yakin
      </button>
      <button onClick={() => setArmed(false)} className={btnGhost}>
        Batal
      </button>
    </span>
  );
}

export function CurriculumManager({
  programId,
  procedures,
  clinical,
  canEdit,
}: {
  programId: string;
  procedures: ProcedureRow[];
  clinical: ClinicalRow[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<"prosedur" | "penatalaksanaan">("prosedur");
  const nextProcNo = Math.max(0, ...procedures.map((p) => p.no)) + 1;
  const nextClinNo = Math.max(0, ...clinical.map((c) => c.no)) + 1;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["prosedur", "penatalaksanaan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-teal-500 text-teal-700 dark:text-teal-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {t} ({t === "prosedur" ? procedures.length : clinical.length})
          </button>
        ))}
      </div>

      {tab === "prosedur" ? (
        <ProcedureSection
          programId={programId}
          rows={procedures}
          nextNo={nextProcNo}
          canEdit={canEdit}
        />
      ) : (
        <ClinicalSection
          programId={programId}
          rows={clinical}
          nextNo={nextClinNo}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROSEDUR
// ---------------------------------------------------------------------------
function emptyProc(no: number): ProcedureInput {
  return {
    no,
    kode: `PR-${String(no).padStart(2, "0")}`,
    nama: "",
    target_min: 1,
    satuan: "kasus",
    peran_disyaratkan: "",
    peran_dihitung: [],
    syarat_tambahan: "",
    perlu_verifikasi: false,
  };
}

function ProcedureSection({
  programId,
  rows,
  nextNo,
  canEdit,
}: {
  programId: string;
  rows: ProcedureRow[];
  nextNo: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<ProcedureInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setError(null);
    setEditing(emptyProc(nextNo));
  }
  function openEdit(r: ProcedureRow) {
    setError(null);
    setEditing({
      id: r.id,
      no: r.no,
      kode: r.kode,
      nama: r.nama,
      target_min: r.target_min,
      satuan: r.satuan ?? "",
      peran_disyaratkan: r.peran_disyaratkan ?? "",
      peran_dihitung: r.peran_dihitung ?? [],
      syarat_tambahan: r.syarat_tambahan ?? "",
      perlu_verifikasi: r.perlu_verifikasi,
    });
  }
  function save() {
    if (!editing) return;
    setError(null);
    start(async () => {
      const res = await saveProcedure(programId, editing);
      if (res.error) return setError(res.error);
      setEditing(null);
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      const res = await deleteProcedure(programId, id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && !editing && (
        <button
          onClick={openNew}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Prosedur baru
        </button>
      )}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      {editing && (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-500/30 dark:bg-teal-500/5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>No</label>
              <input
                type="number"
                className={inputCls}
                value={editing.no}
                onChange={(e) =>
                  setEditing({ ...editing, no: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Kode</label>
              <input
                className={inputCls}
                value={editing.kode}
                onChange={(e) => setEditing({ ...editing, kode: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Nama prosedur</label>
              <input
                className={inputCls}
                value={editing.nama}
                onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Target min</label>
              <input
                type="number"
                className={inputCls}
                value={editing.target_min}
                onChange={(e) =>
                  setEditing({ ...editing, target_min: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Satuan</label>
              <input
                className={inputCls}
                value={editing.satuan}
                onChange={(e) =>
                  setEditing({ ...editing, satuan: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Peran dihitung ke target</label>
              <select
                className={inputCls}
                value={arrToPreset(editing.peran_dihitung)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    peran_dihitung: presetToArr(e.target.value),
                  })
                }
              >
                {PERAN_PRESETS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Peran disyaratkan (teks standar)</label>
              <input
                className={inputCls}
                value={editing.peran_disyaratkan}
                onChange={(e) =>
                  setEditing({ ...editing, peran_disyaratkan: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Syarat tambahan</label>
              <input
                className={inputCls}
                value={editing.syarat_tambahan}
                onChange={(e) =>
                  setEditing({ ...editing, syarat_tambahan: e.target.value })
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={editing.perlu_verifikasi}
              onChange={(e) =>
                setEditing({ ...editing, perlu_verifikasi: e.target.checked })
              }
            />
            Tandai perlu verifikasi angka (ragu thd sumber)
          </label>
          <p className="text-[11px] text-slate-400">
            Menyimpan prosedur otomatis membuat/menyelaraskan 1 butir pengetahuan
            prosedur (kode K{editing.kode}).
          </p>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className={th}>Kode</th>
              <th className={th}>Nama</th>
              <th className={`${th} text-right`}>Target</th>
              <th className={th}>Dihitung</th>
              {canEdit && <th className={`${th} text-right`}>Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap font-medium`}>{r.kode}</td>
                <td className={td}>
                  {r.nama}
                  {r.syarat_tambahan && (
                    <span className="block text-xs text-slate-400">
                      {r.syarat_tambahan}
                    </span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  {r.target_min} {r.satuan ?? ""}
                </td>
                <td className={td}>
                  <span className="text-xs text-slate-500">
                    {arrToPreset(r.peran_dihitung) === "all"
                      ? "semua peran"
                      : arrToPreset(r.peran_dihitung) === "op_ko"
                        ? "op + ko-op"
                        : "operator"}
                  </span>
                </td>
                {canEdit && (
                  <td className={`${td} text-right`}>
                    <span className="inline-flex gap-1.5">
                      <button onClick={() => openEdit(r)} className={btnGhost}>
                        Edit
                      </button>
                      <ConfirmDelete
                        onConfirm={() => remove(r.id)}
                        pending={pending}
                      />
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 5 : 4}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Belum ada prosedur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PENATALAKSANAAN
// ---------------------------------------------------------------------------
function emptyClin(no: number): ClinicalInput {
  return {
    no,
    kode: `PK-${String(no).padStart(2, "0")}`,
    komponen: "",
    penjabaran: "",
    kriteria_kinerja: "",
    target_min: 1,
    satuan: "komponen (ambang kualitas)",
    perlu_verifikasi: false,
  };
}

function ClinicalSection({
  programId,
  rows,
  nextNo,
  canEdit,
}: {
  programId: string;
  rows: ClinicalRow[];
  nextNo: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<ClinicalInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openEdit(r: ClinicalRow) {
    setError(null);
    setEditing({
      id: r.id,
      no: r.no,
      kode: r.kode,
      komponen: r.komponen,
      penjabaran: r.penjabaran ?? "",
      kriteria_kinerja: r.kriteria_kinerja ?? "",
      target_min: r.target_min,
      satuan: r.satuan ?? "",
      perlu_verifikasi: r.perlu_verifikasi,
    });
  }
  function save() {
    if (!editing) return;
    setError(null);
    start(async () => {
      const res = await saveClinical(programId, editing);
      if (res.error) return setError(res.error);
      setEditing(null);
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      const res = await deleteClinical(programId, id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && !editing && (
        <button
          onClick={() => {
            setError(null);
            setEditing(emptyClin(nextNo));
          }}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Penatalaksanaan baru
        </button>
      )}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      {editing && (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-500/30 dark:bg-teal-500/5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>No</label>
              <input
                type="number"
                className={inputCls}
                value={editing.no}
                onChange={(e) =>
                  setEditing({ ...editing, no: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Kode</label>
              <input
                className={inputCls}
                value={editing.kode}
                onChange={(e) => setEditing({ ...editing, kode: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Komponen</label>
              <input
                className={inputCls}
                value={editing.komponen}
                onChange={(e) =>
                  setEditing({ ...editing, komponen: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Penjabaran</label>
            <textarea
              className={inputCls}
              rows={2}
              value={editing.penjabaran}
              onChange={(e) =>
                setEditing({ ...editing, penjabaran: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelCls}>Kriteria kinerja minimal</label>
            <textarea
              className={inputCls}
              rows={2}
              value={editing.kriteria_kinerja}
              onChange={(e) =>
                setEditing({ ...editing, kriteria_kinerja: e.target.value })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Target min</label>
              <input
                type="number"
                className={inputCls}
                value={editing.target_min}
                onChange={(e) =>
                  setEditing({ ...editing, target_min: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Satuan</label>
              <input
                className={inputCls}
                value={editing.satuan}
                onChange={(e) =>
                  setEditing({ ...editing, satuan: e.target.value })
                }
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Untuk kompetensi berbasis kualitas (mis. “kelengkapan ≥75%”), pakai
            target 1 sebagai checklist.
          </p>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className={th}>Kode</th>
              <th className={th}>Komponen</th>
              <th className={`${th} text-right`}>Target</th>
              {canEdit && <th className={`${th} text-right`}>Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap font-medium`}>{r.kode}</td>
                <td className={td}>
                  {r.komponen}
                  {r.kriteria_kinerja && (
                    <span className="block text-xs text-slate-400">
                      {r.kriteria_kinerja}
                    </span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  {r.target_min} {r.satuan ?? ""}
                </td>
                {canEdit && (
                  <td className={`${td} text-right`}>
                    <span className="inline-flex gap-1.5">
                      <button onClick={() => openEdit(r)} className={btnGhost}>
                        Edit
                      </button>
                      <ConfirmDelete
                        onConfirm={() => remove(r.id)}
                        pending={pending}
                      />
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 4 : 3}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Belum ada penatalaksanaan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
