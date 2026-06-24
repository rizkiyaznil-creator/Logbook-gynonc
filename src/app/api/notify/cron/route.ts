// Cron pengingat berkala (dipanggil Vercel Cron, harian; aksi mingguan).
//   - KPS: ringkasan residen yang berisiko terlambat (lintas prodinya).
//   - Residen: capaian masih kurang sementara masa didik menipis.
//
// Keamanan: header `Authorization: Bearer <CRON_SECRET>` atau `?secret=`.
// Gate: hanya berjalan hari Senin (UTC) kecuali `?force=1`.
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRecipient, type Recipient } from "@/lib/notify/channels";
import { withDefaults } from "@/lib/program";
import type { ProgramConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const sec = process.env.CRON_SECRET;
  if (!sec) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === sec) return true;
  return req.headers.get("authorization") === `Bearer ${sec}`;
}

function monthsElapsed(start: string | null): number | null {
  if (!start) return null;
  const ms = Date.now() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type Sum = {
  resident_id: string;
  prosedur_tercapai: number; prosedur_total: number;
  penatalaksanaan_tercapai: number; penatalaksanaan_total: number;
  pengetahuan_lulus: number; pengetahuan_total: number;
  penyakit_tercakup: number; penyakit_total: number;
};

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  if (new Date().getUTCDay() !== 1 && !force)
    return Response.json({ ok: true, skipped: "hanya berjalan Senin" });

  const admin = createAdminClient();
  const [resR, sumR, progR, kpsR] = await Promise.all([
    admin
      .from("residents")
      .select("id, program_id, tanggal_mulai, profiles(full_name, email, no_telp)"),
    admin.from("v_resident_summary").select("*"),
    admin.from("programs").select("id, nama, config"),
    admin.from("kps_programs").select("program_id, kps_id"),
  ]);

  const sumMap = new Map<string, Sum>();
  for (const s of (sumR.data ?? []) as Sum[]) sumMap.set(s.resident_id, s);

  const prog = new Map<string, { nama: string; durasi: number }>();
  for (const p of (progR.data ?? []) as { id: string; nama: string; config: ProgramConfig | null }[])
    prog.set(p.id, { nama: p.nama, durasi: withDefaults(p.config).durasi_bulan });

  type Res = {
    id: string;
    program_id: string | null;
    tanggal_mulai: string | null;
    profiles: { full_name: string; email: string | null; no_telp: string | null } | { full_name: string; email: string | null; no_telp: string | null }[] | null;
  };

  // Hitung status tiap residen.
  const evald = ((resR.data ?? []) as Res[]).map((r) => {
    const s = sumMap.get(r.id);
    const done = s
      ? s.prosedur_tercapai + s.penatalaksanaan_tercapai + s.pengetahuan_lulus + s.penyakit_tercakup
      : 0;
    const total = s
      ? s.prosedur_total + s.penatalaksanaan_total + s.pengetahuan_total + s.penyakit_total
      : 0;
    const remaining = Math.max(0, total - done);
    const me = monthsElapsed(r.tanggal_mulai);
    const durasi = (r.program_id && prog.get(r.program_id)?.durasi) || 24;
    const pace = me ? done / me : 0;
    // Berisiko: ada sisa, dan (belum ada progres) atau proyeksi melewati durasi.
    let lagging = false;
    if (me && remaining > 0) {
      if (pace <= 0) lagging = true;
      else if (me + Math.ceil(remaining / pace) > durasi) lagging = true;
    }
    const nearEnd = !!me && remaining > 0 && me >= durasi * 0.75;
    const p = one(r.profiles);
    return {
      id: r.id,
      program_id: r.program_id,
      name: p?.full_name ?? "Residen",
      contact: { name: p?.full_name, email: p?.email, phone: p?.no_telp } as Recipient,
      remaining,
      me,
      durasi,
      lagging,
      nearEnd,
    };
  });

  const sent: { kind: string; to: string }[] = [];

  // --- 1) Digest KPS: residen berisiko terlambat, lintas prodi KPS ---
  const kpsPrograms = new Map<string, string[]>(); // kps_id -> [program_id]
  for (const k of (kpsR.data ?? []) as { program_id: string; kps_id: string }[])
    kpsPrograms.set(k.kps_id, [...(kpsPrograms.get(k.kps_id) ?? []), k.program_id]);

  const kpsIds = Array.from(kpsPrograms.keys());
  const kpsProf = new Map<string, Recipient>();
  if (kpsIds.length) {
    const { data: kp } = await admin
      .from("profiles")
      .select("id, full_name, email, no_telp")
      .in("id", kpsIds);
    for (const k of (kp ?? []) as { id: string; full_name: string; email: string | null; no_telp: string | null }[])
      kpsProf.set(k.id, { name: k.full_name, email: k.email, phone: k.no_telp });
  }

  for (const [kpsId, programIds] of kpsPrograms) {
    const lag = evald.filter(
      (e) => e.lagging && e.program_id && programIds.includes(e.program_id),
    );
    if (lag.length === 0) continue;
    const lines = lag
      .slice(0, 20)
      .map((e) => `• ${e.name} (${(e.program_id && prog.get(e.program_id)?.nama) || "—"}): ${e.remaining} target belum tercapai`)
      .join("\n");
    const extra = lag.length > 20 ? `\n…dan ${lag.length - 20} lainnya.` : "";
    const to = kpsProf.get(kpsId);
    if (!to) continue;
    await notifyRecipient(to, {
      title: `${lag.length} residen berisiko terlambat`,
      body: `Ringkasan mingguan capaian:\n${lines}${extra}`,
      link: "/rekap",
    });
    sent.push({ kind: "kps_digest", to: kpsId });
  }

  // --- 2) Residen: capaian kurang & masa didik menipis ---
  for (const e of evald) {
    if (!e.nearEnd) continue;
    const sisaBulan = Math.max(0, e.durasi - (e.me ?? 0));
    await notifyRecipient(e.contact, {
      title: "Pengingat: capaian perlu dikejar",
      body: `Masa pendidikan Anda tersisa ±${sisaBulan} bulan, sementara masih ada ${e.remaining} target kompetensi yang belum tercapai. Mohon tingkatkan pencatatan & penyelesaian target.`,
      link: "/dashboard",
    });
    sent.push({ kind: "residen_target", to: e.id });
  }

  return Response.json({ ok: true, sent: sent.length, detail: sent });
}
