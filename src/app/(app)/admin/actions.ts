"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["residen", "supervisor", "kps", "penguji", "admin"];

/** Pastikan pemanggil berperan kps/admin. */
async function requireStaff(): Promise<string | null> {
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
  if (!data || !["kps", "admin"].includes(data.role)) return null;
  return user.id;
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
  if (!(await requireStaff()))
    return { error: "Hanya KPS/Admin yang boleh membuat user." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "residen") as UserRole;

  if (!email || !password || !fullName)
    return { error: "Nama, email, dan password wajib diisi." };
  if (password.length < 6)
    return { error: "Password minimal 6 karakter." };
  if (!ROLES.includes(role)) return { error: "Peran tidak valid." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) return { error: error.message };

  // Pastikan profil & residents konsisten (defensif terhadap trigger).
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: fullName, role })
    .eq("id", data.user.id);
  await syncResidentRow(data.user.id, role);

  revalidatePath("/admin");
  return { ok: true };
}

export async function changeRole(formData: FormData) {
  if (!(await requireStaff())) return;
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as UserRole;
  if (!ROLES.includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  await syncResidentRow(userId, role);
  revalidatePath("/admin");
}

export async function deleteUser(formData: FormData) {
  if (!(await requireStaff())) return;
  const userId = String(formData.get("user_id"));
  const admin = createAdminClient();
  // Hapus auth user -> profil & residents ikut terhapus (on delete cascade).
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}

export async function assignSupervisor(formData: FormData) {
  if (!(await requireStaff())) return;
  const residentId = String(formData.get("resident_id"));
  const supervisorId = String(formData.get("supervisor_id"));
  if (!residentId || !supervisorId) return;

  const supabase = await createClient();
  await supabase
    .from("supervisor_assignments")
    .upsert(
      { resident_id: residentId, supervisor_id: supervisorId, utama: true },
      { onConflict: "resident_id,supervisor_id" },
    );
  revalidatePath("/admin");
}

export async function unassignSupervisor(formData: FormData) {
  if (!(await requireStaff())) return;
  const id = String(formData.get("assignment_id"));
  const supabase = await createClient();
  await supabase.from("supervisor_assignments").delete().eq("id", id);
  revalidatePath("/admin");
}
