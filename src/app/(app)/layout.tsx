import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Topbar, type NavItem } from "@/components/topbar";
import { InstallPopup } from "@/components/pwa-install";
import { AntiBullyingModal } from "@/components/anti-bullying-modal";
import { getProgram, PLATFORM_NAME, accentHex } from "@/lib/program";
import { getKpsProgramIds } from "@/lib/kps";
import { ROLE_LABEL, isProdiScoped } from "@/lib/roles";
import type { IconName } from "@/components/icons";
import type { UserRole } from "@/lib/types";

// Peran ber-lingkup-prodi (KPS, SPS, Admin Prodi) melihat menu yang sama.
// Admin Prodi bersifat read-only — pembatasan aksi ada di tiap halaman.
const PRODI = ["kps", "sps", "admin_prodi"] as const;
const ALL: UserRole[] = ["residen", "supervisor", "penguji", "admin", ...PRODI];

const NAV: (NavItem & { roles: UserRole[] })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ALL },
  { href: "/logbook", label: "Logbook Saya", icon: "logbook", roles: ["residen"] },
  { href: "/logbook/new", label: "Entri Baru", icon: "plus", roles: ["residen"] },
  { href: "/pengetahuan", label: "Pengetahuan Saya", icon: "brain", roles: ["residen"] },
  { href: "/karya", label: "Karya Ilmiah", icon: "research", roles: ["residen"] },
  { href: "/verifikasi", label: "Verifikasi", icon: "verify", roles: ["supervisor", "admin", ...PRODI] },
  { href: "/penilaian", label: "Penilaian", icon: "clipboard", roles: ["penguji", "admin", ...PRODI] },
  { href: "/rekap", label: "Rekap", icon: "chart", roles: ["admin", ...PRODI] },
  { href: "/laporan", label: "Laporan Platform", icon: "activity", roles: ["admin"], group: "kelola" },
  { href: "/kurikulum", label: "Kurikulum", icon: "stethoscope", roles: ["admin", ...PRODI], group: "kelola" },
  { href: "/audit", label: "Audit Log", icon: "shield", roles: ["admin", ...PRODI], group: "kelola" },
  { href: "/admin", label: "Manajemen User", icon: "users", roles: ["admin", ...PRODI], group: "kelola" },
  { href: "/profil", label: "Profil", icon: "user", roles: ALL, group: "akun" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items: NavItem[] = NAV.filter((n) => n.roles.includes(profile.role)).map(
    ({ href, label, icon, group }) => ({ href, label, icon: icon as IconName, group }),
  );

  // Badge & notifikasi belum dibaca.
  const supabase = await createClient();

  // Branding kontekstual: residen pakai nama+aksen program rumahnya; KPS yang
  // membawahi 1 prodi memakai prodi itu, KPS lintas-beberapa-prodi memakai
  // nama platform netral; DPJP/penguji/admin (lintas program) juga netral.
  let homeProgram = null;
  if (profile.role === "residen" && profile.program_id) {
    homeProgram = await getProgram(supabase, profile.program_id);
  } else if (isProdiScoped(profile.role)) {
    const ids = await getKpsProgramIds(supabase, profile.id);
    if (ids.length === 1) homeProgram = await getProgram(supabase, ids[0]);
  }
  const brandName = homeProgram?.nama ?? PLATFORM_NAME;
  const brandAccent = accentHex(homeProgram?.config?.accent);

  // Peran yang punya antrean verifikasi (untuk badge). Admin Prodi read-only
  // tetap melihat halaman namun tak menimbulkan beban keputusan.
  const canVerify = ["supervisor", "kps", "sps", "admin"].includes(profile.role);
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
      <AntiBullyingModal userId={profile.id} />
    </div>
  );
}
