import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentProgress } from "@/components/resident-progress";

export default async function ResidenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  // Hanya staf & supervisor yang boleh melihat detail residen lain.
  if (!["supervisor", "kps", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("residents")
    .select("no_peserta, angkatan, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  const res = data as {
    no_peserta: string | null;
    angkatan: string | null;
    profiles: { full_name: string } | { full_name: string }[] | null;
  } | null;

  const nama = Array.isArray(res?.profiles)
    ? res?.profiles[0]?.full_name
    : res?.profiles?.full_name;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Daftar residen
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-800">
          {nama ?? "Residen"}
          <span className="ml-2 text-sm font-normal text-slate-500">
            {res?.no_peserta ?? ""} {res?.angkatan ? `· ${res.angkatan}` : ""}
          </span>
        </h1>
      </div>
      <ResidentProgress residentId={id} />
    </div>
  );
}
