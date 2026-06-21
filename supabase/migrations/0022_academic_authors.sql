-- =====================================================================
-- 0022_academic_authors.sql — Pembimbing kedua & penguji tesis,
-- serta daftar co-author publikasi/presentasi.
-- Pembimbing utama (pembimbing_id) tetap menjadi verifikator.
-- =====================================================================

alter table academic_works
  add column if not exists pembimbing2 text,  -- nama pembimbing kedua (tesis)
  add column if not exists penguji     text,  -- daftar nama penguji 3-5 (tesis), satu per baris
  add column if not exists co_authors  jsonb; -- [{nama, korespondensi}] untuk publikasi/presentasi
