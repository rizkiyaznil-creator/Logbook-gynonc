import { requireProfile } from "@/lib/auth";
import { Topbar, type NavItem } from "@/components/topbar";
import type { IconName } from "@/components/icons";
import type { UserRole } from "@/lib/types";

const NAV: (NavItem & { roles: UserRole[] })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["residen", "supervisor", "kps", "penguji", "admin"] },
  { href: "/logbook", label: "Logbook Saya", icon: "logbook", roles: ["residen"] },
  { href: "/logbook/new", label: "Entri Baru", icon: "plus", roles: ["residen"] },
  { href: "/pengetahuan", label: "Pengetahuan Saya", icon: "brain", roles: ["residen"] },
  { href: "/verifikasi", label: "Verifikasi", icon: "verify", roles: ["supervisor", "kps", "admin"] },
  { href: "/penilaian", label: "Penilaian", icon: "clipboard", roles: ["penguji", "kps", "admin"] },
  { href: "/rekap", label: "Rekap", icon: "chart", roles: ["kps", "admin"] },
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

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        items={items}
        fullName={profile.full_name}
        roleLabel={ROLE_LABEL[profile.role]}
      />
      <main className="animate-in mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="no-print border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Didesain oleh Muhammad Rizki Yaznil
      </footer>
    </div>
  );
}
