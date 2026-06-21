"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Icons, type IconName } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { BrandLogo } from "@/components/brand-logo";

export type NavItem = { href: string; label: string; icon: IconName };

export function Topbar({
  items,
  fullName,
  roleLabel,
  avatarUrl,
  badges = {},
  unreadCount = 0,
}: {
  items: NavItem[];
  fullName: string;
  roleLabel: string;
  avatarUrl: string | null;
  badges?: Record<string, number>;
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Menu aktif = href terpanjang yang cocok dengan path saat ini.
  const activeHref = items
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
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
            src="/usu-logo.png"
            alt="Logo USU"
            className="h-8 w-8 object-contain"
            fallback={
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-sm font-bold text-white shadow-sm">
                OG
              </span>
            }
          />
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text font-semibold text-transparent dark:from-teal-400 dark:to-emerald-400">
            Logbook Onko-Gin
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {items.map((n) => link(n))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell initialUnread={unreadCount} />
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={fullName} src={avatarUrl} size={36} />
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {fullName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {roleLabel}
              </div>
            </div>
          </div>
          <form action={signOut} className="hidden sm:block">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Keluar"
            >
              <Icons.logout className="h-4 w-4" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          </form>
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
            {items.map((n) => link(n, () => setOpen(false)))}
          </nav>
        </div>
      )}
    </header>
  );
}
