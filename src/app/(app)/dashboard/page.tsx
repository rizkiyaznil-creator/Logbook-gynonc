import { Suspense } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentProgress } from "@/components/resident-progress";
import { ProgressSkeleton } from "@/components/skeleton";
import { Icons } from "@/components/icons";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "residen") {
    const firstName = profile.full_name.split(" ").slice(0, 2).join(" ");
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-6 text-white shadow-sm">
          <div className="text-sm/relaxed text-teal-50">Selamat datang,</div>
          <h1 className="text-xl font-semibold">{firstName}</h1>
          <p className="mt-1 max-w-xl text-sm text-teal-50">
            Ringkasan pencapaian kompetensi Anda. Tambahkan entri logbook baru
            kapan saja lewat menu{" "}
            <span className="font-medium">Entri Baru</span>.
          </p>
        </div>
        <Suspense fallback={<ProgressSkeleton />}>
          <ResidentProgress residentId={profile.id} />
        </Suspense>
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

  const list = (residents ?? []) as {
    id: string;
    no_peserta: string | null;
    angkatan: string | null;
    profiles: { full_name: string } | { full_name: string }[] | null;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
          <Icons.users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">
            Daftar Residen
          </h1>
          <p className="text-sm text-slate-500">
            {list.length} residen terdaftar
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">No. Peserta</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Angkatan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => {
              const nama = Array.isArray(r.profiles)
                ? r.profiles[0]?.full_name
                : r.profiles?.full_name;
              return (
                <tr key={r.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {r.no_peserta ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {nama ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.angkatan ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/residen/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
                    >
                      Lihat progress →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Belum ada residen terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
