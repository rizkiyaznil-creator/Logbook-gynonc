"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "./actions";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800">
        <div className="flex flex-col items-center text-center">
          <BrandLogo
            src="/usu-logo.png"
            alt="Logo Universitas Sumatera Utara"
            className="h-16 w-16 object-contain"
            fallback={
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-base font-bold text-white shadow-sm">
                USU
              </span>
            }
          />
          <div className="mt-3 text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100">
            Universitas Sumatera Utara
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Fakultas Kedokteran
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Prodi Subspesialis Obstetri &amp; Ginekologi
          </div>
          <BrandLogo
            src="/usu-excellence.png"
            alt="The Era of Ultimate Excellence"
            className="mt-3 h-5 object-contain"
          />
        </div>

        <div className="my-5 border-t border-slate-200 dark:border-slate-800" />

        <h1 className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
          Logbook Onkologi Ginekologi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          PPDS Subspesialis — masuk untuk melanjutkan.
        </p>

        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Kata sandi
            </label>
            <div className="relative mt-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400"
                aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
              >
                {showPassword ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Memproses…" : "Masuk"}
          </button>

          <Link
            href="/auth/lupa-sandi"
            className="block text-center text-sm text-slate-500 hover:text-teal-700 hover:underline dark:text-slate-400 dark:hover:text-teal-400"
          >
            Lupa kata sandi?
          </Link>
        </form>
      </div>
    </main>
  );
}
