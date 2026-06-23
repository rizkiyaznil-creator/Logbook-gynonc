"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Icons, type IconName } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { BrandLogo } from "@/components/brand-logo";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** "main" tampil inline, "kelola" masuk dropdown, "akun" masuk menu avatar. */
  group?: "main" | "kelola" | "akun";
};

export function Topbar({
  items,
  fullName,
  roleLabel,
  avatarUrl,
  badges = {},
  unreadCount = 0,
  brandName = "Logbook PPDS USU",
  brandAccent = "#0f766e",
}: {
  items: NavItem[];
  fullName: string;
  roleLabel: string;
  avatarUrl: string | null;
  badges?: Record<string, number>;
  unreadCount?: number;
  /** Nama program (residen/KPS) atau nama platform (lintas program). */
  brandName?: string;
  /** Warna aksen program (hex) untuk indikator merek. */
  brandAccent?: string;
}) {
  // Panel mobile + dropdown desktop yang sedang terbuka ("kelola" | "akun").
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"kelola" | "akun" | null>(null);
  const pathname = usePathname();

  // Tutup dropdown saat klik di luar atau pindah halaman.
  useEffect(() => setMenu(null), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.("[data-menu-root]")) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const mainItems = items.filter((n) => (n.group ?? "main") === "main");
  const kelolaItems = items.filter((n) => n.group === "kelola");
  const akunItems = items.filter((n) => n.group === "akun");

  // Menu aktif = href terpanjang yang cocok dengan path saat ini.
  const activeHref = items
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const kelolaActive = kelolaItems.some((n) => n.href === activeHref);
  const kelolaBadge = kelolaItems.reduce((s, n) => s + (badges[n.href] ?? 0), 0);

  const link = (n: NavItem, onClick?: () => void) => {
    const active = n.href === activeHref;
    const Icon = Icons[n.icon];
    const count = badges[n.href] ?? 0;
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onClick}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {n.label}
        {count > 0 && (
          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-slate-800 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <BrandLogo
            src="/logo-mark.png"
            alt="Logo USU"
            className="h-8 w-8 object-contain"
            fallback={
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: brandAccent }}
              >
                {brandName.slice(0, 2).toUpperCase()}
              </span>
            }
          />
          <span
            className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"
            title={brandName}
          >
            <span
              className="hidden h-2.5 w-2.5 shrink-0 rounded-full sm:inline-block"
              style={{ backgroundColor: brandAccent }}
              aria-hidden
            />
            {brandName}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {mainItems.map((n) => link(n))}

          {kelolaItems.length > 0 && (
            <div className="relative" data-menu-root>
              <button
                onClick={() => setMenu((m) => (m === "kelola" ? null : "kelola"))}
                aria-expanded={menu === "kelola"}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  kelolaActive || menu === "kelola"
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <Icons.cog className="h-4 w-4 shrink-0" />
                Kelola
                {kelolaBadge > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                    {kelolaBadge > 99 ? "99+" : kelolaBadge}
                  </span>
                )}
                <Icons.chevron
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${menu === "kelola" ? "rotate-180" : ""}`}
                />
              </button>
              {menu === "kelola" && (
                <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {kelolaItems.map((n) => link(n, () => setMenu(null)))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell initialUnread={unreadCount} />
          <ThemeToggle />

          {/* Menu akun (desktop) */}
          <div className="relative hidden sm:block" data-menu-root>
            <button
              onClick={() => setMenu((m) => (m === "akun" ? null : "akun"))}
              aria-expanded={menu === "akun"}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Avatar name={fullName} src={avatarUrl} size={36} />
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {roleLabel}
                </div>
              </div>
              <Icons.chevron
                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${menu === "akun" ? "rotate-180" : ""}`}
              />
            </button>
            {menu === "akun" && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-2 md:hidden dark:border-slate-800">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {fullName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {roleLabel}
                  </div>
                </div>
                {akunItems.map((n) => link(n, () => setMenu(null)))}
                <form action={signOut}>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                    <Icons.logout className="h-4 w-4 shrink-0" />
                    Keluar
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Menu"
          >
            {open ? (
              <Icons.close className="h-5 w-5" />
            ) : (
              <Icons.menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <div className="mb-2 flex items-center justify-between sm:hidden">
            <div className="flex items-center gap-2">
              <Avatar name={fullName} src={avatarUrl} size={36} />
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {roleLabel}
                </div>
              </div>
            </div>
            <form action={signOut}>
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Icons.logout className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
          <nav className="grid gap-1">
            {mainItems.map((n) => link(n, () => setOpen(false)))}
            {kelolaItems.length > 0 && (
              <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Kelola
                </div>
                {kelolaItems.map((n) => link(n, () => setOpen(false)))}
              </div>
            )}
            {akunItems.length > 0 && (
              <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                {akunItems.map((n) => link(n, () => setOpen(false)))}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
