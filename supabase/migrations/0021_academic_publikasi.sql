-- =====================================================================
-- 0021_academic_publikasi.sql — Publikasi & presentasi karya ilmiah
-- (event nasional/internasional). Memperluas academic_works.
-- =====================================================================

-- Jenis baru. (ADD VALUE aman: nilai baru tidak dipakai di DDL berikut.)
alter type academic_jenis add value if not exists 'publikasi';
alter type academic_jenis add value if not exists 'presentasi';

create type academic_tingkat as enum ('nasional', 'internasional');
create type presentasi_bentuk as enum ('oral', 'poster');

alter table academic_works
  add column if not exists tingkat  academic_tingkat,
  add column if not exists penerbit text,              -- nama jurnal/prosiding atau nama event
  add column if not exists bentuk   presentasi_bentuk; -- khusus presentasi: oral/poster
