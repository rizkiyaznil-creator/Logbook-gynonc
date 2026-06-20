# Aturan Auto-Agregasi

> Sumber kebenaran: `data/aggregation-rules.json` → di-generate ke `supabase/seed.sql`.
> Status: **default kebijakan, boleh disesuaikan prodi.** Sudah diuji fungsional terhadap PostgreSQL.

## Prinsip

1. **Hindari penggandaan (double-counting).** Kompetensi kognitif (anamnesis, PF, work-up, interpretasi, diagnosis, rencana, prognosis, dokumentasi) **tidak** dikreditkan dari tiap langkah operasi. Jika dikreditkan dari setiap operasi, satu pasien yang dioperasi 3× akan keliru menambah 3× anamnesis.
2. **Hub manajemen.** Kredit kognitif berasal dari **PR-01 (Diagnosis & manajemen kanker ginekologi)** — satu kasus baru = satu siklus penatalaksanaan lengkap.
3. **Hanya entri `diverifikasi`** yang dihitung.
4. **Prosedur non-bedah** (manajemen/sistemik/paliatif/USG) dihitung tanpa syarat peran bedah.

## Peran yang dihitung (`procedures.peran_dihitung`)

| Kelompok | Nilai | Efek |
|---|---|---|
| Prosedur bedah (default) | `{operator_utama, ko_operator}` | hanya operator utama & ko-operator senior yang dihitung; *asisten* & *observer* tidak |
| Non-bedah: PR-01, PR-02, PR-53, PR-54, PR-55, PR-56, PR-57 | `{}` (kosong) | dihitung tanpa melihat peran bedah |

> **Keputusan yang bisa Anda ubah:** apakah *ko-operator* tetap dihitung penuh untuk prosedur terbesar (eksenterasi, LEER, histerektomi radikal)? Default saat ini: ya. Untuk membatasi ke operator utama saja, ubah `peran_dihitung` prosedur tsb. ke `{operator_utama}`.

## Pemetaan prosedur → penatalaksanaan (`procedure_clinical_map`)

| Prosedur | Menyumbang ke | Alasan |
|---|---|---|
| **PR-01** Manajemen kanker | PK-01, PK-02, PK-03, PK-04, PK-05, PK-06, PK-08, PK-09 | Siklus penatalaksanaan lengkap satu kasus baru |
| **PR-02** USG onkologi | PK-03, PK-04 | Penentuan & interpretasi penunjang |
| **PR-53** Terapi sistemik | PK-06, PK-07 | Perencanaan terapi + evaluasi respons/toksisitas |
| **PR-55** Koordinasi RT | PK-06, PK-07 | Perencanaan + evaluasi |
| **PR-56** Paliatif nyeri | PK-08 | Prognosis & rencana paliatif |
| **PR-57** Paliatif nutrisi | PK-08 | Prognosis & rencana paliatif |

*PK-07 (Evaluasi respons) sengaja TIDAK dipetakan dari PR-01* agar tidak otomatis penuh hanya dari pendaftaran kasus baru — diisi dari terapi sistemik/RT (PR-53/55) atau entri langsung.

## Contoh hasil (dari uji fungsional)

3× PR-01 + 2× PR-53 (semua diverifikasi) + 1 entri langsung PK-09 menghasilkan:

| Kompetensi | Hitungan | Rincian |
|---|---|---|
| PK-01 Anamnesis | 3 | 3 dari PR-01 |
| PK-06 Perencanaan terapi | **5** | 3 (PR-01) + 2 (PR-53) |
| PK-07 Evaluasi respons | 2 | 2 dari PR-53 |
| PK-09 Dokumentasi | **4** | 3 (PR-01) + 1 langsung |

## Cara mengubah aturan

1. Sunting `data/aggregation-rules.json`.
2. Jalankan `node scripts/generate-seed.mjs`.
3. Terapkan `supabase/seed.sql` (idempoten — aman dijalankan ulang).

## Catatan tahap berikut
- **Sub-target PK-09** (MDT ≥20, breaking bad news ≥10) belum punya penanda pada entri. Rencana: tambah kolom/tag pada `log_entries` agar sub-target terhitung otomatis.
