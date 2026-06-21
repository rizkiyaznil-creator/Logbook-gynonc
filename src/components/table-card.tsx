"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pembungkus tabel yang bisa digeser horizontal di layar kecil.
 * Menampilkan gradien + tanda ">" di tepi kanan hanya bila masih ada
 * kolom tersembunyi, dan hilang setelah digeser sampai ujung.
 */
export function TableCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const more = el.scrollWidth - el.clientWidth > 4;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setHint(more && !atEnd);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}
      >
        {children}
      </div>
      {hint && (
        <span
          aria-hidden
          className="no-print pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end rounded-r-xl bg-gradient-to-l from-white to-transparent pr-1.5 text-slate-400 dark:from-slate-900 dark:text-slate-500"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      )}
    </div>
  );
}
