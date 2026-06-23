// Tipe ringkas untuk tabel & view yang dipakai aplikasi.
// (Bisa diganti hasil `supabase gen types typescript` saat proyek live.)

export type UserRole = "residen" | "supervisor" | "kps" | "penguji" | "admin";
export type EntryType = "prosedur" | "penatalaksanaan" | "kasus";
export type SurgicalRole =
  | "operator_utama"
  | "ko_operator"
  | "asisten"
  | "observer";
export type SupervisionLevel =
  | "observasi"
  | "dibantu_penuh"
  | "dibantu_sebagian"
  | "mandiri";
export type EntryStatus =
  | "draft"
  | "diajukan"
  | "diverifikasi"
  | "revisi"
  | "ditolak";
export type DokumentasiJenis =
  | "mdt"
  | "breaking_bad_news"
  | "handover"
  | "lainnya";

// --- Multi-program (platform) ---
export interface ProgramConfig {
  accent?: string;
  label_tabel_prosedur?: string;
  label_tabel_penatalaksanaan?: string;
  figo_enabled?: boolean;
  staging_options?: string[];
}

export interface Program {
  id: string;
  kode: string;
  nama: string;
  config: ProgramConfig;
  aktif: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  institution_id: string | null;
  // Home program (residen & KPS); null untuk DPJP/penguji/admin.
  program_id: string | null;
  no_telp: string | null;
  nip: string | null;
  jabatan: string | null;
  institusi: string | null;
  avatar_url: string | null;
  aktif: boolean;
}

export interface Disease {
  id: string;
  no: number;
  nama_id: string;
  nama_en: string | null;
  icd10: string | null;
  icd11: string | null;
  kelompok: string | null;
}

export interface Procedure {
  id: string;
  kode: string;
  no: number;
  nama: string;
  target_min: number;
  satuan: string | null;
  peran_disyaratkan: string | null;
  peran_dihitung: SurgicalRole[];
  syarat_tambahan: string | null;
}

export interface ClinicalCompetency {
  id: string;
  kode: string;
  no: number;
  komponen: string;
  target_min: number;
  satuan: string | null;
}

export interface LogEntry {
  id: string;
  resident_id: string;
  entry_type: EntryType;
  entry_date: string;
  procedure_id: string | null;
  clinical_competency_id: string | null;
  disease_id: string | null;
  patient_code: string | null;
  patient_age: number | null;
  figo_stage: string | null;
  setting: string | null;
  rumah_sakit: string | null;
  surgical_role: SurgicalRole | null;
  supervision_level: SupervisionLevel | null;
  complications: string | null;
  dokumentasi_jenis: DokumentasiJenis | null;
  catatan: string | null;
  evidence_url: string | null;
  supervisor_id: string | null;
  status: EntryStatus;
  verifier_note: string | null;
  created_at: string;
}

export type AcademicJenis =
  | "sari_pustaka"
  | "telaah_jurnal"
  | "laporan_kasus"
  | "tesis"
  | "publikasi"
  | "presentasi";
export type ThesisTahap =
  | "proposal"
  | "kaji_etik"
  | "pengumpulan_data"
  | "seminar_hasil"
  | "sidang";
export type AcademicTingkat = "nasional" | "internasional";
export type PresentasiBentuk = "oral" | "poster";

export interface CoAuthor {
  nama: string;
  korespondensi?: boolean;
}

export interface AcademicWork {
  id: string;
  resident_id: string;
  jenis: AcademicJenis;
  tahap: ThesisTahap | null;
  judul: string;
  tanggal: string | null;
  pembimbing_id: string | null;
  evidence_url: string | null;
  catatan: string | null;
  status: EntryStatus;
  verifier_note: string | null;
  tingkat: AcademicTingkat | null;
  penerbit: string | null;
  bentuk: PresentasiBentuk | null;
  pembimbing2: string | null;
  penguji: string | null;
  co_authors: CoAuthor[] | null;
}

export interface EntryTemplate {
  id: string;
  nama: string;
  entry_type: EntryType;
  procedure_id: string | null;
  clinical_competency_id: string | null;
  disease_id: string | null;
  supervisor_id: string | null;
  rumah_sakit: string | null;
  setting: string | null;
  surgical_role: SurgicalRole | null;
  supervision_level: SupervisionLevel | null;
  dokumentasi_jenis: DokumentasiJenis | null;
  figo_stage: string | null;
}

export interface SupervisorOption {
  id: string;
  full_name: string;
}

// --- View progress ---
export interface ProcedureProgress {
  resident_id: string;
  procedure_id: string;
  kode: string;
  nama: string;
  target_min: number;
  jumlah_terverifikasi: number;
  jumlah_menunggu: number;
  persen: number;
  tercapai: boolean;
}

export interface ClinicalProgress {
  resident_id: string;
  competency_id: string;
  kode: string;
  komponen: string;
  target_min: number;
  jumlah_terverifikasi: number;
  persen: number;
  tercapai: boolean;
}

export interface SubtargetProgress {
  resident_id: string;
  subtarget_id: string;
  competency_kode: string;
  nama: string;
  subtarget_kode: string;
  target_min: number;
  jumlah_terverifikasi: number;
  persen: number;
  tercapai: boolean;
}

export interface ResidentSummary {
  resident_id: string;
  prosedur_tercapai: number;
  prosedur_total: number;
  penatalaksanaan_tercapai: number;
  penatalaksanaan_total: number;
  pengetahuan_lulus: number;
  pengetahuan_total: number;
  penyakit_tercakup: number;
  penyakit_total: number;
}
