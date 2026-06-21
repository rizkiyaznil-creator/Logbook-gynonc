"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetSandiPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase memproses token recovery di URL lalu memunculkan sesi.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }
    if (pw !== pw2) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Setel ulang kata sandi
        </h1>

        {done ? (
          <p className="mt-6 rounded-lg bg-teal-50 p-3 text-sm text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
            Kata sandi berhasil diubah. Mengalihkan…
          </p>
        ) : !ready ? (
          <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Memvalidasi tautan… Jika halaman ini tidak berubah, tautan mungkin
              kedaluwarsa.
            </p>
            <Link
              href="/auth/lupa-sandi"
              className="block text-teal-700 hover:underline dark:text-teal-400"
            >
              Minta tautan baru
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kata sandi baru
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  {show ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ulangi kata sandi
              </label>
              <input
                type={show ? "text" : "password"}
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className={input.replace(" pr-16", "")}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan kata sandi baru"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
