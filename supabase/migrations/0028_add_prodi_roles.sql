-- =====================================================================
-- 0028_add_prodi_roles.sql — Tambah dua peran prodi baru
--   • sps         : SPS / Sekretaris Prodi — wewenang SAMA dengan KPS
--   • admin_prodi : Admin Prodi — READ-ONLY (memantau, tak mengubah apa pun)
--
-- Nilai enum ditambahkan di migrasi tersendiri (tanpa transaksi) karena nilai
-- enum baru tidak boleh dipakai pada transaksi yang sama saat menambahkannya.
-- Kebijakan RLS & logika ada di 0029.
-- Idempoten (IF NOT EXISTS).
-- =====================================================================

alter type user_role add value if not exists 'sps';
alter type user_role add value if not exists 'admin_prodi';
