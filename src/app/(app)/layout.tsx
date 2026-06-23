import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Topbar, type NavItem } from "@/components/topbar";
import { InstallPopup } from "@/components/pwa-install";
import { getProgram, PLATFORM_NAME, accentHex } from "@/lib/program";
import type { IconName } from "@/components/icons";
import type { UserRole } from "@/lib/types";

const NAV: (NavItem & { roles: UserRole[] })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["residen", "supervisor", "kps", "penguji", "admin"] },
  { href: "/logbook", label: "Logbook Saya", icon: "logbook", roles: ["residen"] },
  { href: "/logbook/new", label: "Entri Baru", icon: "plus", roles: ["residen"] },
  { href: "/pengetahuan", label: "Pengetahuan Saya", icon: "brain", roles: ["residen"] },
  { href: "/karya", label: "Karya Ilmiah", icon: "research", roles: ["residen"] },
  { href: "/verifikasi", label: "Verifikasi", icon: "verify", roles: ["supervisor", "kps", "admin"] },
  { href: "/penilaian", label: "Penilaian", icon: "clipboard", roles: ["penguji", "kps", "admin"] },
  { href: "/rekap", label: "Rekap", icon: "chart", roles: ["kps", "admin"] },
  { href: "/laporan", label: "Laporan Platform", icon: "activity", roles: ["admin"] },
  { href: "/kurikulum", label: "Kurikulum", icon: "stethoscope", roles: ["kps", "admin"] },
  { href: "/audit", label: "Audit Log", icon: "shield", roles: ["kps", "admin"] },
  { href: "/admin", label: "Manajemen User", icon: "users", roles: ["kps", "admin"] },
  { href: "/profil", label: "Profil", icon: "user", roles: ["residen", "supervisor", "kps", "penguji", "admin"] },
];

const ROLE_LABEL: Record<UserRole, string> = {
  residen: "Residen",
  supervisor: "Supervisor",
  kps: "KPS / Admin Prodi",
  penguji: "Penguji",
  admin: "Administrator",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items: NavItem[] = NAV.filter((n) => n.roles.includes(profile.role)).map(
    ({ href, label, icon }) => ({ href, label, icon: icon as IconName }),
  );

  // Badge & notifikasi belum dibaca.
  const supabase = await createClient();

  // Branding kontekstual: residen/KPS pakai nama+aksen program rumahnya;
  // DPJP/penguji/admin (lintas program) memakai nama platform netral.
  const homeProgram =
    profile.program_id && ["residen", "kps"].includes(profile.role)
      ? await getProgram(supabase, profile.program_id)
      : null;
  const brandName = homeProgram?.nama ?? PLATFORM_NAME;
  const brandAccent = accentHex(homeProgram?.config?.accent);

  const canVerify = ["supervisor", "kps", "admin"].includes(profile.role);
  const cnt = (q: PromiseLike<{ count: number | null }>) =>
    q.then((r) => r.count ?? 0);
  const zero = Promise.resolve(0);

  const [unreadCount, pendingEntries, pendingWorks, revisiCount] =
    await Promise.all([
      cnt(
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
      ),
      canVerify
        ? cnt(
            supabase
              .from("log_entries")
              .select("id", { count: "exact", head: true })
              .eq("status", "diajukan"),
          )
        : zero,
      canVerify
        ? cnt(
            supabase
              .from("academic_works")
              .select("id", { count: "exact", head: true })
              .eq("status", "diajukan"),
          )
        : zero,
      profile.role === "residen"
        ? cnt(
            supabase
              .from("log_entries")
              .select("id", { count: "exact", head: true })
              .eq("status", "revisi"),
          )
        : zero,
    ]);

  const badges: Record<string, number> = {};
  if (pendingEntries + pendingWorks > 0)
    badges["/verifikasi"] = pendingEntries + pendingWorks;
  if (revisiCount > 0) badges["/logbook"] = revisiCount;

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        items={items}
        fullName={profile.full_name}
        roleLabel={ROLE_LABEL[profile.role]}
        avatarUrl={profile.avatar_url}
        badges={badges}
        unreadCount={unreadCount}
        brandName={brandName}
        brandAccent={brandAccent}
      />
      <main className="animate-in mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="no-print border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <div className="text-slate-500 dark:text-slate-400">
          Universitas Sumatera Utara · Fakultas Kedokteran · Prodi Subspesialis
          Obstetri &amp; Ginekologi
        </div>
        <div className="mt-1">Didesain oleh Muhammad Rizki Yaznil</div>
      </footer>
      <InstallPopup />
    </div>
  );
}
