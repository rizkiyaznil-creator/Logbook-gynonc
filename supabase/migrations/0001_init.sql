-- =====================================================================
-- 0001_init.sql — Ekstensi, tipe enum, dan fungsi bantu
-- Logbook Interaktif PPDS Subspesialis Onkologi Ginekologi
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- email case-insensitive

-- --- Peran pengguna -------------------------------------------------
create type user_role as enum (
  'residen',      -- PPDS subspesialis (peserta didik)
  'supervisor',   -- Konsulen / DPJP pembimbing & verifikator
  'kps',          -- Ketua Program Studi / admin prodi
  'penguji',      -- Penguji OSCE / MCQ
  'admin'         -- Administrator sistem
);

-- --- Jenis entri logbook --------------------------------------------
create type entry_type as enum (
  'prosedur',            -- tindakan/operasi (Tabel 24)
  'penatalaksanaan',     -- aktivitas penatalaksanaan klinis (Tabel 18)
  'kasus'                -- pencatatan kasus/encounter (cakupan penyakit Tabel 10)
);

-- --- Peran residen pada tindakan ------------------------------------
create type surgical_role as enum (
  'operator_utama',
  'ko_operator',         -- ko-operator senior
  'asisten',
  'observer'
);

-- --- Status alur verifikasi -----------------------------------------
create type entry_status as enum (
  'draft',               -- belum diajukan
  'diajukan',            -- menunggu verifikasi supervisor
  'diverifikasi',        -- disetujui, dihitung ke progress
  'revisi',              -- dikembalikan untuk perbaikan
  'ditolak'
);

-- --- Tingkat supervisi / kemandirian (EPA-style) --------------------
-- Opsional, untuk menilai kemandirian selain jumlah kasus.
create type supervision_level as enum (
  'observasi',           -- hanya mengamati
  'dibantu_penuh',       -- dikerjakan dengan bimbingan langsung
  'dibantu_sebagian',    -- mandiri dengan supervisi tidak langsung
  'mandiri'              -- mandiri penuh
);

-- --- Jenis & kategori ujian pengetahuan -----------------------------
create type exam_type as enum ('osce', 'mcq');
create type knowledge_category as enum ('penatalaksanaan', 'prosedur');

-- --- Fungsi bantu: updated_at otomatis ------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
