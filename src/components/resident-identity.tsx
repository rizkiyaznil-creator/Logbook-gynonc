import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value || "—"}</div>
    </div>
  );
}

export async function ResidentIdentity({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const [profRes, resRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, no_telp, avatar_url")
      .eq("id", residentId)
      .maybeSingle(),
    supabase
      .from("residents")
      .select("no_peserta, angkatan, tanggal_mulai")
      .eq("id", residentId)
      .maybeSingle(),
  ]);

  const p = profRes.data as
    | {
        full_name: string;
        email: string | null;
        no_telp: string | null;
        avatar_url: string | null;
      }
    | null;
  const r = resRes.data as
    | { no_peserta: string | null; angkatan: string | null; tanggal_mulai: string | null }
    | null;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-center gap-4 border-b border-slate-100 pb-3">
        <Avatar name={p?.full_name ?? "Residen"} src={p?.avatar_url} size={56} />
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Rekap Pencapaian Kompetensi — Logbook Subspesialis Onkologi
            Ginekologi
          </div>
          <div className="text-lg font-semibold text-slate-800">
            {p?.full_name ?? "Residen"}
          </div>
          <div className="text-xs text-slate-500">
            PPDS Subspesialis Onkologi Ginekologi
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Field label="No. Peserta / NIM" value={r?.no_peserta ?? null} />
        <Field label="Angkatan" value={r?.angkatan ?? null} />
        <Field
          label="Tanggal mulai"
          value={
            r?.tanggal_mulai
              ? new Date(r.tanggal_mulai).toLocaleDateString("id-ID")
              : null
          }
        />
        <Field label="No. HP" value={p?.no_telp ?? null} />
        <Field label="Email" value={p?.email ?? null} />
        <Field
          label="Tanggal cetak"
          value={new Date().toLocaleDateString("id-ID")}
        />
      </div>
    </div>
  );
}
