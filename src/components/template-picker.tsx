"use client";

import { useRouter } from "next/navigation";
import { deleteTemplate } from "@/app/(app)/logbook/actions";

export function TemplatePicker({
  templates,
  selected,
}: {
  templates: { id: string; nama: string }[];
  selected?: string;
}) {
  const router = useRouter();

  if (templates.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Belum ada template. Isi form lalu klik “Simpan template” di bawah untuk
        membuatnya.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Gunakan template:
        </label>
        <select
          value={selected ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v ? `/logbook/new?template=${v}` : "/logbook/new");
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">— pilih —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <span
            key={t.id}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
              t.id === selected
                ? "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {t.nama}
            <form action={deleteTemplate}>
              <input type="hidden" name="template_id" value={t.id} />
              <button
                type="submit"
                title="Hapus template"
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                ✕
              </button>
            </form>
          </span>
        ))}
      </div>
    </div>
  );
}
