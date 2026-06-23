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
  lockedProgram,
}: {
  programs: ProgramOption[];
  /** Bila pemanggil KPS: program terkunci ke programnya (tak bisa pilih lain). */
  lockedProgram?: ProgramOption | null;
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
            className={input}
          >
            <option value="residen">Residen</option>
            <option value="supervisor">Supervisor (DPJP)</option>
            <option value="penguji">Penguji</option>
            <option value="kps">KPS / Admin Prodi</option>
            <option value="admin">Administrator</option>
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

        {/* Program rumah — hanya untuk residen/KPS. */}
        {needsProgram && (
          <div className="sm:col-span-2">
            <label className={label}>Program</label>
            {lockedProgram ? (
              <>
                <input
                  className={`${input} bg-slate-50 dark:bg-slate-800/50`}
                  value={lockedProgram.nama}
                  disabled
                  readOnly
                />
                <input type="hidden" name="program_id" value={lockedProgram.id} />
                <p className="mt-1 text-xs text-slate-400">
                  Terkunci ke program Anda.
                </p>
              </>
            ) : (
              <select name="program_id" required className={input} defaultValue="">
                <option value="" disabled>
                  — pilih program —
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
