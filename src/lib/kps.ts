// Lingkup program seorang KPS (multi-program — Fase 6).
// KPS bisa membawahi beberapa prodi sekaligus (relasi `kps_programs`).
import type { SupabaseClient } from "@supabase/supabase-js";

/** Daftar program_id yang dikelola seorang KPS. */
export async function getKpsProgramIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("kps_programs")
    .select("program_id")
    .eq("kps_id", userId);
  return ((data ?? []) as { program_id: string }[]).map((r) => r.program_id);
}
