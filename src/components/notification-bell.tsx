"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icons } from "@/components/icons";

type Notif = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setList((data ?? []) as Notif[]);
    setUnread((data ?? []).filter((n: Notif) => !n.read_at).length);
    setLoading(false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function markAll() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    setUnread(0);
    setList((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? "x" })));
  }

  async function openItem(n: Notif) {
    if (!n.read_at) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifikasi"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Icons.bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Notifikasi
            </span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-teal-700 hover:underline dark:text-teal-400"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {loading && (
              <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Memuat…
              </p>
            )}
            {!loading && list.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Belum ada notifikasi.
              </p>
            )}
            {!loading &&
              list.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                    n.read_at ? "" : "bg-teal-50/40 dark:bg-teal-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    )}
                    <div className={n.read_at ? "pl-4" : ""}>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {n.body}
                        </div>
                      )}
                      <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(n.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
