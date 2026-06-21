"use client";

import { useEffect } from "react";
import { Icons } from "@/components/icons";

export function PrintButton() {
  // Saat mencetak, paksa mode terang agar dokumen PDF tetap putih & formal,
  // lalu kembalikan tema semula setelah dialog cetak selesai.
  useEffect(() => {
    let wasDark = false;
    const before = () => {
      wasDark = document.documentElement.classList.contains("dark");
      if (wasDark) document.documentElement.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) document.documentElement.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icons.printer className="h-4 w-4" />
      Cetak / Simpan PDF
    </button>
  );
}
