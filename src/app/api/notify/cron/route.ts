// Pengingat MINGGUAN antrean verifikasi untuk DPJP.
// Setiap Senin pagi (Vercel Cron: Senin 00:00 UTC = 07:00 WIB), setiap DPJP
// (supervisor/Ketua Prodi/SPS) yang punya entri dan/atau karya menunggu
// verifikasi menerima SATU email ringkasan (bukan satu email per item).
//
// Keamanan: Vercel Cron mengirim header `Authorization: Bearer <CRON_SECRET>`.
// Untuk uji manual: `/api/notify/cron?secret=<CRON_SECRET>&force=1` (force
// melewati pembatas hari Senin).
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailDigestHtml } from "@/lib/notify/channels";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    url.searchParams.get("secret") ||
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

type EntryRow = {
  supervisor_id: string | null;
  residents: { profiles: { full_name: string } | null } | null;
  procedures: { nama: string } | null;
  clinical_competencies: { komponen: string } | null;
};
type WorkRow = {
  pembimbing_id: string | null;
  judul: string;
  profiles: { full_name: string } | null;
};

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  // Guard defensif: hanya berjalan hari Senin (WIB = UTC+7), kecuali force.
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  if (wib.getUTCDay() !== 1 && !force)
    return Response.json({ ok: true, skipped: "hanya berjalan hari Senin" });

  const admin = createAdminClient();
  const [{ data: eData }, { data: wData }] = await Promise.all([
    admin
      .from("log_entries")
      .select(
        "supervisor_id, residents(profiles(full_name)), procedures(nama), clinical_competencies(komponen)",
      )
      .eq("status", "diajukan"),
    admin
      .from("academic_works")
      .select(
        "pembimbing_id, judul, profiles!academic_works_resident_id_fkey(full_name)",
      )
      .eq("status", "diajukan"),
  ]);

  // Kelompokkan item menunggu per DPJP.
  const byDpjp = new Map<string, { entri: string[]; karya: string[] }>();
  const bucket = (id: string) => {
    let g = byDpjp.get(id);
    if (!g) {
      g = { entri: [], karya: [] };
      byDpjp.set(id, g);
    }
    return g;
  };
  for (const e of (eData ?? []) as unknown as EntryRow[]) {
    if (!e.supervisor_id) continue;
    const nama = e.residents?.profiles?.full_name ?? "Residen";
    const komp =
      e.procedures?.nama ?? e.clinical_competencies?.komponen ?? "Kasus klinis";
    bucket(e.supervisor_id).entri.push(`${nama} — ${komp}`);
  }
  for (const w of (wData ?? []) as unknown as WorkRow[]) {
    if (!w.pembimbing_id) continue;
    const nama = w.profiles?.full_name ?? "Residen";
    bucket(w.pembimbing_id).karya.push(`${nama} — ${w.judul}`);
  }

  if (byDpjp.size === 0)
    return Response.json({ ok: true, email_terkirim: 0, note: "tidak ada antrian" });

  const ids = [...byDpjp.keys()];
  const { data: profs } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  const profMap = new Map(
    ((profs ?? []) as { id: string; full_name: string; email: string | null }[]).map(
      (p) => [p.id, p],
    ),
  );

  let sent = 0;
  const results: {
    dpjp: string;
    total: number;
    ok: boolean;
    skipped?: boolean;
    error?: string;
  }[] = [];
  for (const [id, g] of byDpjp) {
    const p = profMap.get(id);
    const total = g.entri.length + g.karya.length;
    if (!p?.email) {
      results.push({ dpjp: p?.full_name ?? id, total, ok: false, skipped: true });
      continue;
    }
    const r = await sendEmail(
      p.email,
      `${total} item menunggu verifikasi Anda`,
      emailDigestHtml(p.full_name, g.entri, g.karya),
    );
    if (r.ok) sent++;
    results.push({
      dpjp: p.full_name,
      total,
      ok: r.ok,
      skipped: r.skipped,
      error: r.error,
    });
  }

  return Response.json({
    ok: true,
    dpjp_dengan_antrian: byDpjp.size,
    email_terkirim: sent,
    results,
  });
}
