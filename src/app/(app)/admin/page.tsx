import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CreateUserForm,
  type ProgramOption,
} from "@/components/create-user-form";
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
};

export default async function AdminPage() {
  const me = await requireProfile();
  if (!["kps", "admin"].includes(me.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data }, { data: progData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").order("role"),
    supabase.from("programs").select("id, kode, nama").eq("aktif", true).order("kode"),
  ]);
  const profiles = (data ?? []) as ProfileRow[];
  const programs = (progData ?? []) as ProgramOption[];
  // KPS hanya boleh menempatkan user di programnya sendiri (terkunci) —
  // ambil langsung (tak bergantung filter aktif pada dropdown super-admin).
  let lockedProgram: ProgramOption | null = null;
  if (me.role === "kps" && me.program_id) {
    const { data: lp } = await supabase
      .from("programs")
      .select("id, kode, nama")
      .eq("id", me.program_id)
      .maybeSingle();
    lockedProgram = (lp as ProgramOption | null) ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Manajemen User</h1>

      <CreateUserForm programs={programs} lockedProgram={lockedProgram} />

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
