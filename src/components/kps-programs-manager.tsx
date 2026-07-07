"use client";

import { useState } from "react";
import { setKpsPrograms } from "@/app/(app)/admin/actions";
import type { ProgramOption } from "@/components/create-user-form";
import { ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

export type KpsUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  program_ids: string[];
};

/**
 * Atur prodi yang dibawahi tiap KPS (super-admin). Satu KPS bisa mengelola
 * beberapa prodi sekaligus — mis. KPS subspesialis untuk Fetomaternal, FER,
 * dan Onkogin.
 */
export function KpsProgramsManager({
  kpsUsers,
  programs,
}: {
  kpsUsers: KpsUser[];
  programs: ProgramOption[];
}) {
  if (kpsUsers.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Belum ada Ketua Prodi / SPS / Admin Prodi.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {kpsUsers.map((u) => (
        <KpsRow key={u.id} user={u} programs={programs} />
      ))}
    </div>
  );
}

function KpsRow({
  user,
  programs,
}: {
  user: KpsUser;
  programs: ProgramOption[];
}) {
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (fd) => {
        await setKpsPrograms(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <input type="hidden" name="user_id" value={user.id} />
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {user.full_name}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {user.email ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
              Tersimpan
            </span>
          )}
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            Simpan
          </button>
        </div>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {programs.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <input
              type="checkbox"
              name="program_ids"
              value={p.id}
              defaultChecked={user.program_ids.includes(p.id)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            {p.nama} <span className="text-xs text-slate-400">({p.kode})</span>
          </label>
        ))}
      </div>
    </form>
  );
}
