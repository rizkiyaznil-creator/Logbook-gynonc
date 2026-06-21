import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase dengan service_role key — HANYA untuk server (server action).
 * Dipakai untuk operasi admin auth (buat/hapus user). Jangan pernah dipakai
 * di komponen klien; key ini rahasia.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset. Tambahkan di Environment Variables.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
