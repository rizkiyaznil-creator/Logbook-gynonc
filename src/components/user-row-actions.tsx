"use client";

import { changeRole, deleteUser } from "@/app/(app)/admin/actions";
import type { UserRole } from "@/lib/types";

export function UserRowActions({
  userId,
  currentRole,
  currentName,
}: {
  userId: string;
  currentRole: UserRole;
  currentName: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <form action={changeRole} className="flex items-center gap-1">
        <input type="hidden" name="user_id" value={userId} />
        <select
          name="role"
          defaultValue={currentRole}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
        >
          <option value="residen">Residen</option>
          <option value="supervisor">Supervisor</option>
          <option value="penguji">Penguji</option>
          <option value="kps">KPS</option>
          <option value="admin">Admin</option>
        </select>
        <button className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
          Simpan
        </button>
      </form>
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
    </div>
  );
}
