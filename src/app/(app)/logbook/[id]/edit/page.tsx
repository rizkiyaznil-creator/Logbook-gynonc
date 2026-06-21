import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/entry-form";
import { updateEntry, deleteEntry } from "@/app/(app)/logbook/actions";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  LogEntry,
} from "@/lib/types";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("log_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();
  const e = entry as LogEntry;

  // Hanya draft / revisi yang boleh disunting.
  if (!["draft", "revisi"].includes(e.status)) {
    redirect("/logbook");
  }

  const [d, p, c] = await Promise.all([
    supabase.from("diseases").select("*").order("no"),
    supabase.from("procedures").select("*").order("no"),
    supabase.from("clinical_competencies").select("*").order("no"),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/logbook" className="text-sm text-teal-700 hover:underline">
        ← Kembali ke Logbook
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Sunting Entri</h1>
        <form action={deleteEntry}>
          <input type="hidden" name="entry_id" value={e.id} />
          <button className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50">
            Hapus entri
          </button>
        </form>
      </div>

      {e.status === "revisi" && e.verifier_note && (
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-200">
          <span className="font-medium">Catatan verifikator:</span>{" "}
          {e.verifier_note}
        </div>
      )}

      <EntryForm
        action={updateEntry}
        initial={e}
        diseases={(d.data ?? []) as Disease[]}
        procedures={(p.data ?? []) as Procedure[]}
        competencies={(c.data ?? []) as ClinicalCompetency[]}
      />
    </div>
  );
}
