-- =====================================================================
-- 0014_baca_verifikator.sql — Nama verifikator (supervisor/KPS/admin)
-- boleh dibaca semua pengguna login, agar tampil di riwayat verifikasi.
-- =====================================================================

create policy "profil_baca_verifikator" on profiles for select to authenticated
  using (role in ('supervisor', 'kps', 'admin'));
