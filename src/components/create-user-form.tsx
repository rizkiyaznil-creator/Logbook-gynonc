"use client";

import { useActionState } from "react";
import { createUser } from "@/app/(app)/admin/actions";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-200";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, null);

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-4 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
    >
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buat User Baru</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nama lengkap</label>
          <input name="full_name" required className={input} />
        </div>
        <div>
          <label className={label}>Peran</label>
          <select name="role" defaultValue="residen" className={input}>
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
