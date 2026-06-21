import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/entry-form";
import { createEntry } from "@/app/(app)/logbook/actions";
import { RS_BAKU } from "@/lib/constants";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  SupervisorOption,
} from "@/lib/types";

export default async function NewEntryPage() {
  const supabase = await createClient();
  const [d, p, c, s, rs] = await Promise.all([
    supabase.from("diseases").select("*").order("no"),
    supabase.from("procedures").select("*").order("no"),
    supabase.from("clinical_competencies").select("*").order("no"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "supervisor")
      .order("full_name"),
    supabase.from("log_entries").select("rumah_sakit"),
  ]);

  const used = (rs.data ?? [])
    .map((r: { rumah_sakit: string | null }) => r.rumah_sakit)
    .filter((x): x is string => !!x);
  const hospitals = Array.from(new Set([...RS_BAKU, ...used]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Kembali ke Dashboard
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Entri Logbook Baru
        </h1>
      </div>
      <EntryForm
        action={createEntry}
        diseases={(d.data ?? []) as Disease[]}
        procedures={(p.data ?? []) as Procedure[]}
        competencies={(c.data ?? []) as ClinicalCompetency[]}
        supervisors={(s.data ?? []) as SupervisorOption[]}
        hospitals={hospitals}
      />
    </div>
  );
}
