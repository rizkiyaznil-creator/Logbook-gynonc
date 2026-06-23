// Konteks & konfigurasi program (multi-tenant Fase 2).
// Institusi = USU (konstan); nama program, warna aksen, label tabel, dan
// opsi FIGO diturunkan dari `programs.config` sesuai KONTEKS:
//  - halaman/form residen  -> config program residen (home program)
//  - verifikasi DPJP        -> config program ENTRI yang diverifikasi
//  - header lintas-program  -> netral (platform USU)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Program, ProgramConfig } from "@/lib/types";

/** Branding institusi (level platform, satu domain/PWA). */
export const PLATFORM_NAME = "Logbook PPDS USU";
export const PLATFORM_SHORT = "Logbook USU";

// Catatan: label tabel ("Tabel 24"/"Tabel 18") bersifat khas program; default
// kosong agar program tanpa label tidak menampilkan tanda kurung yang janggal.
/** Config default bila program tidak menetapkan nilai. */
export const DEFAULT_CONFIG: Required<ProgramConfig> = {
  accent: "teal",
  label_tabel_prosedur: "",
  label_tabel_penatalaksanaan: "",
  figo_enabled: true,
  staging_options: [],
};

/** Gabungkan config program dengan default (nilai kosong → default). */
export function withDefaults(config?: ProgramConfig | null): Required<ProgramConfig> {
  const c = config ?? {};
  return {
    accent: c.accent || DEFAULT_CONFIG.accent,
    label_tabel_prosedur:
      c.label_tabel_prosedur ?? DEFAULT_CONFIG.label_tabel_prosedur,
    label_tabel_penatalaksanaan:
      c.label_tabel_penatalaksanaan ?? DEFAULT_CONFIG.label_tabel_penatalaksanaan,
    figo_enabled: c.figo_enabled ?? DEFAULT_CONFIG.figo_enabled,
    staging_options: c.staging_options ?? DEFAULT_CONFIG.staging_options,
  };
}

/** Peta warna aksen (nama → hex) untuk indikator/badge program. */
const ACCENT_HEX: Record<string, string> = {
  teal: "#0f766e",
  emerald: "#047857",
  cyan: "#0e7490",
  blue: "#1d4ed8",
  indigo: "#4338ca",
  violet: "#6d28d9",
  rose: "#be123c",
  amber: "#b45309",
  slate: "#475569",
};

export function accentHex(accent?: string | null): string {
  return ACCENT_HEX[(accent || "teal").toLowerCase()] ?? ACCENT_HEX.teal;
}

/** Ambil satu program (beserta config) berdasarkan id. */
export async function getProgram(
  supabase: SupabaseClient,
  programId: string | null | undefined,
): Promise<Program | null> {
  if (!programId) return null;
  const { data } = await supabase
    .from("programs")
    .select("id, kode, nama, config, aktif")
    .eq("id", programId)
    .maybeSingle();
  return (data as Program | null) ?? null;
}

/** Ambil beberapa program sekaligus → map id→Program (untuk antrean gabungan). */
export async function getProgramsByIds(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[],
): Promise<Map<string, Program>> {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const map = new Map<string, Program>();
  if (uniq.length === 0) return map;
  const { data } = await supabase
    .from("programs")
    .select("id, kode, nama, config, aktif")
    .in("id", uniq);
  for (const p of (data ?? []) as Program[]) map.set(p.id, p);
  return map;
}
