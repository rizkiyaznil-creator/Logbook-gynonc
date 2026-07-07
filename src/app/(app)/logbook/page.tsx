import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogbookTable, type FlatRow } from "@/components/logbook-table";
import type { EntryStatus, EntryType } from "@/lib/types";

type Row = {
  id: string;
  entry_date: string;
  entry_type: EntryType;
  status: EntryStatus;
  rumah_sakit: string | null;
  supervisor_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verifier_note: string | null;
  evidence_url: string | null;
  procedures: { kode: string; nama: string } | null;
  clinical_competencies: { kode: string; komponen: string } | null;
};

export default async function LogbookPage() {
  const supabase = await createClient();

  const [entryRes, supRes] = await Promise.all([
    supabase
      .from("log_entries")
      .select(
        "id, entry_date, entry_type, status, rumah_sakit, supervisor_id, verified_by, verified_at, verifier_note, evidence_url, procedures(kode,nama), clinical_competencies(kode,komponen)",
      )
      .order("entry_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["supervisor", "kps", "sps", "admin"]),
  ]);

  const rows = (entryRes.data ?? []) as unknown as Row[];
  const nameMap = new Map(
    ((supRes.data ?? []) as { id: string; full_name: string }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  const flat: FlatRow[] = rows.map((r) => ({
    id: r.id,
    entry_date: r.entry_date,
    entry_type: r.entry_type,
    status: r.status,
    rumah_sakit: r.rumah_sakit,
    komp: r.procedures?.kode ?? r.clinical_competencies?.kode ?? "—",
    nama:
      r.procedures?.nama ??
      r.clinical_competencies?.komponen ??
      (r.entry_type === "kasus" ? "Kasus klinis" : "—"),
    dpjp: r.supervisor_id ? nameMap.get(r.supervisor_id) ?? "DPJP" : "—",
    verified_at: r.verified_at,
    verifier: r.verified_by ? nameMap.get(r.verified_by) ?? "—" : null,
    verifier_note: r.verifier_note,
    evidence_url: r.evidence_url,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Logbook Saya
        </h1>
        <Link
          href="/logbook/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Entri Baru
        </Link>
      </div>

      <LogbookTable rows={flat} />
    </div>
  );
}
