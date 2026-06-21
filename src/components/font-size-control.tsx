"use client";

import { useEffect, useState } from "react";

const MIN = 80;
const MAX = 140;
const STEP = 10;
const DEFAULT = 100;

function apply(scale: number) {
  document.documentElement.style.fontSize = scale + "%";
  try {
    localStorage.setItem("fontScale", String(scale));
  } catch {}
}

export function FontSizeControl() {
  const [scale, setScale] = useState(DEFAULT);

  useEffect(() => {
    let saved = DEFAULT;
    try {
      const v = parseInt(localStorage.getItem("fontScale") ?? "", 10);
      if (!Number.isNaN(v)) saved = Math.min(MAX, Math.max(MIN, v));
    } catch {}
    setScale(saved);
  }, []);

  function set(next: number) {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setScale(clamped);
    apply(clamped);
  }

  const btn =
    "grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="max-w-xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Ukuran teks
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Perbesar atau perkecil ukuran teks seluruh aplikasi. Tersimpan di
        perangkat ini. Memperkecil membantu menampilkan lebih banyak kolom tabel
        di layar kecil.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => set(scale - STEP)}
          disabled={scale <= MIN}
          aria-label="Perkecil teks"
          className={btn}
        >
          <span className="text-sm font-semibold">A−</span>
        </button>

        <div className="flex min-w-[5rem] flex-col items-center">
          <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {scale}%
          </span>
          {scale === DEFAULT && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              normal
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => set(scale + STEP)}
          disabled={scale >= MAX}
          aria-label="Perbesar teks"
          className={btn}
        >
          <span className="text-lg font-semibold">A+</span>
        </button>

        {scale !== DEFAULT && (
          <button
            type="button"
            onClick={() => set(DEFAULT)}
            className="ml-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Reset
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Contoh teks —{" "}
        <span className="font-semibold">judul</span> dan isi paragraf akan
        mengikuti ukuran ini.
      </p>
    </div>
  );
}
