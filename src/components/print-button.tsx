"use client";

import { useEffect } from "react";

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
      className="no-print rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      Cetak / Simpan PDF
    </button>
  );
}
