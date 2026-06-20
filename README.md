# Logbook Interaktif — PPDS Subspesialis Onkologi Ginekologi

Aplikasi web untuk mencatat aktivitas pendidikan subspesialis onkologi ginekologi
dan **memantau pencapaian kompetensi secara otomatis** terhadap Standar Kompetensi
Kepkonsil HK.01.02/KKI/1318/2026.

## Tumpukan teknologi
- **Next.js 15** (App Router) + TypeScript
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- **Tailwind CSS v4**

## Fitur (scaffold saat ini)
- Login (Supabase Auth) + middleware sesi.
- Dashboard sadar-peran: residen melihat progress sendiri; supervisor/KPS melihat daftar residen.
- Input entri logbook (prosedur / penatalaksanaan / kasus) dengan alur *draft → ajukan*.
- Antrean verifikasi supervisor (verifikasi / minta revisi / tolak).
- **Auto-agregasi**: progress dihitung real-time dari entri terverifikasi (lihat `docs/aggregation-rules.md`).

## Struktur
```
data/                 Data kompetensi (sumber kebenaran, JSON)
supabase/migrations/  Skema database (9 migrasi)
supabase/seed.sql     Data referensi (di-generate dari data/*.json)
scripts/              generate-seed.mjs
src/                  Aplikasi Next.js
docs/                 database-schema.md, aggregation-rules.md
```

## Setup lokal
1. **Buat proyek Supabase** lalu jalankan migrasi & seed:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # jalankan migrasi
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
   (atau jalankan isi `supabase/migrations/*.sql` + `seed.sql` via SQL editor)
2. **Konfigurasi env**:
   ```bash
   cp .env.example .env.local   # isi URL & anon key dari Supabase
   ```
3. **Jalankan**:
   ```bash
   npm install
   npm run dev
   ```

## Regenerasi data referensi
Setelah mengubah `data/*.json` atau `data/aggregation-rules.json`:
```bash
npm run seed:gen     # menulis ulang supabase/seed.sql (idempoten)
```

## Catatan
- Angka target tertentu **wajib diverifikasi** ke PDF asli (lihat `data/README.md`).
- Data pasien dicatat **tersamar/anonim** (kode internal, tanpa identitas langsung).
