import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "@/components/create-user-form";
import { UserRowActions } from "@/components/user-row-actions";
import { assignSupervisor, unassignSupervisor } from "./actions";
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
type Assignment = {
  id: string;
  resident_id: string;
  supervisor_id: string;
};

export default async function AdminPage() {
  const me = await requireProfile();
  if (!["kps", "admin"].includes(me.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [profRes, asgRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").order("role"),
    supabase.from("supervisor_assignments").select("id, resident_id, supervisor_id"),
  ]);

  const profiles = (profRes.data ?? []) as ProfileRow[];
  const assignments = (asgRes.data ?? []) as Assignment[];
  const nameOf = (id: string) =>
    profiles.find((p) => p.id === id)?.full_name ?? "—";

  const residents = profiles.filter((p) => p.role === "residen");
  const supervisors = profiles.filter((p) => p.role === "supervisor");

  const sel =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500";

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800">Manajemen User</h1>

      <CreateUserForm />

      {/* Daftar user */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Daftar Pengguna ({profiles.length})
        </h2>
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Peran</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-700">{p.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{p.email ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">
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
        </div>
      </section>

      {/* Penugasan supervisor */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Penugasan Supervisor → Residen
        </h2>

        <form
          action={assignSupervisor}
          className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <label className="block text-xs text-slate-500">Residen</label>
            <select name="resident_id" required className={sel}>
              <option value="">Pilih residen…</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Supervisor</label>
            <select name="supervisor_id" required className={sel}>
              <option value="">Pilih supervisor…</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Tugaskan
          </button>
        </form>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Residen</th>
                <th className="px-4 py-2">Supervisor</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Belum ada penugasan.
                  </td>
                </tr>
              )}
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-slate-700">
                    {nameOf(a.resident_id)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {nameOf(a.supervisor_id)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={unassignSupervisor}>
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <button className="text-xs text-rose-700 hover:underline">
                        Lepas
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
