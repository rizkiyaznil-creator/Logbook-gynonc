// Definisi peran terpusat: label tampilan & pengelompokan wewenang.
import type { UserRole } from "@/lib/types";

export const ROLE_LABEL: Record<UserRole, string> = {
  residen: "Residen",
  supervisor: "Supervisor / DPJP",
  kps: "Ketua Prodi",
  sps: "SPS / Sekretaris Prodi",
  admin_prodi: "Admin Prodi",
  admin: "Administrator",
};

// Staf prodi dengan wewenang PENUH (kelola user, verifikasi, penilaian,
// kurikulum) — terbatas pada prodi yang dikelolanya. KPS & SPS setara.
export const PRODI_STAFF: UserRole[] = ["kps", "sps"];

// Semua peran ber-lingkup-prodi, termasuk Admin Prodi (viewer read-only).
export const PRODI_SCOPED: UserRole[] = ["kps", "sps", "admin_prodi"];

/** KPS/SPS — boleh mengelola & memutuskan di prodinya. */
export const isProdiStaff = (r: UserRole): boolean => PRODI_STAFF.includes(r);

/** KPS/SPS/Admin Prodi — punya lingkup prodi (via kps_programs). */
export const isProdiScoped = (r: UserRole): boolean => PRODI_SCOPED.includes(r);

/** Admin Prodi — hanya membaca, tak boleh mengubah apa pun. */
export const isReadOnlyProdi = (r: UserRole): boolean => r === "admin_prodi";
