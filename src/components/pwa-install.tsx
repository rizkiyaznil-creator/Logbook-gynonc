"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";

type BIPEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function getPrompt(): BIPEvent | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __bip?: BIPEvent }).__bip ?? null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Re-render saat ketersediaan prompt berubah. */
function useInstallable() {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    const bump = () => setReady((n) => n + 1);
    window.addEventListener("bip-ready", bump);
    window.addEventListener("appinstalled", bump);
    return () => {
      window.removeEventListener("bip-ready", bump);
      window.removeEventListener("appinstalled", bump);
    };
  }, []);
  // ready dipakai sebagai dependensi implisit re-render
  void ready;
  return getPrompt();
}

async function install(): Promise<boolean> {
  const e = getPrompt();
  if (!e) return false;
  e.prompt();
  const choice = await e.userChoice.catch(() => null);
  (window as unknown as { __bip?: BIPEvent | null }).__bip = null;
  window.dispatchEvent(new Event("bip-ready"));
  return choice?.outcome === "accepted";
}

/** Tombol pasang aplikasi untuk halaman Profil. */
export function InstallButton() {
  const prompt = useInstallable();
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIOS());
  }, []);

  if (standalone) {
    return (
      <div className="flex max-w-xl items-center gap-3 rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
        <Icons.check className="h-5 w-5 text-emerald-500" />
        Aplikasi sudah terpasang di perangkat ini.
      </div>
    );
  }

  return (
    <div className="max-w-xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <Icons.download className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Pasang aplikasi
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Akses lebih cepat langsung dari layar utama, seperti aplikasi biasa.
          </div>
        </div>
        {prompt && (
          <button
            onClick={() => install()}
            className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Pasang
          </button>
        )}
      </div>
      {!prompt && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {ios
            ? "Di iPhone/iPad: buka menu Bagikan (kotak dengan panah ke atas) lalu pilih “Tambahkan ke Layar Utama”."
            : "Jika tombol Pasang belum muncul, gunakan menu browser (⋮) → “Pasang aplikasi”/“Install app”. Mungkin aplikasi sudah terpasang."}
        </p>
      )}
    </div>
  );
}

/** Pop-up otomatis 5 detik saat dibuka di browser (bukan mode terpasang). */
export function InstallPopup() {
  const prompt = useInstallable();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!prompt || isStandalone()) return;
    if (sessionStorage.getItem("installPopupSeen")) return;
    setShow(true);
    sessionStorage.setItem("installPopupSeen", "1");
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [prompt]);

  const close = useCallback(() => setShow(false), []);

  if (!show || !prompt) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm animate-in rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:left-auto sm:right-4 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <Icons.download className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Pasang aplikasi?
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Tambahkan Logbook PPDS USU ke layar utama untuk akses cepat.
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                install();
                close();
              }}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Pasang
            </button>
            <button
              onClick={close}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          onClick={close}
          aria-label="Tutup"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <Icons.close className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
