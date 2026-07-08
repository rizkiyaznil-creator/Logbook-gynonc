import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/program";
import { EntryForm } from "@/components/entry-form";
import { updateEntry, deleteEntry } from "@/app/(app)/logbook/actions";
import { RS_BAKU } from "@/lib/constants";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  LogEntry,
  SupervisorOption,
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

  const [d, p, c, s, rs] = await Promise.all([
    supabase.from("diseases").select("*").order("no"),
    supabase.from("procedures").select("*").order("no"),
    supabase.from("clinical_competencies").select("*").order("no"),
    supabase
      .from("profiles")
      .select("id, full_name")
      // DPJP penanggung jawab boleh Supervisor, Ketua Prodi, atau SPS.
      .in("role", ["supervisor", "kps", "sps"])
      .order("full_name"),
    supabase.from("log_entries").select("rumah_sakit"),
  ]);

  const used = (rs.data ?? [])
    .map((r: { rumah_sakit: string | null }) => r.rumah_sakit)
    .filter((x): x is string => !!x);
  const hospitals = Array.from(new Set([...RS_BAKU, ...used]));

  // Label/FIGO mengikuti config program ENTRI ini.
  const program = await getProgram(supabase, e.program_id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/logbook" className="text-sm text-teal-700 hover:underline">
        ← Kembali ke Logbook
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Sunting Entri</h1>
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
        lockType
        diseases={(d.data ?? []) as Disease[]}
        procedures={(p.data ?? []) as Procedure[]}
        competencies={(c.data ?? []) as ClinicalCompetency[]}
        supervisors={(s.data ?? []) as SupervisorOption[]}
        hospitals={hospitals}
        config={program?.config}
      />
    </div>
  );
}
