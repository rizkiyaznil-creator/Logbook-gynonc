import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Ambil profil pengguna login; redirect ke /login bila belum masuk. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, institution_id, no_telp, nip, jabatan, institusi, aktif",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return profile as Profile;
}
