import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getKpsProgramIds } from "@/lib/kps";
import {
  CreateUserForm,
  type ProgramOption,
} from "@/components/create-user-form";
import {
  KpsProgramsManager,
  type KpsUser,
} from "@/components/kps-programs-manager";
import { UserRowActions } from "@/components/user-row-actions";
import { TableCard } from "@/components/table-card";
import type { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  residen: "Residen",
  supervisor: "Supervisor",
  kps: "KPS / Admin Prodi",
  penguji: "Penguji",
  admin: "Administrator",
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  program_id: string | null;
};

export default async function AdminPage() {
  const me = await requireProfile();
  if (!["kps", "admin"].includes(me.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data }, { data: progData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, program_id")
      .order("role"),
    supabase.from("programs").select("id, kode, nama").eq("aktif", true).order("kode"),
  ]);
  let profiles = (data ?? []) as ProfileRow[];
  const allPrograms = (progData ?? []) as ProgramOption[];

  // Prodi yang boleh ditugaskan pemanggil: super-admin → semua aktif;
  // KPS → hanya prodi yang dikelolanya.
  let allowedPrograms = allPrograms;
  const isKps = me.role === "kps";
  let myProgramIds = new Set<string>();
  if (isKps) {
    myProgramIds = new Set(await getKpsProgramIds(supabase, me.id));
    allowedPrograms = allPrograms.filter((p) => myProgramIds.has(p.id));
    // KPS melihat: residen prodinya (dapat dikelola) + penguji & DPJP
    // (baca-saja). Admin & KPS lain disembunyikan.
    profiles = profiles.filter(
      (p) =>
        (p.role === "residen" && p.program_id && myProgramIds.has(p.program_id)) ||
        p.role === "supervisor" ||
        p.role === "penguji",
    );
  }

  // Peran yang boleh dibuat: super-admin → semua; KPS → residen/penguji/DPJP.
  const creatableRoles = isKps
    ? ["residen", "supervisor", "penguji"]
    : undefined;

  // Wewenang aksi per-baris untuk KPS: hapus hanya residen prodinya; tak boleh
  // ubah peran siapa pun. Super-admin: penuh.
  const rowCaps = (p: ProfileRow) => {
    if (!isKps) return { canEditRole: true, canDelete: true };
    const ownResiden =
      p.role === "residen" && !!p.program_id && myProgramIds.has(p.program_id);
    return { canEditRole: false, canDelete: ownResiden };
  };

  // Pengelola prodi-KPS (super-admin): daftar user KPS + prodi yang dibawahinya.
  let kpsUsers: KpsUser[] = [];
  if (me.role === "admin") {
    const kpsRows = profiles.filter((p) => p.role === "kps");
    if (kpsRows.length > 0) {
      const { data: links } = await supabase
        .from("kps_programs")
        .select("kps_id, program_id")
        .in(
          "kps_id",
          kpsRows.map((k) => k.id),
        );
      const byUser = new Map<string, string[]>();
      for (const l of (links ?? []) as { kps_id: string; program_id: string }[]) {
        byUser.set(l.kps_id, [...(byUser.get(l.kps_id) ?? []), l.program_id]);
      }
      kpsUsers = kpsRows.map((k) => ({
        id: k.id,
        full_name: k.full_name,
        email: k.email,
        program_ids: byUser.get(k.id) ?? [],
      }));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Manajemen User</h1>

      <CreateUserForm programs={allowedPrograms} allowedRoles={creatableRoles} />

      {me.role === "admin" && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Prodi yang Dikelola KPS
          </h2>
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
            Satu KPS dapat membawahi beberapa prodi (mis. KPS subspesialis untuk
            Fetomaternal, FER, dan Onkogin).
          </p>
          <KpsProgramsManager kpsUsers={kpsUsers} programs={allPrograms} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Daftar Pengguna ({profiles.length})
        </h2>
        <TableCard>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Peran</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{p.full_name}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{p.email ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {ROLE_LABEL[p.role]}
                  </td>
                  <td className="px-4 py-2">
                    <UserRowActions
                      userId={p.id}
                      currentRole={p.role}
                      currentName={p.full_name}
                      {...rowCaps(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Catatan: DPJP penanggung jawab dipilih per-entri oleh residen saat
          mencatat tindakan — tidak ada lagi penugasan tetap.
        </p>
      </section>
    </div>
  );
}
