import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentProgress } from "@/components/resident-progress";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "residen") {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-slate-800">
          Ringkasan Pencapaian Kompetensi
        </h1>
        <ResidentProgress residentId={profile.id} />
      </div>
    );
  }
  return <StaffDashboard />;
}

async function StaffDashboard() {
  const supabase = await createClient();
  const { data: residents } = await supabase
    .from("residents")
    .select("id, no_peserta, angkatan, profiles(full_name)")
    .order("angkatan");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">Daftar Residen</h1>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">No. Peserta</th>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Angkatan</th>
              <th className="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(residents ?? []).map(
              (r: {
                id: string;
                no_peserta: string | null;
                angkatan: string | null;
                profiles: { full_name: string } | { full_name: string }[] | null;
              }) => {
                const nama = Array.isArray(r.profiles)
                  ? r.profiles[0]?.full_name
                  : r.profiles?.full_name;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {r.no_peserta ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{nama ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.angkatan ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/residen/${r.id}`}
                        className="text-teal-700 hover:underline"
                      >
                        Lihat progress
                      </Link>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
