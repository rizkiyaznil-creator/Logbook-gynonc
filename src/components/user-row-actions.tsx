"use client";

import { changeRole, deleteUser } from "@/app/(app)/admin/actions";
import type { UserRole } from "@/lib/types";

export function UserRowActions({
  userId,
  currentRole,
  currentName,
  canEditRole = true,
  canDelete = true,
}: {
  userId: string;
  currentRole: UserRole;
  currentName: string;
  /** Boleh ubah peran (hanya super-admin). KPS: false. */
  canEditRole?: boolean;
  /** Boleh hapus user. KPS: hanya residen di prodinya. */
  canDelete?: boolean;
}) {
  // Tanpa wewenang apa pun (mis. DPJP di mata KPS) → baca-saja.
  if (!canEditRole && !canDelete) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {canEditRole && (
        <form action={changeRole} className="flex items-center gap-1">
          <input type="hidden" name="user_id" value={userId} />
          <select
            name="role"
            defaultValue={currentRole}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
          >
            <option value="residen">Residen</option>
            <option value="supervisor">Supervisor</option>
            <option value="kps">Ketua Prodi</option>
            <option value="sps">SPS / Sekretaris Prodi</option>
            <option value="admin_prodi">Admin Prodi</option>
            <option value="admin">Admin</option>
          </select>
          <button className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            Simpan
          </button>
        </form>
      )}
      {canDelete && (
        <form
          action={deleteUser}
          onSubmit={(e) => {
            if (!confirm(`Hapus user "${currentName}"? Tindakan ini permanen.`))
              e.preventDefault();
          }}
        >
          <input type="hidden" name="user_id" value={userId} />
          <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">
            Hapus
          </button>
        </form>
      )}
    </div>
  );
}
