-- =====================================================================
-- 0013_rumah_sakit.sql — Kolom Rumah Sakit (teks bebas) pada entri
-- Dua RS baku ditawarkan sebagai saran di UI; nama lain bebas diketik.
-- =====================================================================

alter table log_entries add column rumah_sakit text;
