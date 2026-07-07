"use client";

import { useEffect, useState } from "react";

// Kunci tanggal lokal (YYYY-MM-DD) untuk pembatas "sekali per hari".
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Modal komitmen anti-perundungan. Muncul sekali per hari per pengguna
 * (status disimpan di localStorage — tanpa pencatatan ke server). Menghalangi
 * layar sampai pengguna menekan "Saya Berkomitmen". Dipasang di layout aplikasi
 * sehingga tampil untuk semua peran setelah login.
 */
export function AntiBullyingModal({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const storageKey = `antibully_ack_${userId}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== todayKey()) setShow(true);
    } catch {
      // localStorage tak tersedia (mode privat dll.) → tetap tampilkan.
      setShow(true);
    }
  }, [storageKey]);

  // Kunci scroll latar selama modal tampil.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const commit = () => {
    try {
      localStorage.setItem(storageKey, todayKey());
    } catch {
      // abaikan — modal tetap ditutup untuk sesi ini.
    }
    setShow(false);
  };

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="antibully-title"
        className="animate-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-3xl dark:bg-teal-500/15">
            🤝
          </span>
          <h2
            id="antibully-title"
            className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-100"
          >
            Komitmen Anti-Perundungan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Saya berkomitmen untuk menghormati setiap{" "}
            <b>pasien, sejawat, guru, senior, junior, dan tenaga kesehatan</b>,
            serta menjaga{" "}
            <b>
              kehormatan dan martabat setiap manusia dan diri saya sendiri
            </b>
            .
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-rose-600 dark:text-rose-400">
            SAYA TIDAK AKAN MENTOLERANSI TINDAKAN BULLYING DALAM JENIS APA PUN —
            baik fisik, verbal, psikologis, maupun digital.
          </p>
          <button
            onClick={commit}
            className="mt-5 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Saya Berkomitmen
          </button>
        </div>
      </div>
    </div>
  );
}
