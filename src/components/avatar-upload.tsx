"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";

const MAX_DIM = 256;

/** Kompres + resize gambar di browser menjadi JPEG persegi ~256px. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = MAX_DIM;
  canvas.height = MAX_DIM;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))),
      "image/jpeg",
      0.85,
    ),
  );
}

export function AvatarUpload({
  userId,
  name,
  initialUrl,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("File harus berupa gambar.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Ukuran gambar maksimal 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const blob = await compress(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Nilai ikut tersimpan saat tombol Simpan Profil ditekan */}
      <input type="hidden" name="avatar_url" value={url ?? ""} />
      <Avatar name={name} src={url} size={72} />
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {busy ? "Mengunggah…" : url ? "Ganti foto" : "Unggah foto"}
          </button>
          {url && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setUrl(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Format gambar (JPG, PNG, WebP), maks 8 MB — otomatis dikecilkan.
          Opsional.
        </p>
        {err && <p className="text-xs text-rose-600">{err}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
