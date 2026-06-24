-- =====================================================================
-- 0026_durasi_program.sql — Durasi pendidikan per prodi (bulan)
--
-- Subspesialis (Fetomaternal, FER, Onkogin) = 24 bulan (2 tahun);
-- Spesialis Obstetri & Ginekologi (obgin)   = 48 bulan (4 tahun).
-- Dipakai untuk proyeksi kelulusan ("tepat waktu / berisiko terlambat")
-- di halaman Rekap. Disimpan di programs.config->durasi_bulan agar bisa
-- diubah lewat editor config (super-admin). Idempoten.
-- =====================================================================

begin;

-- Isi default 24 bulan untuk prodi yang belum menetapkan durasi.
update programs
set config = jsonb_set(coalesce(config, '{}'::jsonb), '{durasi_bulan}', '24'::jsonb, true)
where coalesce(config->>'durasi_bulan', '') = '';

-- Prodi spesialis Obgin = 48 bulan.
update programs
set config = jsonb_set(config, '{durasi_bulan}', '48'::jsonb, true)
where kode = 'obgin';

commit;
