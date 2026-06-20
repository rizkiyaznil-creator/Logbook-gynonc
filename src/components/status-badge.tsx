import type { EntryStatus } from "@/lib/types";

const MAP: Record<EntryStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  diajukan: { label: "Menunggu", cls: "bg-amber-100 text-amber-700" },
  diverifikasi: { label: "Terverifikasi", cls: "bg-teal-100 text-teal-700" },
  revisi: { label: "Perlu revisi", cls: "bg-orange-100 text-orange-700" },
  ditolak: { label: "Ditolak", cls: "bg-rose-100 text-rose-700" },
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  const s = MAP[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
