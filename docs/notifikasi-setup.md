# Pengingat Email & WhatsApp — Panduan Setup

Mesin pengingat sudah tertanam di aplikasi. Anda tinggal menyetel **akun
layanan + Environment Variables**, lalu mendaftarkan **webhook Supabase** dan
**cron Vercel**. Bila variabel kosong, fitur mati diam-diam (app tetap normal).

## 1. Apa yang dikirim

| Pengingat | Penerima | Pemicu |
|---|---|---|
| Entri/karya menunggu verifikasi | DPJP | Real-time (residen mengajukan) |
| Entri diverifikasi / diminta revisi | Residen | Real-time (DPJP mengubah status) |
| Ringkasan residen berisiko terlambat | KPS | Mingguan (Senin) |
| Capaian kurang & masa didik menipis | Residen | Mingguan (Senin) |

Dua yang real-time lewat **webhook** (tabel `notifications`); dua yang mingguan
lewat **cron** (`/api/notify/cron`).

## 2. Buat akun layanan

- **Email — Resend** (resend.com): buat API key. Untuk pengiriman ke alamat
  bebas, **verifikasi domain** Anda di Resend lalu pakai `noreply@domain` pada
  `RESEND_FROM`. (Tanpa verifikasi domain, Resend hanya mengizinkan kirim ke
  email Anda sendiri — cukup untuk uji.)
- **WhatsApp — Fonnte** (fonnte.com): daftarkan perangkat (scan QR dengan nomor
  WA pengirim), salin **token**. (Gateway tidak resmi — risiko nomor diblokir;
  untuk skala besar pertimbangkan WhatsApp Cloud API resmi.)

## 3. Environment Variables (Vercel → Settings → Environment Variables)

```
NEXT_PUBLIC_SITE_URL = https://logbook-obgyn-usu.vercel.app
RESEND_API_KEY       = re_xxx
RESEND_FROM          = Logbook PPDS USU <noreply@domain-anda.com>
FONNTE_TOKEN         = xxxxxxxx
NOTIFY_WEBHOOK_SECRET= (acak, mis. hasil `openssl rand -hex 24`)
CRON_SECRET          = (acak, berbeda dari atas)
```

Set untuk environment **Production** (dan Preview bila perlu), lalu **redeploy**.

## 4. Webhook Supabase (pengingat real-time)

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

- **Name**: `notify-dispatch`
- **Table**: `notifications` · **Events**: ✅ Insert
- **Type**: HTTP Request · **Method**: `POST`
- **URL**: `https://logbook-obgyn-usu.vercel.app/api/notify/dispatch`
- **HTTP Headers**: tambah `x-notify-secret` = nilai `NOTIFY_WEBHOOK_SECRET`

Simpan. Mulai sekarang setiap notifikasi in-app otomatis diteruskan ke
email + WhatsApp penerimanya.

## 5. Cron Vercel (digest mingguan)

`vercel.json` sudah berisi jadwal harian `0 0 * * *` (07:00 WIB). Endpoint hanya
beraksi **hari Senin** (sisanya dilewati). Vercel otomatis mengirim
`Authorization: Bearer <CRON_SECRET>` bila `CRON_SECRET` diset — tidak perlu
konfigurasi tambahan. Pastikan cron aktif di Vercel → Settings → Cron Jobs.

## 6. Uji cepat

- **Real-time**: minta satu residen mengajukan entri → DPJP-nya harus menerima
  email/WA. Atau cek log fungsi `/api/notify/dispatch` di Vercel.
- **Digest**: panggil manual (paksa, abaikan hari):
  `https://<domain>/api/notify/cron?secret=<CRON_SECRET>&force=1`
  Respons JSON menyebut jumlah pesan terkirim.

## Catatan
- Penerima tanpa email/nomor WA otomatis dilewati untuk kanal tsb.
- Nomor WA dinormalkan ke format `62…` (mis. `08123` → `628123`).
- Untuk mematikan sementara satu kanal: kosongkan kuncinya (mis. hapus
  `FONNTE_TOKEN` → hanya email yang terkirim).
