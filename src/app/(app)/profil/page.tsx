import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type ResidentData } from "@/components/profile-form";

export default async function ProfilPage() {
  const profile = await requireProfile();
  let resident: ResidentData | null = null;

  if (profile.role === "residen") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("residents")
      .select("no_peserta, angkatan, tanggal_mulai")
      .eq("id", profile.id)
      .maybeSingle();
    resident = (data as ResidentData) ?? null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Profil Saya
      </h1>
      <ProfileForm profile={profile} resident={resident} />
    </div>
  );
}
