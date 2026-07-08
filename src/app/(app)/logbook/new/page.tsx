import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getProgram } from "@/lib/program";
import { EntryForm } from "@/components/entry-form";
import { TemplatePicker } from "@/components/template-picker";
import { createEntry } from "@/app/(app)/logbook/actions";
import { RS_BAKU } from "@/lib/constants";
import type {
  Disease,
  Procedure,
  ClinicalCompetency,
  SupervisorOption,
  EntryTemplate,
  LogEntry,
} from "@/lib/types";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await getProgram(supabase, profile.program_id);
  const [d, p, c, s, rs, t] = await Promise.all([
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
    supabase.from("entry_templates").select("*").order("nama"),
  ]);

  const used = (rs.data ?? [])
    .map((r: { rumah_sakit: string | null }) => r.rumah_sakit)
    .filter((x): x is string => !!x);
  const hospitals = Array.from(new Set([...RS_BAKU, ...used]));

  const templates = (t.data ?? []) as EntryTemplate[];
  const tpl = template ? templates.find((x) => x.id === template) : undefined;
  // Prefill dari template (tanpa id/tanggal/data pasien).
  const initial: Partial<LogEntry> | undefined = tpl
    ? {
        entry_type: tpl.entry_type,
        procedure_id: tpl.procedure_id,
        clinical_competency_id: tpl.clinical_competency_id,
        disease_id: tpl.disease_id,
        supervisor_id: tpl.supervisor_id,
        rumah_sakit: tpl.rumah_sakit,
        setting: tpl.setting,
        surgical_role: tpl.surgical_role,
        supervision_level: tpl.supervision_level,
        dokumentasi_jenis: tpl.dokumentasi_jenis,
        figo_stage: tpl.figo_stage,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-teal-700 hover:underline dark:text-teal-400"
        >
          ← Kembali ke Dashboard
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Entri Logbook Baru
        </h1>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <TemplatePicker
          templates={templates.map((x) => ({ id: x.id, nama: x.nama }))}
          selected={template}
        />
      </div>

      <EntryForm
        action={createEntry}
        initial={initial}
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
