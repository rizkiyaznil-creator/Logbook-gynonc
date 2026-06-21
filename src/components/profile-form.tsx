"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/(app)/profil/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import type { Profile } from "@/lib/types";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const label = "block text-sm font-medium text-slate-700 dark:text-slate-300";

export type ResidentData = {
  no_peserta: string | null;
  angkatan: string | null;
  tanggal_mulai: string | null;
};

export function ProfileForm({
  profile,
  resident,
}: {
  profile: Profile;
  resident: ResidentData | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const isResiden = profile.role === "residen";

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div>
        <label className={label}>Foto profil</label>
        <div className="mt-2">
          <AvatarUpload
            userId={profile.id}
            name={profile.full_name}
            initialUrl={profile.avatar_url}
          />
        </div>
      </div>

      <div>
        <label className={label}>Nama lengkap</label>
        <input
          name="full_name"
          required
          defaultValue={profile.full_name}
          className={input}
        />
      </div>

      <div>
        <label className={label}>Email</label>
        <input
          value={profile.email ?? ""}
          disabled
          className={`${input} bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500`}
        />
        <p className="mt-1 text-xs text-slate-400">
          Email tidak bisa diubah di sini.
        </p>
      </div>

      <div>
        <label className={label}>No. HP / WhatsApp</label>
        <input
          name="no_telp"
          defaultValue={profile.no_telp ?? ""}
          className={input}
          placeholder="mis. 0812xxxxxxx"
        />
      </div>

      {isResiden ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>No. Peserta / NIM</label>
              <input
                name="no_peserta"
                defaultValue={resident?.no_peserta ?? ""}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Angkatan</label>
              <input
                name="angkatan"
                defaultValue={resident?.angkatan ?? ""}
                className={input}
                placeholder="mis. 2024-1"
              />
            </div>
          </div>
          <div>
            <label className={label}>Tanggal mulai pendidikan</label>
            <input
              type="date"
              name="tanggal_mulai"
              defaultValue={resident?.tanggal_mulai ?? ""}
              className={input}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>NIP / NIDN</label>
              <input
                name="nip"
                defaultValue={profile.nip ?? ""}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Jabatan / Gelar</label>
              <input
                name="jabatan"
                defaultValue={profile.jabatan ?? ""}
                className={input}
                placeholder="mis. Konsultan Onkologi Ginekologi"
              />
            </div>
          </div>
          <div>
            <label className={label}>Divisi &amp; Institusi</label>
            <input
              name="institusi"
              defaultValue={profile.institusi ?? ""}
              className={input}
              placeholder="mis. Divisi Onkologi Ginekologi, FK USU"
            />
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-teal-700">Profil tersimpan.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Simpan Profil"}
      </button>
    </form>
  );
}
