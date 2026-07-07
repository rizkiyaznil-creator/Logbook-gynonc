// Adapter kanal pengiriman pesan keluar (email + WhatsApp).
// Provider-agnostik & tahan-gagal: bila kunci API belum diset, fungsi
// "skip" diam-diam (aplikasi tetap jalan tanpa konfigurasi).
//
// Email   : Resend  (RESEND_API_KEY, RESEND_FROM)
// WhatsApp: Fonnte   (FONNTE_TOKEN)  — gateway lokal populer; mudah diganti.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/** Normalisasi nomor Indonesia → format 62xxxxxxxxxx untuk gateway WA. */
export function normalizeWa(phone: string | null | undefined): string | null {
  let d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("620")) d = "62" + d.slice(3);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 10 && d.startsWith("62") ? d : null;
}

/** Kirim email via Resend. */
export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  html: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { ok: false, skipped: true };
  if (!to) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Kirim pesan WhatsApp via Fonnte. */
export async function sendWhatsApp(
  toRaw: string | null | undefined,
  message: string,
): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, skipped: true };
  const target = normalizeWa(toRaw);
  if (!target) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({ target, message }),
    });
    if (!res.ok) return { ok: false, error: `fonnte ${res.status}` };
    const j = (await res.json().catch(() => null)) as { status?: boolean; reason?: string } | null;
    if (j && j.status === false) return { ok: false, error: j.reason || "fonnte gagal" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Template email ringkas berkop platform. */
export function emailHtml(title: string, body: string | null, url: string): string {
  return `<!doctype html><html lang="id"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <tr><td style="background:#0f766e;padding:16px 24px;color:#fff;font-weight:bold;font-size:15px">Logbook PPDS USU</td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a">${escapeHtml(title)}</h1>
      ${body ? `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.5">${escapeHtml(body)}</p>` : ""}
      <a href="${url}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Buka aplikasi</a>
    </td></tr>
    <tr><td style="padding:12px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">Pesan otomatis — mohon tidak membalas email ini.</td></tr>
  </table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export type Recipient = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** Kirim satu pesan ke seorang penerima lewat email + WhatsApp sekaligus. */
export async function notifyRecipient(
  to: Recipient,
  msg: { title: string; body?: string | null; link?: string | null },
): Promise<{ email: SendResult; whatsapp: SendResult }> {
  const url = msg.link ? `${SITE}${msg.link}` : SITE || "";
  const waText =
    `*${msg.title}*` +
    (msg.body ? `\n${msg.body}` : "") +
    (url ? `\n\n${url}` : "");
  const [email, whatsapp] = await Promise.all([
    sendEmail(to.email, msg.title, emailHtml(msg.title, msg.body ?? null, url)),
    sendWhatsApp(to.phone, waText),
  ]);
  return { email, whatsapp };
}
