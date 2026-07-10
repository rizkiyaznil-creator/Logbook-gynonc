// Penerima Supabase Database Webhook untuk tabel `notifications` (INSERT).
//
// CATATAN: Pengiriman email & WhatsApp REAL-TIME kini DINONAKTIFKAN.
//   - Email pengingat verifikasi ke DPJP → lewat DIGEST MINGGUAN
//     (/api/notify/cron, Senin pagi) agar tidak membanjiri kotak masuk.
//   - WhatsApp → dimatikan.
//   - Notifikasi in-app (lonceng) tetap dibuat oleh trigger DB, tidak terkait
//     endpoint ini.
//
// Endpoint dipertahankan sebagai no-op agar webhook Supabase yang mungkin masih
// terdaftar tetap menerima 200 (tidak error). Anda boleh menghapus webhook itu
// dari Supabase Dashboard bila mau.
//
// Keamanan: header `x-notify-secret` harus cocok dengan NOTIFY_WEBHOOK_SECRET.
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Perbandingan rahasia tahan-waktu (timing-safe) agar tak bocor lewat timing. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!secret || !secretMatches(req.headers.get("x-notify-secret"), secret))
    return new Response("unauthorized", { status: 401 });

  return Response.json({
    ok: true,
    skipped: "email/WA real-time nonaktif — DPJP memakai digest mingguan",
  });
}
