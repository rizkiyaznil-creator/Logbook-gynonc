# Pengingat Email — Panduan Setup

Notifikasi **in-app (lonceng)** selalu aktif (dibuat trigger DB, tanpa setup).
Untuk **email**, Anda tinggal menyetel akun Resend + Environment Variables, lalu
memastikan **Vercel Cron** aktif.

## 1. Apa yang dikirim

| Pengingat | Penerima | Cara |
|---|---|---|
| Entri & karya menunggu verifikasi | DPJP (supervisor/Ketua Prodi/SPS) | **1 email ringkasan mingguan**, Senin pagi (07:00 WIB). Hanya DPJP yang punya antrian yang dikirimi. |
| Keputusan verifikasi (diverifikasi / revisi / tolak) | Residen | **Lonceng in-app** saja (tanpa email) |

> **WhatsApp dinonaktifkan.** Email verifikasi ke DPJP **tidak lagi real-time**
> (agar tidak membanjiri kotak masuk) — diganti digest mingguan.

## 2. Akun email — Resend

Buat API key di **resend.com**. Untuk mengirim ke alamat bebas (mis.
`@usu.ac.id`), **verifikasi domain** Anda di Resend lalu pakai `noreply@domain`
pada `RESEND_FROM`. Tanpa verifikasi domain, Resend hanya mengizinkan kirim ke
email akun Resend Anda sendiri — cukup untuk uji, tetapi email ke DPJP lain tidak
akan sampai.

## 3. Environment Variables (Vercel → Settings → Environment Variables)

```
NEXT_PUBLIC_SITE_URL = https://logbook-obgyn-usu.vercel.app
RESEND_API_KEY       = re_xxx
RESEND_FROM          = Logbook PPDS USU <noreply@domain-anda.com>
CRON_SECRET          = (acak, mis. hasil `openssl rand -hex 24`)
```

Set untuk environment **Production**, lalu **redeploy**. (Bila email kosong/tak
diset, fitur mati diam-diam — aplikasi tetap normal.)

## 4. Vercel Cron (digest mingguan)

`vercel.json` sudah berisi jadwal `0 0 * * 1` — **Senin 00:00 UTC = 07:00 WIB**.
Endpoint `/api/notify/cron` juga menjaga agar hanya berjalan hari Senin. Vercel
otomatis mengirim `Authorization: Bearer <CRON_SECRET>` bila `CRON_SECRET`
diset. Pastikan cron aktif di **Vercel → Settings → Cron Jobs** (deploy ulang
setelah `vercel.json` ada).

## 5. Uji cepat

Panggil manual (paksa, abaikan pembatas hari Senin):

```
https://<domain>/api/notify/cron?secret=<CRON_SECRET>&force=1
```

Respons JSON menyebut `dpjp_dengan_antrian` dan `email_terkirim`. Bila
`email_terkirim` = 0 padahal ada antrian, cek `results` — biasanya `skipped`
(Resend belum diset) atau DPJP tak punya email.

## 6. Webhook Supabase — sudah tidak diperlukan

Endpoint real-time lama `/api/notify/dispatch` kini **no-op** (email/WA
dinonaktifkan). Bila Anda sebelumnya mendaftarkan webhook Supabase ke endpoint
itu, **boleh dihapus** (Supabase Dashboard → Database → Webhooks). Membiarkannya
tidak berbahaya — hanya mengembalikan 200 tanpa mengirim apa pun.

## Catatan
- DPJP tanpa alamat email otomatis dilewati.
- Ingin mengubah hari/jam? Ubah cron di `vercel.json` (format UTC) dan guard hari
  di `src/app/api/notify/cron/route.ts`.
