"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      return {
        error:
          "Email belum dikonfirmasi. Minta admin mengaktifkan akun (Auto Confirm) di Supabase.",
      };
    }
    if (code === "invalid_credentials" || /invalid login/i.test(error.message)) {
      return { error: "Email atau kata sandi salah." };
    }
    // Tampilkan pesan asli agar mudah didiagnosis saat setup awal.
    return { error: `Gagal masuk: ${error.message}` };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
