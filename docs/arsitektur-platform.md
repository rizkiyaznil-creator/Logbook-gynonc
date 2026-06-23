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
- **Fase 1 — Fondasi multi-tenant:** ✅ **SELESAI** (migrasi
  `0023_platform_multitenant.sql`).
  1. Buat `programs`; isi 1 baris **Onkologi Ginekologi** (program #1).
  2. Tambah `profiles.program_id` + `program_id` ke semua tabel terkait;
     **backfill** seluruh data lama ke program #1.
  3. Tulis ulang RLS (KPS dipersempit ke programnya, helper baru, super-admin).
  4. Buat views agregasi **program-aware**.
  - *Tanpa perubahan tampilan bagi user lama.*

  **Detail implementasi Fase 1:**
  - Tabel `programs (id, kode, nama, config jsonb, aktif)` + RLS (baca: semua
    login; tulis: super-admin). Tenant pertama `onkogin` dengan config FIGO.
  - `program_id` ditambahkan ke kurikulum (`procedures`,
    `clinical_competencies`, `clinical_competency_subtargets`, `diseases`,
    `knowledge_items`) **NOT NULL**, dan transaksional (`residents`,
    `log_entries`, `academic_works`, `entry_templates`, `assessments` NOT NULL;
    `audit_log`, `notifications`, `profiles` nullable).
  - Unik kurikulum `kode`/`no` diubah dari **global → per-program**
    (`unique(program_id, kode)`), agar program lain boleh memakai kode sama.
  - Helper: `current_program()`, `is_super_admin()`, `is_kps_of(p_program)`,
    `program_of(user)`.
  - `program_id` data transaksional **diturunkan dari residen** lewat trigger
    `set_program_from_resident` (BEFORE INSERT) — bukan dari akun pengisi
    (penting untuk assessment yang diisi penguji). RLS INSERT residen memakai
    `with check (program_id = current_program())`.
  - `handle_new_user` mengisi home program (default `onkogin` bila metadata
    kosong). Trigger audit/notifikasi mengisi `program_id`.
  - Views `v_procedure_progress`, `v_clinical_progress`, `v_knowledge_progress`,
    `v_disease_coverage`, `v_subtarget_progress`, `v_resident_summary` kini
    **join `program_id`** (residen dihitung hanya terhadap kurikulum programnya).
  - **Uji isolasi & program-aware view: LULUS** (residen/KPS program A tidak
    melihat data program B; DPJP lintas-program lewat `supervisor_id`;
    super-admin lihat semua; insert program_id salah ditolak RLS).
- **Fase 2 — Config & branding dinamis + verifikasi gabungan berlabel.**
  ✅ **SELESAI.**
  - `src/lib/program.ts`: helper konteks program — `getProgram`,
    `getProgramsByIds`, `withDefaults`, `accentHex`, `PLATFORM_NAME`.
  - **Branding kontekstual di header** (`layout.tsx` + `topbar.tsx`):
    residen/KPS melihat **nama + warna aksen program** rumahnya;
    DPJP/penguji/admin (lintas program) memakai nama platform netral
    "Logbook PPDS USU".
  - **Form entri** (`entry-form.tsx`): label tabel ("Tabel 24/18"), tampil/
    sembunyi **FIGO**, dan **opsi stadium** (dropdown) mengikuti
    `programs.config` program residen (mode entri baru = program residen;
    mode sunting = program entri).
  - **Progress residen** (`resident-progress.tsx`): judul tabel kompetensi
    memakai label tabel dari config program residen.
  - **Verifikasi gabungan berlabel** (`verifikasi/page.tsx`): tiap entri &
    karya ilmiah diberi **badge nama program** (warna aksen program), dan
    baris **FIGO hanya tampil bila program entri mengaktifkannya** — header
    tetap netral USU.
  - **PWA/manifest = level platform** ("Logbook PPDS USU"); branding pra-login
    & pop-up pasang aplikasi dinetralkan ke platform.
  - *Catatan:* pewarnaan aksen menyeluruh (utility Tailwind) tidak di-refactor
    total; aksen program disurfacing lewat indikator merek & badge program.
- **Fase 3 — Seed 3 program baru** (butuh konten kurikulum dari pemilik).
  ✅ **SELESAI.** Tiga program resmi (Kepkonsil 2026) di-seed dari data:
  - **`obgin`** — Dokter Spesialis Obstetri & Ginekologi (73 penyakit,
    9 penatalaksanaan, 53 prosedur).
  - **`fer`** — Subspesialis Fertilitas & Endokrinologi Reproduksi
    (28 penyakit, 8 penatalaksanaan, 27 prosedur).
  - **`fetomaternal`** — Subspesialis Kedokteran Fetomaternal
    (48 penyakit, 9 penatalaksanaan, 21 prosedur).

  **Struktur & keputusan:**
  - Data kurikulum pindah ke `data/programs/<kode>/` (tiap program = satu
    folder berisi `program.json` + diseases/clinical-management/procedures/
    knowledge). `scripts/generate-seed.mjs` mengiterasi semua program →
    `supabase/seed.sql` (program insert + kurikulum, idempoten).
  - Butir pengetahuan prosedur **auto-generate 1:1** dari daftar prosedur
    (kode `K`+kode), konsisten dengan onkogin.
  - Prosedur program baru: `target_min` = "Minimal N kasus / Volume minimal";
    `peran_dihitung = '{}'` (hitung semua peran — banyak prosedur non-bedah).
  - Penatalaksanaan FER & Fetomaternal memakai ambang **kualitas** (mis.
    "Kelengkapan data ≥75%"), bukan jumlah kasus → `target_min = 1`
    (checklist kualitatif). Penatalaksanaan Sp.OG memakai hitungan kasus asli.
  - Config per program: `obgin` aksen biru, `fer` ungu, `fetomaternal` rose;
    `figo_enabled=false` (hanya onkogin true); label tabel sesuai dokumen.
  - **Catatan validitas:** angka ambang & kode ICD hasil ekstraksi PDF —
    sumber resmi meminta verifikasi manual sebelum dipakai untuk keputusan.
  - **Uji LULUS:** migrasi + seed 4 program bersih; isolasi multi-tenant
    LULUS (tiap KPS/residen hanya lihat programnya; DPJP lintas-program;
    view program-aware menghitung total kurikulum program masing-masing).
- **Fase 4 — Laporan lintas-program untuk super-admin.** ✅ **SELESAI.**
  - View rollup tingkat-program `v_program_overview` (migrasi `0024`): per
    program → jumlah residen, ukuran kurikulum, capaian agregat per domain,
    dan beban entri (total/menunggu/terverifikasi). `security_invoker` →
    super-admin lihat semua program; KPS hanya angka programnya (program lain
    ter-nol-kan otomatis lewat RLS, tanpa kebijakan tambahan).
  - Halaman `/laporan` (**khusus role `admin`**): ringkasan platform +
    tabel per program (indikator warna aksen, bar capaian agregat) + ekspor
    CSV. KPS tetap memakai `/rekap` (per program).
  - **Uji LULUS:** rollup 4 program benar; isolasi RLS LULUS (KPS obgin
    hanya lihat residen/entri obgin, program lain nol); build hijau.
- **Fase 5 — UI Manajemen Kurikulum** (onboarding mandiri prodi → pemilik
  berubah dari operator menjadi penyedia platform). ✅ **SELESAI.**
  - **Tanpa migrasi** — RLS Fase 1 sudah mengizinkan tulis kurikulum
    (super-admin / KPS programnya) & tulis `programs` (super-admin). Fase 5
    murni UI + server actions (RLS = pertahanan berlapis di balik guard peran).
  - **Onboarding program** (`/kurikulum`, super-admin): buat program baru,
    edit nama/aktif, dan **editor config** (aksen, label tabel, FIGO on/off,
    opsi stadium). KPS diarahkan langsung ke kurikulum programnya.
  - **CRUD prosedur & penatalaksanaan** (`/kurikulum/[id]`): tabel + tambah/
    edit/hapus. Akses: super-admin (semua program) atau KPS programnya.
    Menyimpan/menghapus prosedur **otomatis menyelaraskan butir pengetahuan
    prosedur 1:1** (kode `K`+kode). Item yang sudah dirujuk entri logbook
    tidak dapat dihapus (dijaga FK, pesan ramah).
  - **Cakupan (keputusan pemilik):** penyakit & pengetahuan penatalaksanaan
    tetap dikelola lewat `data/programs` + seed; prosedur & penatalaksanaan
    (entitas yang dihitung kompetensi) dikelola lewat UI.
  - **Uji LULUS:** KPS hanya bisa tulis kurikulum programnya (tulis program
    lain & buat `programs` ditolak RLS); super-admin buat program & tulis
    semua; sinkron pengetahuan 1:1 idempoten; hapus terhalang FK bila dirujuk
    entri. Build hijau.

- **Fase 6 — KPS lintas-beberapa-prodi.** ✅ **SELESAI.** (migrasi `0025`)
  - **Konteks:** 1 KPS subspesialis membawahi 3 prodi (Fetomaternal, FER,
    Onkogin); prodi Spesialis Obgin punya KPS sendiri. Model lama (1 KPS = 1
    prodi via `profiles.program_id`) tidak cukup.
  - **Skema:** tabel relasi **`kps_programs(kps_id, program_id)`** (banyak-ke-
    banyak). `profiles.program_id` tetap dipakai sebagai **prodi utama** KPS
    (branding/turunan). Backfill: KPS lama → 1 baris = `program_id`-nya.
  - **RLS:** `is_kps_of(p_program)` ditulis ulang → cek keanggotaan di
    `kps_programs` (bukan satu kolom). Semua policy yang sudah memakai
    `is_kps_of(program_id)` otomatis mendukung multi-prodi. Policy baca
    kurikulum ditambah `or is_kps_of(program_id)` agar KPS lihat semua prodinya.
  - **UI:** Manajemen User — buat KPS dengan **centang beberapa prodi**;
    super-admin punya panel **"Prodi yang Dikelola KPS"** untuk mengubah
    penugasan KPS yang sudah ada. `/kurikulum` untuk KPS >1 prodi menampilkan
    **daftar prodinya**. Branding: KPS >1 prodi → nama platform netral.
  - **Uji isolasi wajib:** KPS subspesialis melihat rekap/verifikasi/audit/
    kurikulum ketiga prodinya, **tetapi TIDAK** data prodi obgin (dan
    sebaliknya). Build hijau.

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
