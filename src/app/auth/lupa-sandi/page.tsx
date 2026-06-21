"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LupaSandiPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-sandi`,
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Lupa kata sandi
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Masukkan email akun Anda. Kami kirim tautan untuk menyetel ulang kata
          sandi.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
              Jika email terdaftar, tautan reset telah dikirim. Periksa kotak
              masuk (dan folder spam).
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-teal-700 hover:underline dark:text-teal-400"
            >
              ← Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
              {pending ? "Mengirim…" : "Kirim tautan reset"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              ← Kembali ke halaman masuk
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
