"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Field wajib saat entri DIAJUKAN untuk verifikasi (draft tetap bebas).
type ReqField = [name: string, label: string];
const REQ_COMMON: ReqField[] = [
  ["entry_date", "Tanggal"],
  ["setting", "Setting"],
  ["rumah_sakit", "Rumah Sakit"],
  ["supervisor_id", "DPJP penanggung jawab"],
  ["disease_id", "Diagnosis"],
  ["patient_code", "Kode pasien"],
  ["patient_age", "Usia"],
  ["catatan", "Catatan"],
];
const REQ_BY_TYPE: Record<string, ReqField[]> = {
  prosedur: [
    ["procedure_id", "Prosedur"],
    ["surgical_role", "Peran"],
    ["supervision_level", "Tingkat kemandirian"],
  ],
  penatalaksanaan: [["clinical_competency_id", "Komponen Penatalaksanaan"]],
  kasus: [],
};

/** Daftar label field wajib yang masih kosong (untuk pengajuan). */
function missingRequired(
  entryType: string,
  val: (k: string) => string | null,
): string[] {
  const req = [...REQ_COMMON, ...(REQ_BY_TYPE[entryType] ?? [])];
  return req.filter(([name]) => !val(name)).map(([, label]) => label);
}

export async function createEntry(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const entryType = String(formData.get("entry_type") ?? "");
  const val = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? null : String(v);
  };
  const num = (k: string) => {
    const v = val(k);
    return v === null ? null : Number(v);
  };

  // "draft" atau "diajukan" tergantung tombol yang ditekan
  const aksi = String(formData.get("aksi") ?? "draft");
  const status = aksi === "ajukan" ? "diajukan" : "draft";
  const supervisorId = val("supervisor_id");
  const rumahSakit = val("rumah_sakit");

  if (status === "diajukan") {
    const missing = missingRequired(entryType, val);
    if (missing.length > 0) {
      return {
        error: `Lengkapi dulu sebelum mengajukan: ${missing.join(", ")}.`,
      };
    }
  }

  const { error } = await supabase.from("log_entries").insert({
    resident_id: user.id,
    entry_type: entryType,
    entry_date: val("entry_date"),
    rumah_sakit: rumahSakit,
    supervisor_id: supervisorId,
    procedure_id: entryType === "prosedur" ? val("procedure_id") : null,
    clinical_competency_id:
      entryType === "penatalaksanaan" ? val("clinical_competency_id") : null,
    disease_id: val("disease_id"),
    patient_code: val("patient_code"),
    patient_age: num("patient_age"),
    figo_stage: val("figo_stage"),
    setting: val("setting"),
    surgical_role: entryType === "prosedur" ? val("surgical_role") : null,
    supervision_level: val("supervision_level"),
    complications: val("complications"),
    dokumentasi_jenis:
      entryType === "penatalaksanaan" ? val("dokumentasi_jenis") : null,
    catatan: val("catatan"),
    evidence_url: val("evidence_url"),
    status,
    submitted_at: status === "diajukan" ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/logbook");
  redirect("/logbook");
}

export async function updateEntry(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const entryId = String(formData.get("entry_id") ?? "");
  const entryType = String(formData.get("entry_type") ?? "");
  const val = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? null : String(v);
  };
  const num = (k: string) => {
    const v = val(k);
    return v === null ? null : Number(v);
  };

  const aksi = String(formData.get("aksi") ?? "draft");
  const status = aksi === "ajukan" ? "diajukan" : "draft";
  const supervisorId = val("supervisor_id");
  const rumahSakit = val("rumah_sakit");

  if (status === "diajukan") {
    const missing = missingRequired(entryType, val);
    if (missing.length > 0) {
      return {
        error: `Lengkapi dulu sebelum mengajukan: ${missing.join(", ")}.`,
      };
    }
  }

  const { error } = await supabase
    .from("log_entries")
    .update({
      entry_date: val("entry_date"),
      rumah_sakit: rumahSakit,
      supervisor_id: supervisorId,
      procedure_id: entryType === "prosedur" ? val("procedure_id") : null,
      clinical_competency_id:
        entryType === "penatalaksanaan" ? val("clinical_competency_id") : null,
      disease_id: val("disease_id"),
      patient_code: val("patient_code"),
      patient_age: num("patient_age"),
      figo_stage: val("figo_stage"),
      setting: val("setting"),
      surgical_role: entryType === "prosedur" ? val("surgical_role") : null,
      supervision_level: val("supervision_level"),
      complications: val("complications"),
      dokumentasi_jenis:
        entryType === "penatalaksanaan" ? val("dokumentasi_jenis") : null,
      catatan: val("catatan"),
      evidence_url: val("evidence_url"),
      status,
      submitted_at: status === "diajukan" ? new Date().toISOString() : null,
    })
    .eq("id", entryId);

  if (error) return { error: error.message };

  revalidatePath("/logbook");
  redirect("/logbook");
}

export async function deleteEntry(formData: FormData) {
  const supabase = await createClient();
  const entryId = String(formData.get("entry_id") ?? "");
  await supabase.from("log_entries").delete().eq("id", entryId);
  revalidatePath("/logbook");
  redirect("/logbook");
}

/** Simpan field form saat ini sebagai template entri cepat (milik residen). */
export async function saveTemplate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const val = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? null : String(v);
  };
  const nama = val("template_nama");
  if (!nama) return;

  const entryType = String(formData.get("entry_type") ?? "prosedur");
  const { error } = await supabase.from("entry_templates").insert({
    resident_id: user.id,
    nama,
    entry_type: entryType,
    procedure_id: entryType === "prosedur" ? val("procedure_id") : null,
    clinical_competency_id:
      entryType === "penatalaksanaan" ? val("clinical_competency_id") : null,
    disease_id: val("disease_id"),
    supervisor_id: val("supervisor_id"),
    rumah_sakit: val("rumah_sakit"),
    setting: val("setting"),
    surgical_role: entryType === "prosedur" ? val("surgical_role") : null,
    supervision_level: val("supervision_level"),
    dokumentasi_jenis:
      entryType === "penatalaksanaan" ? val("dokumentasi_jenis") : null,
    figo_stage: val("figo_stage"),
  });
  if (error) return;

  revalidatePath("/logbook/new");
  redirect("/logbook/new");
}

/** Hapus template milik residen. */
export async function deleteTemplate(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("template_id") ?? "");
  await supabase.from("entry_templates").delete().eq("id", id);
  revalidatePath("/logbook/new");
  redirect("/logbook/new");
}

/** Supervisor/staf memverifikasi atau menolak entri. */
export async function reviewEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entryId = String(formData.get("entry_id"));
  const keputusan = String(formData.get("keputusan")); // diverifikasi | revisi | ditolak
  const note = String(formData.get("verifier_note") ?? "");

  await supabase
    .from("log_entries")
    .update({
      status: keputusan,
      verifier_note: note || null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  await supabase.from("entry_reviews").insert({
    entry_id: entryId,
    reviewer_id: user.id,
    status_baru: keputusan,
    catatan: note || null,
  });

  revalidatePath("/verifikasi");
}
