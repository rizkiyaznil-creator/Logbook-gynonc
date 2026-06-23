"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getKpsProgramIds } from "@/lib/kps";
import type { ProgramConfig } from "@/lib/types";

type Result = { ok?: boolean; error?: string; id?: string };

// ---------------------------------------------------------------------------
// Konteks pemanggil & otorisasi
//   - Program (buat/edit/aktif/config): super-admin saja.
//   - Kurikulum (prosedur/penatalaksanaan): super-admin (semua program) atau
//     KPS dari program tsb. RLS DB juga menegakkan ini (pertahanan berlapis).
// ---------------------------------------------------------------------------
async function caller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null, programIds: [] as string[] };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (data?.role ?? null) as string | null;
  // KPS bisa membawahi beberapa prodi (relasi kps_programs).
  const programIds = role === "kps" ? await getKpsProgramIds(supabase, user.id) : [];
  return { supabase, user, role, programIds };
}

/** Boleh kelola kurikulum program ini? super-admin (semua) atau KPS-nya. */
function canManage(
  c: { role: string | null; programIds: string[] },
  programId: string,
): boolean {
  return c.role === "admin" || (c.role === "kps" && c.programIds.includes(programId));
}

function cleanConfig(input: Partial<ProgramConfig>): ProgramConfig {
  const cfg: ProgramConfig = {};
  if (input.accent) cfg.accent = input.accent;
  if (input.label_tabel_prosedur != null)
    cfg.label_tabel_prosedur = input.label_tabel_prosedur;
  if (input.label_tabel_penatalaksanaan != null)
    cfg.label_tabel_penatalaksanaan = input.label_tabel_penatalaksanaan;
  cfg.figo_enabled = !!input.figo_enabled;
  cfg.staging_options = (input.staging_options ?? []).filter(Boolean);
  return cfg;
}

// ===========================================================================
// PROGRAM (super-admin)
// ===========================================================================
export async function createProgram(input: {
  kode: string;
  nama: string;
  config: Partial<ProgramConfig>;
}): Promise<Result> {
  const c = await caller();
  if (c.role !== "admin") return { error: "Hanya super-admin." };

  const kode = input.kode.trim().toLowerCase();
  const nama = input.nama.trim();
  if (!/^[a-z0-9-]{2,32}$/.test(kode))
    return { error: "Kode program: 2–32 karakter (huruf kecil, angka, tanda hubung)." };
  if (!nama) return { error: "Nama program wajib diisi." };

  const { data, error } = await c.supabase
    .from("programs")
    .insert({ kode, nama, config: cleanConfig(input.config) })
    .select("id")
    .single();
  if (error)
    return {
      error: error.code === "23505" ? `Kode "${kode}" sudah dipakai.` : error.message,
    };
  revalidatePath("/kurikulum");
  return { ok: true, id: data.id as string };
}

export async function updateProgram(
  id: string,
  input: { nama: string; aktif: boolean; config: Partial<ProgramConfig> },
): Promise<Result> {
  const c = await caller();
  if (c.role !== "admin") return { error: "Hanya super-admin." };
  const nama = input.nama.trim();
  if (!nama) return { error: "Nama program wajib diisi." };

  const { error } = await c.supabase
    .from("programs")
    .update({ nama, aktif: input.aktif, config: cleanConfig(input.config) })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/kurikulum");
  revalidatePath(`/kurikulum/${id}`);
  return { ok: true };
}

// ===========================================================================
// PROSEDUR (super-admin / KPS programnya) + sinkron 1:1 butir pengetahuan
// ===========================================================================
export type ProcedureInput = {
  id?: string;
  no: number;
  kode: string;
  nama: string;
  target_min: number;
  satuan: string;
  peran_disyaratkan: string;
  peran_dihitung: string[];
  syarat_tambahan: string;
  perlu_verifikasi: boolean;
};

export async function saveProcedure(
  programId: string,
  input: ProcedureInput,
): Promise<Result> {
  const c = await caller();
  if (!canManage(c, programId))
    return { error: "Tidak berwenang mengelola kurikulum program ini." };

  const kode = input.kode.trim().toUpperCase();
  const nama = input.nama.trim();
  if (!kode || !nama) return { error: "Kode dan nama prosedur wajib diisi." };
  if (!Number.isInteger(input.no) || input.no < 1)
    return { error: "Nomor urut harus bilangan positif." };
  if (!Number.isInteger(input.target_min) || input.target_min < 1)
    return { error: "Target minimal harus ≥ 1." };

  const row = {
    program_id: programId,
    kode,
    no: input.no,
    nama,
    target_min: input.target_min,
    satuan: input.satuan.trim() || null,
    peran_disyaratkan: input.peran_disyaratkan.trim() || null,
    peran_dihitung: input.peran_dihitung,
    syarat_tambahan: input.syarat_tambahan.trim() || null,
    perlu_verifikasi: input.perlu_verifikasi,
  };

  let procId = input.id;
  if (input.id) {
    const { error } = await c.supabase
      .from("procedures")
      .update(row)
      .eq("id", input.id);
    if (error) return { error: prettyErr(error, kode, input.no) };
  } else {
    const { data, error } = await c.supabase
      .from("procedures")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: prettyErr(error, kode, input.no) };
    procId = data.id as string;
  }

  // Sinkron butir pengetahuan prosedur 1:1 (kode "K"+kode prosedur).
  const { data: amb } = await c.supabase
    .from("knowledge_items")
    .select("osce_min, mcq_min")
    .eq("program_id", programId)
    .limit(1)
    .maybeSingle();
  await c.supabase.from("knowledge_items").upsert(
    {
      program_id: programId,
      kode: "K" + kode,
      topik: "Pengetahuan: " + nama,
      kategori: "prosedur",
      procedure_id: procId,
      osce_min: amb?.osce_min ?? 70,
      mcq_min: amb?.mcq_min ?? 70,
    },
    { onConflict: "program_id,kode" },
  );

  revalidatePath(`/kurikulum/${programId}`);
  return { ok: true };
}

export async function deleteProcedure(
  programId: string,
  id: string,
): Promise<Result> {
  const c = await caller();
  if (!canManage(c, programId))
    return { error: "Tidak berwenang." };
  // Hapus prosedur DULU; bila terhalang (mis. dirujuk entri), butir pengetahuan
  // tidak ikut terhapus → konsistensi 1:1 terjaga.
  const { data: proc } = await c.supabase
    .from("procedures")
    .select("kode")
    .eq("id", id)
    .maybeSingle();
  const { error } = await c.supabase.from("procedures").delete().eq("id", id);
  if (error) return { error: errHasEntries(error) };
  if (proc?.kode)
    await c.supabase
      .from("knowledge_items")
      .delete()
      .eq("program_id", programId)
      .eq("kode", "K" + proc.kode);
  revalidatePath(`/kurikulum/${programId}`);
  return { ok: true };
}

// ===========================================================================
// PENATALAKSANAAN (super-admin / KPS programnya)
// ===========================================================================
export type ClinicalInput = {
  id?: string;
  no: number;
  kode: string;
  komponen: string;
  penjabaran: string;
  kriteria_kinerja: string;
  target_min: number;
  satuan: string;
  perlu_verifikasi: boolean;
};

export async function saveClinical(
  programId: string,
  input: ClinicalInput,
): Promise<Result> {
  const c = await caller();
  if (!canManage(c, programId))
    return { error: "Tidak berwenang mengelola kurikulum program ini." };

  const kode = input.kode.trim().toUpperCase();
  const komponen = input.komponen.trim();
  if (!kode || !komponen) return { error: "Kode dan komponen wajib diisi." };
  if (!Number.isInteger(input.no) || input.no < 1)
    return { error: "Nomor urut harus bilangan positif." };
  if (!Number.isInteger(input.target_min) || input.target_min < 1)
    return { error: "Target minimal harus ≥ 1." };

  const row = {
    program_id: programId,
    kode,
    no: input.no,
    komponen,
    penjabaran: input.penjabaran.trim() || null,
    kriteria_kinerja: input.kriteria_kinerja.trim() || null,
    target_min: input.target_min,
    satuan: input.satuan.trim() || null,
    perlu_verifikasi: input.perlu_verifikasi,
  };

  if (input.id) {
    const { error } = await c.supabase
      .from("clinical_competencies")
      .update(row)
      .eq("id", input.id);
    if (error) return { error: prettyErr(error, kode, input.no) };
  } else {
    const { error } = await c.supabase.from("clinical_competencies").insert(row);
    if (error) return { error: prettyErr(error, kode, input.no) };
  }
  revalidatePath(`/kurikulum/${programId}`);
  return { ok: true };
}

export async function deleteClinical(
  programId: string,
  id: string,
): Promise<Result> {
  const c = await caller();
  if (!canManage(c, programId))
    return { error: "Tidak berwenang." };
  const { error } = await c.supabase
    .from("clinical_competencies")
    .delete()
    .eq("id", id);
  if (error) return { error: errHasEntries(error) };
  revalidatePath(`/kurikulum/${programId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
function prettyErr(
  error: { code?: string; message: string },
  kode: string,
  no: number,
): string {
  if (error.code === "23505")
    return `Kode "${kode}" atau nomor ${no} sudah dipakai di program ini.`;
  return error.message;
}
function errHasEntries(error: { code?: string; message: string }): string {
  if (error.code === "23503")
    return "Tidak bisa dihapus: masih ada entri logbook yang merujuk item ini.";
  return error.message;
}
