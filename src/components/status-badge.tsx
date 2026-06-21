import type { EntryStatus } from "@/lib/types";

const MAP: Record<EntryStatus, { label: string; cls: string }> = {
  draft: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  },
  diajukan: {
    label: "Menunggu",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  diverifikasi: {
    label: "Terverifikasi",
    cls: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  },
  revisi: {
    label: "Perlu revisi",
    cls: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
  ditolak: {
    label: "Ditolak",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  const s = MAP[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
