# Arsitektur Platform Multi-Program (Logbook PPDS USU)

> Dokumen acuan kerja untuk mengubah aplikasi **Logbook Onkologi Ginekologi**
> (single-program) menjadi **platform multi-program** satu codebase, di mana
> tiap program studi/subspesialis di USU memakai mesin yang sama dengan konten
> kurikulum berbeda. Tujuan: **maintenance & perbaikan cukup di satu tempat.**

Status: disepakati (blueprint). Implementasi dilakukan di branch khusus
`platform-multitenant`, bertahap per fase.

---

## 1. Prinsip inti — pisahkan 3 lapis

1. **Engine (sama untuk semua program)** — alur entri → ajukan → verifikasi DPJP
   → hitung capaian; peran; notifikasi; audit; template; karya ilmiah; rekap/PDF;
   PWA; pengaturan tampilan. **Ini yang dirawat sekali.**
2. **Kurikulum (data per program)** — prosedur, penatalaksanaan, spektrum
   penyakit, butir pengetahuan, target minimal. Murni data di DB (di-seed SQL).
3. **Konfigurasi program** — nama program, warna aksen, label tabel, toggle FIGO
   & opsi stadium. Disimpan per program (`programs.config`).

Menambah program = menambah **data + config**, bukan menambah kode.

---

## 2. Keputusan yang sudah dikunci

| Aspek | Keputusan |
|---|---|
| Tenancy | Multi-tenant, **1 codebase, 1 Supabase, 1 domain** |
| Institusi | **USU saja** (konstanta) — branding institusi tetap |
| Tenant model | **TANPA** join table keanggotaan; **TANPA** switcher |
| Home program | **`profiles.program_id`** (diisi untuk **residen & KPS**, kosong untuk DPJP/penguji/admin) |
| Program pada data | Setiap baris data membawa **`program_id`** (= program residen) |
| Konteks program | Diturunkan **dari data**, bukan pilihan global |
| Peran | **Global** (`profiles.role` tetap) |
| DPJP | **Lintas program otomatis** lewat `supervisor_id` (orangnya sedikit, tak difilter) |
| Penguji | Program-agnostic (lewat relasi penilaian) |
| KPS | Mengelola **tepat 1 program** (lingkup = `program_id`-nya) |
| Admin | **Super-admin platform** — semua program |
| Verifikasi DPJP | **Antrean gabungan berlabel program** |
| Pemilihan DPJP oleh residen | Dropdown = **semua DPJP USU** (pool shared, tanpa filter) |
| Shared se-USU | Akun orang (`profiles`), daftar rumah sakit |
| Per-program | Kurikulum + data transaksional |
| Kurikulum | **Di-seed via SQL** (UI manajemen kurikulum = fase lanjutan) |
| PWA/branding institusi | Level platform; nama+warna+label+FIGO per program (dari konteks data) |

---

## 3. Model data

### Tabel baru
- **`programs`**
  - `id` (uuid/serial), `kode` (text unik, mis. `onkogin`, `obgin`), `nama` (text)
  - `config jsonb` — mis.:
    ```jsonc
    {
      "accent": "teal",
      "label_tabel_prosedur": "Tabel 24",
      "label_tabel_penatalaksanaan": "Tabel 18",
      "figo_enabled": true,
      "staging_options": ["IA","IB","II","III","IV"]
    }
    ```

### Perubahan tabel ada
- **`profiles`** → tambah `program_id` (nullable, FK → programs). Home program
  untuk residen & KPS; null untuk DPJP/penguji/admin.

### Tambah `program_id`
- **Kurikulum:** `procedures`, `clinical_competencies`, `diseases`,
  `knowledge_items`, `targets` / sub-target.
- **Transaksional:** `log_entries`, `academic_works`, `entry_templates`,
  penilaian (assessment), `audit_log`, `notifications`, `residents`.

### Tetap shared (TANPA `program_id`)
- `profiles` (data orang), daftar rumah sakit (RS se-USU).

### Views agregasi — **wajib program-aware**
- `v_resident_summary`, `v_procedure_progress`, `v_clinical_progress`,
  `v_subtarget_progress`, dll. harus menghitung capaian residen terhadap
  **target kurikulum programnya sendiri** (join `program_id`). **Bagian paling
  teknis** dari migrasi.

---

## 4. Keamanan (RLS) — berbasis peran + program

Helper baru (security definer):
- `current_program()` → `profiles.program_id` milik `auth.uid()`.
- `is_super_admin()` → `role = 'admin'`.
- `is_kps_of(p_program)` → `role = 'kps' AND profiles.program_id = p_program`.

Pola kebijakan per tabel data (mis. `log_entries`):
- **SELECT:** `resident_id = auth.uid()` **OR** `supervisor_id = auth.uid()`
  **OR** `is_kps_of(program_id)` **OR** `is_super_admin()`.
- **Verifikasi (UPDATE supervisor):** `supervisor_id = auth.uid()`
  → **lintas program otomatis** (dasar antrean gabungan).
- **INSERT (residen):** `with check (resident_id = auth.uid() AND program_id =
  current_program())` → memastikan `program_id` benar dari konteks residen,
  **bukan** asal akun DPJP.
- **Kurikulum (procedures/diseases/…):** SELECT untuk anggota program terkait
  (`program_id = current_program()`) + super-admin; tulis hanya super-admin
  (seed) / KPS programnya (bila nanti ada UI).

Perubahan penting dari single-tenant:
- "Staf baca semua" untuk **KPS** dipersempit menjadi **program-nya saja**.
- DPJP tetap via `supervisor_id`. Admin tetap semua.

> **Uji isolasi wajib:** residen/KPS program A tidak boleh melihat apa pun dari
> program B. Ini titik kegagalan paling fatal di multi-tenant.

---

## 5. Cara tiap peran mengalami aplikasi

- **Residen:** seperti sekarang; semua konten (kompetensi, FIGO, label) mengikuti
  **config programnya**.
- **DPJP:** halaman Verifikasi = **antrean gabungan** semua entri yang ditujukan
  kepadanya, tiap item **berlabel nama program**; field/label saat verifikasi
  mengikuti **config program entri tsb** (mis. FIGO tampil hanya bila program itu
  mengaktifkan). Header netral USU.
- **Penguji:** menilai pengetahuan residen lintas program (via relasi penilaian).
- **KPS:** rekap/verifikasi/audit **hanya programnya**.
- **Admin (super-admin):** lihat & kelola semua program, buat program, kelola
  pengguna + set `program_id` mereka.

Tidak ada switcher: konteks program selalu diturunkan dari data/residen.

---

## 6. Branding & konfigurasi dinamis

- Institusi = **USU** (logo, footer) → konstan.
- Per program (dari `programs.config`): nama program, warna aksen, label
  "Tabel 18/24", `figo_enabled` + opsi stadium.
- Diterapkan berdasarkan **konteks**: halaman residen/form pakai config program
  residen; DPJP saat memverifikasi pakai config program entri; header lintas
  program (DPJP/admin) netral.
- **PWA/manifest = level platform** (satu domain, satu app terpasang, mis.
  "Logbook PPDS USU"); nama program tampil di dalam aplikasi.

---

## 7. Peta jalan (fase)

- **Fase 0 — Ops:** environment **staging** + disiplin **backup** sebelum tiap
  migrasi produksi. (Wajib untuk platform.)
- **Fase 1 — Fondasi multi-tenant:**
  1. Buat `programs`; isi 1 baris **Onkologi Ginekologi** (program #1).
  2. Tambah `profiles.program_id` + `program_id` ke semua tabel terkait;
     **backfill** seluruh data lama ke program #1.
  3. Tulis ulang RLS (KPS dipersempit ke programnya, helper baru, super-admin).
  4. Buat views agregasi **program-aware**.
  - *Tanpa perubahan tampilan bagi user lama.*
- **Fase 2 — Config & branding dinamis + verifikasi gabungan berlabel.**
- **Fase 3 — Seed 3 program baru** (butuh konten kurikulum dari pemilik).
- **Fase 4 — Laporan lintas-program untuk super-admin.**
- **(Nanti) Fase 5 — UI Manajemen Kurikulum** (onboarding mandiri prodi →
  pemilik berubah dari operator menjadi penyedia platform).

---

## 8. Risiko & mitigasi

- **Kebocoran antar-program (RLS):** uji khusus skenario A-tidak-melihat-B.
- **`program_id` salah saat insert:** wajib dari konteks residen (RLS `with
  check`), bukan akun DPJP.
- **Satu migrasi buruk kena semua tenant:** staging + backup mutlak; rilis
  bertahap.
- **Kuota Supabase/Vercel** tumbuh dengan jumlah program/user → pantau tier.
- **Kompleksitas skema** naik → setiap perubahan mempertimbangkan semua tenant.

---

## 9. Yang perlu disiapkan pemilik (untuk Fase 3)

Untuk **tiap** program baru, daftar resmi (standar Kolegium/prodi):
- Prosedur/tindakan + target minimal.
- Komponen penatalaksanaan + target minimal (+ sub-target dokumentasi bila ada).
- Spektrum penyakit.
- Butir pengetahuan (OSCE/MCQ).
- Skema stadium (bila relevan) & label tabel khas program.

---

## 10. Catatan transisi dari kondisi saat ini

- Aplikasi Onkologi-Ginekologi yang ada **menjadi tenant pertama** — bukan dibuang.
- Migrasi yang sudah berjalan: 0017–0022 (audit, template, notifikasi, karya
  ilmiah, publikasi/presentasi, pembimbing-2/penguji/co-author).
- Branch kerja platform: **`platform-multitenant`** (terpisah dari branch fitur
  saat ini).
- Mulai dari **Fase 1**; setiap fase build hijau + uji RLS sebelum lanjut.
