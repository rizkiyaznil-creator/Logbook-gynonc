import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Ambil profil pengguna login; redirect ke /login bila belum masuk.
 * Dibungkus React cache() agar 1 request hanya 1× query meski dipanggil
 * di layout sekaligus di page.
 */
export const requireProfile = cache(async function (): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, institution_id, no_telp, nip, jabatan, institusi, avatar_url, aktif",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return profile as Profile;
});
