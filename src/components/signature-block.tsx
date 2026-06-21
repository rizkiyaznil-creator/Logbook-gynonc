import { createClient } from "@/lib/supabase/server";

function Col({
  title,
  topNote,
  name,
  subline,
}: {
  title: string;
  topNote?: string;
  name?: string | null;
  subline: string;
}) {
  return (
    <div className="text-center text-sm">
      <div className="text-slate-600 dark:text-slate-300">{topNote ?? " "}</div>
      <div className="font-medium text-slate-700 dark:text-slate-200">
        {title}
      </div>
      <div className="h-16" />
      <div className="mx-auto w-56 border-t border-slate-400 pt-1 dark:border-slate-500">
        <div className="font-medium text-slate-800 dark:text-slate-100">
          {name || "( …………………………… )"}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {subline}
        </div>
      </div>
    </div>
  );
}

export async function SignatureBlock({ residentId }: { residentId: string }) {
  const supabase = await createClient();
  const [resProf, kpsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, no_telp")
      .eq("id", residentId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, nip")
      .eq("role", "kps")
      .order("full_name")
      .limit(2),
  ]);

  const residentName = (resProf.data as { full_name: string } | null)
    ?.full_name;
  const kpsList = (kpsRes.data ?? []) as { full_name: string; nip: string | null }[];
  // Tampilkan nama KPS hanya bila tepat satu (tanpa ambiguitas).
  const kps = kpsList.length === 1 ? kpsList[0] : null;

  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Dokumen rekap pencapaian kompetensi ini dinyatakan sah setelah
        ditandatangani oleh pihak-pihak di bawah ini.
      </p>
      <div className="mb-2 text-right text-sm text-slate-600 dark:text-slate-300">
        Medan, {tanggal}
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <Col
          topNote="Hormat saya,"
          title="Residen"
          name={residentName}
          subline="Peserta PPDS"
        />
        <Col
          topNote="Mengetahui,"
          title="DPJP / Pembimbing"
          subline="NIP. ……………………"
        />
        <Col
          topNote="Mengesahkan,"
          title="Ketua Program Studi"
          name={kps?.full_name}
          subline={kps?.nip ? `NIP. ${kps.nip}` : "NIP. ……………………"}
        />
      </div>
    </section>
  );
}
