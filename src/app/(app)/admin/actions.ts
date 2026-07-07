"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKpsProgramIds } from "@/lib/kps";
import { isProdiStaff } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = [
  "residen",
  "supervisor",
  "kps",
  "sps",
  "admin_prodi",
  "admin",
];

/**
 * Konteks pemanggil untuk aksi manajemen user. Hanya staf dengan wewenang
 * TULIS: super-admin, KPS, dan SPS. Admin Prodi (read-only) ditolak di sini
 * sehingga tak bisa membuat/mengubah/menghapus apa pun.
 */
async function requireStaffCtx(): Promise<{
  id: string;
  role: UserRole;
  programIds: string[];
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!data || !["kps", "sps", "admin"].includes(data.role)) return null;
  const role = data.role as UserRole;
  // KPS/SPS bisa membawahi beberapa prodi (relasi kps_programs).
  const programIds = isProdiStaff(role)
    ? await getKpsProgramIds(supabase, user.id)
    : [];
  return { id: user.id, role, programIds };
}

// Peran yang memiliki "program rumah" / keanggotaan prodi. DPJP/admin
// bersifat lintas-program → program_id null.
const PROGRAM_ROLES: UserRole[] = ["residen", "kps", "sps", "admin_prodi"];

// Peran ber-lingkup-prodi yang dibuat dengan pilihan BANYAK prodi (kps_programs).
const MULTI_PROGRAM_ROLES: UserRole[] = ["kps", "sps", "admin_prodi"];

// Peran yang boleh DIBUAT oleh KPS/SPS: residen (prodinya) & DPJP — tetapi tidak
// Admin, KPS, SPS, atau Admin Prodi. Edit/hapus tetap dibatasi ke residen
// prodinya (lihat staffCanManage).
const KPS_CREATABLE: UserRole[] = ["residen", "supervisor"];

/**
 * Cek apakah staf berwenang mengelola user `userId`.
 *  - admin (super-admin): boleh atas siapa pun.
 *  - kps/sps: hanya residen yang prodinya termasuk prodi yang dikelolanya.
 *    Tidak boleh menyentuh admin, staf prodi lain, atau residen prodi lain.
 */
async function staffCanManage(
  supabase: SupabaseClient,
  ctx: { role: UserRole; programIds: string[] },
  userId: string,
): Promise<boolean> {
  if (ctx.role === "admin") return true;
  const { data: target } = await supabase
    .from("profiles")
    .select("role, program_id")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return false;
  return (
    target.role === "residen" &&
    !!target.program_id &&
    ctx.programIds.includes(target.program_id as string)
  );
}

/** Sinkronkan baris residents sesuai peran. */
async function syncResidentRow(userId: string, role: UserRole) {
  const supabase = await createClient();
  if (role === "residen") {
    await supabase.from("residents").upsert({ id: userId }, { onConflict: "id" });
  } else {
    await supabase.from("residents").delete().eq("id", userId);
  }
}

export async function createUser(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireStaffCtx();
  if (!ctx) return { error: "Anda tidak berwenang membuat user." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "residen") as UserRole;

  if (!email || !password || !fullName)
    return { error: "Nama, email, dan password wajib diisi." };
  if (password.length < 6)
    return { error: "Password minimal 6 karakter." };
  if (!ROLES.includes(role)) return { error: "Peran tidak valid." };

  // KPS/SPS boleh menambah residen (di prodinya) dan DPJP/supervisor.
  // Admin & staf prodi lain terlarang — hanya super-admin yang membuatnya.
  if (isProdiStaff(ctx.role) && !KPS_CREATABLE.includes(role))
    return { error: "Anda hanya boleh menambah residen atau DPJP." };

  // Keanggotaan prodi hanya untuk residen & staf prodi (kps/sps/admin_prodi).
  //   - Residen: tepat 1 prodi.
  //   - Staf prodi: bisa beberapa prodi (kps_programs); program_id = prodi utama.
  // KPS/SPS pemanggil dibatasi ke prodi-prodi yang dikelolanya; super-admin bebas.
  const supabase = await createClient();
  let programId: string | null = null; // prodi utama (untuk profiles.program_id)
  let kpsProgramIds: string[] = [];

  if (PROGRAM_ROLES.includes(role)) {
    const allowed = isProdiStaff(ctx.role) ? ctx.programIds : null; // null = semua

    if (MULTI_PROGRAM_ROLES.includes(role)) {
      let ids = formData
        .getAll("program_ids")
        .map((v) => String(v).trim())
        .filter(Boolean);
      if (allowed) ids = ids.filter((id) => allowed.includes(id));
      ids = Array.from(new Set(ids));
      if (ids.length === 0)
        return { error: "Pilih minimal satu prodi." };
      const { data: progs } = await supabase
        .from("programs")
        .select("id")
        .in("id", ids);
      const valid = new Set((progs ?? []).map((p) => p.id as string));
      kpsProgramIds = ids.filter((id) => valid.has(id));
      if (kpsProgramIds.length === 0) return { error: "Prodi tidak valid." };
      programId = kpsProgramIds[0];
    } else {
      // residen: satu prodi
      programId = String(formData.get("program_id") ?? "").trim() || null;
      if (!programId) return { error: "Pilih prodi untuk residen." };
      if (allowed && !allowed.includes(programId))
        return { error: "Prodi di luar wewenang Anda." };
      const { data: prog } = await supabase
        .from("programs")
        .select("id")
        .eq("id", programId)
        .maybeSingle();
      if (!prog) return { error: "Prodi tidak valid." };
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      ...(programId ? { program_id: programId } : {}),
    },
  });
  if (error) return { error: error.message };

  // Pastikan profil & residents konsisten (defensif terhadap trigger).
  await supabase
    .from("profiles")
    .update({ full_name: fullName, role, program_id: programId })
    .eq("id", data.user.id);
  await syncResidentRow(data.user.id, role);

  // Staf prodi: catat seluruh prodi yang dikelolanya (trigger isi prodi utama).
  if (MULTI_PROGRAM_ROLES.includes(role) && kpsProgramIds.length > 0) {
    await admin
      .from("kps_programs")
      .upsert(
        kpsProgramIds.map((pid) => ({ kps_id: data.user.id, program_id: pid })),
        { onConflict: "kps_id,program_id" },
      );
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Atur prodi yang dikelola seorang KPS (super-admin). */
export async function setKpsPrograms(
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaffCtx();
  if (!ctx || ctx.role !== "admin") return;

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return;
  const ids = Array.from(
    new Set(
      formData
        .getAll("program_ids")
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  );

  const admin = createAdminClient();
  // Ganti total penugasan, lalu samakan prodi utama (profiles.program_id).
  await admin.from("kps_programs").delete().eq("kps_id", userId);
  if (ids.length > 0) {
    await admin
      .from("kps_programs")
      .insert(ids.map((pid) => ({ kps_id: userId, program_id: pid })));
  }
  await admin
    .from("profiles")
    .update({ program_id: ids[0] ?? null })
    .eq("id", userId);

  revalidatePath("/admin");
}

export async function changeRole(formData: FormData) {
  const ctx = await requireStaffCtx();
  if (!ctx) return;
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as UserRole;
  if (!ROLES.includes(role)) return;

  const supabase = await createClient();
  // KPS/SPS dibatasi: hanya boleh menyentuh residen di prodinya, dan tidak boleh
  // menaikkan peran residen menjadi peran lain.
  if (!(await staffCanManage(supabase, ctx, userId))) return;
  if (ctx.role !== "admin" && role !== "residen") return;

  await supabase.from("profiles").update({ role }).eq("id", userId);
  await syncResidentRow(userId, role);
  revalidatePath("/admin");
}

export async function deleteUser(formData: FormData) {
  const ctx = await requireStaffCtx();
  if (!ctx) return;
  const userId = String(formData.get("user_id"));
  const supabase = await createClient();
  // KPS hanya boleh menghapus residen di prodinya; admin bebas.
  if (!(await staffCanManage(supabase, ctx, userId))) return;

  const admin = createAdminClient();
  // Hapus auth user -> profil & residents ikut terhapus (on delete cascade).
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
