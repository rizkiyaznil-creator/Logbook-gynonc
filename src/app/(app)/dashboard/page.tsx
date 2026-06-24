import { Suspense } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentProgress } from "@/components/resident-progress";
import { ResidentTimeline } from "@/components/resident-timeline";
import { AcademicStats, AcademicRekap } from "@/components/academic-stats";
import { TableCard } from "@/components/table-card";
import { ProgressSkeleton, Skeleton } from "@/components/skeleton";
import { Icons } from "@/components/icons";
import { Avatar } from "@/components/avatar";

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
        <Suspense fallback={<Skeleton className="h-44 w-full rounded-2xl" />}>
          <ResidentTimeline residentId={profile.id} />
        </Suspense>
        <Suspense fallback={<ProgressSkeleton />}>
          <ResidentProgress residentId={profile.id} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <AcademicStats residentId={profile.id} />
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
    .select("id, no_peserta, angkatan, profiles(full_name, avatar_url)")
    .order("angkatan");

  type Prof = { full_name: string; avatar_url: string | null };
  const list = (residents ?? []) as {
    id: string;
    no_peserta: string | null;
    angkatan: string | null;
    profiles: Prof | Prof[] | null;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Icons.users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Daftar Residen
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {list.length} residen terdaftar
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <AcademicRekap />
      </Suspense>

      <TableCard>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">No. Peserta</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Angkatan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((r) => {
              const prof = Array.isArray(r.profiles)
                ? r.profiles[0]
                : r.profiles;
              const nama = prof?.full_name;
              return (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {r.no_peserta ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-2.5">
                      <Avatar
                        name={nama ?? "?"}
                        src={prof?.avatar_url}
                        size={32}
                      />
                      {nama ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.angkatan ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/residen/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
                    >
                      Lihat progress →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  Belum ada residen terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
