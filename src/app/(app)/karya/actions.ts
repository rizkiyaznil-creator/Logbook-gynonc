"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readFields(formData: FormData) {
  const val = (k: string) => {
    const v = formData.get(k);
    return v === null || String(v).trim() === "" ? null : String(v).trim();
  };
  const jenis = String(formData.get("jenis") ?? "");
  const aksi = String(formData.get("aksi") ?? "draft");
  const status = aksi === "ajukan" ? "diajukan" : "draft";
  return {
    jenis,
    status,
    tahap: jenis === "tesis" ? val("tahap") : null,
    judul: val("judul"),
    tanggal: val("tanggal"),
    pembimbing_id: val("pembimbing_id"),
    evidence_url: val("evidence_url"),
    catatan: val("catatan"),
  };
}

export async function createWork(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const f = readFields(formData);
  if (!f.judul) return { error: "Judul wajib diisi." };
  if (f.jenis === "tesis" && !f.tahap)
    return { error: "Pilih tahap tesis." };
  if (f.status === "diajukan" && !f.pembimbing_id)
    return { error: "Pilih pembimbing sebelum mengajukan." };

  const { error } = await supabase.from("academic_works").insert({
    resident_id: user.id,
    jenis: f.jenis,
    tahap: f.tahap,
    judul: f.judul,
    tanggal: f.tanggal,
    pembimbing_id: f.pembimbing_id,
    evidence_url: f.evidence_url,
    catatan: f.catatan,
    status: f.status,
    submitted_at: f.status === "diajukan" ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/karya");
  redirect("/karya");
}

export async function updateWork(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const id = String(formData.get("work_id") ?? "");
  const f = readFields(formData);
  if (!f.judul) return { error: "Judul wajib diisi." };
  if (f.jenis === "tesis" && !f.tahap) return { error: "Pilih tahap tesis." };
  if (f.status === "diajukan" && !f.pembimbing_id)
    return { error: "Pilih pembimbing sebelum mengajukan." };

  const { error } = await supabase
    .from("academic_works")
    .update({
      jenis: f.jenis,
      tahap: f.tahap,
      judul: f.judul,
      tanggal: f.tanggal,
      pembimbing_id: f.pembimbing_id,
      evidence_url: f.evidence_url,
      catatan: f.catatan,
      status: f.status,
      submitted_at: f.status === "diajukan" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/karya");
  redirect("/karya");
}

export async function deleteWork(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("work_id") ?? "");
  await supabase.from("academic_works").delete().eq("id", id);
  revalidatePath("/karya");
  redirect("/karya");
}

/** Pembimbing/staf memverifikasi/menolak karya ilmiah. */
export async function reviewWork(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("work_id"));
  const keputusan = String(formData.get("keputusan"));
  const note = String(formData.get("verifier_note") ?? "");

  await supabase
    .from("academic_works")
    .update({
      status: keputusan,
      verifier_note: note || null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/verifikasi");
}
