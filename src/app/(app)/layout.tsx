import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import type { UserRole } from "@/lib/types";

const NAV: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["residen", "supervisor", "kps", "penguji", "admin"] },
  { href: "/logbook", label: "Logbook Saya", roles: ["residen"] },
  { href: "/logbook/new", label: "+ Entri Baru", roles: ["residen"] },
  { href: "/pengetahuan", label: "Pengetahuan Saya", roles: ["residen"] },
  { href: "/verifikasi", label: "Verifikasi", roles: ["supervisor", "kps", "admin"] },
  { href: "/penilaian", label: "Penilaian", roles: ["penguji", "kps", "admin"] },
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
  const items = NAV.filter((n) => n.roles.includes(profile.role));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-teal-700">
              Logbook Onko-Gin
            </span>
            <nav className="flex gap-4 text-sm">
              {items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-slate-600 hover:text-teal-700"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium text-slate-800">
                {profile.full_name}
              </div>
              <div className="text-xs text-slate-500">
                {ROLE_LABEL[profile.role]}
              </div>
            </div>
            <form action={signOut}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
