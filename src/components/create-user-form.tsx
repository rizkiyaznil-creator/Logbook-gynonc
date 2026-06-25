"use client";

import { useActionState, useState } from "react";
import { createUser } from "@/app/(app)/admin/actions";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-200";

export type ProgramOption = { id: string; kode: string; nama: string };

// Peran yang memiliki "program rumah". DPJP/penguji/admin lintas-program.
const PROGRAM_ROLES = ["residen", "kps"];

export function CreateUserForm({
  programs,
  residenOnly = false,
}: {
  /** Prodi yang boleh ditugaskan oleh pemanggil (super-admin: semua aktif;
   *  KPS: hanya prodi-prodi yang dikelolanya). */
  programs: ProgramOption[];
  /** KPS hanya boleh membuat residen → kunci peran ke "Residen". */
  residenOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createUser, null);
  const [role, setRole] = useState("residen");
  const needsProgram = PROGRAM_ROLES.includes(role);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
    >
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buat User Baru</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nama lengkap</label>
          <input name="full_name" required className={input} />
        </div>
        <div>
          <label className={label}>Peran</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={residenOnly}
            className={`${input} disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800`}
          >
            <option value="residen">Residen</option>
            {!residenOnly && (
              <>
                <option value="supervisor">Supervisor (DPJP)</option>
                <option value="penguji">Penguji</option>
                <option value="kps">KPS / Admin Prodi</option>
                <option value="admin">Administrator</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" required className={input} />
        </div>
        <div>
          <label className={label}>Password awal</label>
          <input name="password" type="text" required className={input} />
        </div>

        {/* Prodi — hanya untuk residen/KPS. */}
        {needsProgram && (
          <div className="sm:col-span-2">
            <label className={label}>
              {role === "kps" ? "Prodi yang dikelola" : "Prodi"}
            </label>

            {role === "kps" ? (
              // KPS: bisa membawahi beberapa prodi sekaligus.
              <div className="mt-1 space-y-1.5 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
                {programs.length === 0 && (
                  <p className="text-xs text-slate-400">Tidak ada prodi tersedia.</p>
                )}
                {programs.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="program_ids"
                      value={p.id}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {p.nama} <span className="text-xs text-slate-400">({p.kode})</span>
                  </label>
                ))}
                <p className="pt-1 text-xs text-slate-400">
                  Centang semua prodi yang dibawahi KPS ini (boleh lebih dari satu).
                </p>
              </div>
            ) : (
              // Residen: tepat satu prodi.
              <select name="program_id" required className={input} defaultValue="">
                <option value="" disabled>
                  — pilih prodi —
                </option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.kode})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-teal-700">User berhasil dibuat.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {pending ? "Membuat…" : "Buat User"}
      </button>
    </form>
  );
}
