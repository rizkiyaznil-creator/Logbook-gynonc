import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuditTable, type AuditRow } from "@/components/audit-table";

export default async function AuditPage() {
  const me = await requireProfile();
  if (!["kps", "sps", "admin_prodi", "admin"].includes(me.role))
    redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, created_at, actor_name, action, entity, summary")
    .order("id", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Audit Log
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catatan aktivitas: pembuatan & verifikasi entri, perubahan peran, dan
          status akun. 500 aktivitas terbaru.
        </p>
      </div>
      <AuditTable rows={rows} />
    </div>
  );
}
