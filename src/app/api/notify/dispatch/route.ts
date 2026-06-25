// Penerima Supabase Database Webhook: dipanggil tiap ada baris baru di
// `notifications` (INSERT). Meneruskan SEBAGIAN notifikasi in-app ke
// email + WhatsApp. Hanya pengingat ke verifikator yang diteruskan:
//   - DPJP      : entri menunggu verifikasi (type entri_baru)
//   - Pembimbing: karya menunggu verifikasi (type karya_baru)
// Notifikasi status ke residen (entri/karya diverifikasi/revisi/ditolak)
// TIDAK dikirim via email/WA — cukup tampil di lonceng in-app.
//
// Keamanan: header `x-notify-secret` harus cocok dengan NOTIFY_WEBHOOK_SECRET.
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRecipient } from "@/lib/notify/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotifRecord = {
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  type?: string;
};

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-notify-secret") !== secret)
    return new Response("unauthorized", { status: 401 });

  const payload = (await req.json().catch(() => null)) as
    | { record?: NotifRecord; type?: string }
    | NotifRecord
    | null;
  const rec = (payload && "record" in payload ? payload.record : payload) as
    | NotifRecord
    | undefined;
  if (!rec?.user_id || !rec.title)
    return Response.json({ ok: false, error: "payload tidak valid" }, { status: 400 });

  // Hanya pengingat "menunggu verifikasi" (type *_baru) yang diteruskan ke
  // email/WA. Notifikasi status ke residen cukup in-app → lewati.
  if (!rec.type || !rec.type.endsWith("_baru"))
    return Response.json({ ok: true, skipped: "in-app only" });

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("full_name, email, no_telp")
    .eq("id", rec.user_id)
    .maybeSingle();
  if (!prof) return Response.json({ ok: false, error: "penerima tidak ada" });

  const result = await notifyRecipient(
    { name: prof.full_name, email: prof.email, phone: prof.no_telp },
    { title: rec.title, body: rec.body, link: rec.link },
  );
  return Response.json({ ok: true, result });
}
