-- =====================================================================
-- 0010_penguji_access.sql — Penguji boleh membaca daftar residen & profil
-- (untuk memilih residen yang akan dinilai). Policy tambahan bersifat
-- permisif (digabung OR dengan policy lain).
-- =====================================================================

create policy "residen_baca_penguji" on residents for select to authenticated
  using (current_role_name() = 'penguji');

create policy "profil_baca_penguji" on profiles for select to authenticated
  using (current_role_name() = 'penguji');
