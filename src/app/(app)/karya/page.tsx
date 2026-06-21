import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AcademicForm, JENIS_LABEL, TAHAP_LABEL } from "@/components/academic-form";
import { StatusBadge } from "@/components/status-badge";
import { createWork, updateWork, deleteWork } from "@/app/(app)/karya/actions";
import type { AcademicWork, SupervisorOption } from "@/lib/types";

function WorkActions({ w }: { w: AcademicWork }) {
  const canEdit = w.status === "draft" || w.status === "revisi";
  if (!canEdit) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        href={`/karya?edit=${w.id}`}
        className="text-teal-700 hover:underline dark:text-teal-400"
      >
        Sunting
      </Link>
      <form action={deleteWork}>
        <input type="hidden" name="work_id" value={w.id} />
        <button className="text-rose-600 hover:underline dark:text-rose-400">
          Hapus
        </button>
      </form>
    </div>
  );
}

function Row({ w }: { w: AcademicWork }) {
  return (
    <tr className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
        {JENIS_LABEL[w.jenis]}
      </td>
      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
        {w.judul}
        {w.evidence_url && (
          <a
            href={w.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            berkas ↗
          </a>
        )}
      </td>
      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
        {w.tanggal ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={w.status} />
        {w.verifier_note && (
          <div className="mt-1 text-xs italic text-orange-600 dark:text-orange-400">
            “{w.verifier_note}”
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <WorkActions w={w} />
      </td>
    </tr>
  );
}

const THEAD =
  "bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400";

export default async function KaryaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const me = await requireProfile();
  if (me.role !== "residen") redirect("/dashboard");
  const { edit } = await searchParams;

  const supabase = await createClient();
  const [worksRes, supRes] = await Promise.all([
    supabase
      .from("academic_works")
      .select(
        "id, jenis, tahap, judul, tanggal, pembimbing_id, evidence_url, catatan, status, verifier_note",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "supervisor")
      .order("full_name"),
  ]);

  const works = (worksRes.data ?? []) as AcademicWork[];
  const supervisors = (supRes.data ?? []) as SupervisorOption[];

  const editing = edit ? works.find((w) => w.id === edit) : undefined;
  const karya = works.filter((w) => w.jenis !== "tesis");
  const tesis = works
    .filter((w) => w.jenis === "tesis")
    .sort((a, b) =>
      Object.keys(TAHAP_LABEL).indexOf(a.tahap ?? "") -
      Object.keys(TAHAP_LABEL).indexOf(b.tahap ?? ""),
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Karya &amp; Kegiatan Ilmiah
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sari pustaka, telaah jurnal, laporan kasus, dan tahapan tesis.
          Diajukan ke pembimbing untuk diverifikasi.
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editing ? "Sunting karya" : "Tambah karya / tahapan baru"}
          </h2>
          {editing && (
            <Link
              href="/karya"
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              (batal sunting)
            </Link>
          )}
        </div>
        <AcademicForm
          key={editing?.id ?? "new"}
          supervisors={supervisors}
          action={editing ? updateWork : createWork}
          initial={editing}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Karya Ilmiah
        </h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className="px-4 py-2.5">Jenis</th>
                <th className="px-4 py-2.5">Judul</th>
                <th className="px-4 py-2.5">Tanggal</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {karya.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada karya ilmiah.
                  </td>
                </tr>
              )}
              {karya.map((w) => (
                <Row key={w.id} w={w} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Tesis / Penelitian
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
            (tahapan)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className="px-4 py-2.5">Tahap</th>
                <th className="px-4 py-2.5">Judul</th>
                <th className="px-4 py-2.5">Tanggal</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tesis.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada tahapan tesis. Tambahkan lewat form di atas (pilih
                    jenis “Tesis / penelitian”).
                  </td>
                </tr>
              )}
              {tesis.map((w) => (
                <tr
                  key={w.id}
                  className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {TAHAP_LABEL[w.tahap ?? ""] ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {w.judul}
                    {w.evidence_url && (
                      <a
                        href={w.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                      >
                        berkas ↗
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {w.tanggal ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={w.status} />
                    {w.verifier_note && (
                      <div className="mt-1 text-xs italic text-orange-600 dark:text-orange-400">
                        “{w.verifier_note}”
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <WorkActions w={w} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
