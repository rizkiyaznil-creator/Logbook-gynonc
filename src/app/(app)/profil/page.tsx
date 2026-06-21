import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ProfileForm, type ResidentData } from "@/components/profile-form";
import { FontSizeControl } from "@/components/font-size-control";
import { Icons } from "@/components/icons";

export default async function ProfilPage() {
  const profile = await requireProfile();
  let resident: ResidentData | null = null;

  if (profile.role === "residen") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("residents")
      .select("no_peserta, angkatan, tanggal_mulai")
      .eq("id", profile.id)
      .maybeSingle();
    resident = (data as ResidentData) ?? null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Profil Saya
      </h1>
      <ProfileForm profile={profile} resident={resident} />

      <h2 className="pt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Tampilan
      </h2>
      <FontSizeControl />

      <h2 className="pt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Bantuan
      </h2>
      <Link
        href="/panduan"
        className="flex max-w-xl items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/50"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <Icons.logbook className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Panduan Penggunaan
          </span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            Petunjuk sesuai peran Anda — dapat dicetak / disimpan sebagai PDF.
          </span>
        </span>
        <span className="text-slate-400 dark:text-slate-500">→</span>
      </Link>
    </div>
  );
}
