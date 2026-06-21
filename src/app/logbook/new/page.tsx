import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/entry-form";
import { createEntry } from "@/app/logbook/actions";
import type { Disease, Procedure, ClinicalCompetency } from "@/lib/types";

export default async function NewEntryPage() {
  const supabase = await createClient();
  const [d, p, c] = await Promise.all([
    supabase.from("diseases").select("*").order("no"),
    supabase.from("procedures").select("*").order("no"),
    supabase.from("clinical_competencies").select("*").order("no"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">Entri Logbook Baru</h1>
      <EntryForm
        action={createEntry}
        diseases={(d.data ?? []) as Disease[]}
        procedures={(p.data ?? []) as Procedure[]}
        competencies={(c.data ?? []) as ClinicalCompetency[]}
      />
    </div>
  );
}
