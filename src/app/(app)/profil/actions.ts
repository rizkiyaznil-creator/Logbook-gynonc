"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const val = (k: string) => {
    const v = formData.get(k);
    return v === null || String(v).trim() === "" ? null : String(v).trim();
  };

  const fullName = val("full_name");
  if (!fullName) return { error: "Nama lengkap wajib diisi." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Update kolom profil (role TIDAK diubah; dilindungi trigger juga).
  const { error: e1 } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      avatar_url: val("avatar_url"),
      no_telp: val("no_telp"),
      nip: val("nip"),
      jabatan: val("jabatan"),
      institusi: val("institusi"),
    })
    .eq("id", user.id);
  if (e1) return { error: e1.message };

  // Data khusus residen.
  if (prof?.role === "residen") {
    const { error: e2 } = await supabase
      .from("residents")
      .update({
        no_peserta: val("no_peserta"),
        angkatan: val("angkatan"),
        tanggal_mulai: val("tanggal_mulai"),
      })
      .eq("id", user.id);
    if (e2) return { error: e2.message };
  }

  revalidatePath("/profil");
  return { ok: true };
}
