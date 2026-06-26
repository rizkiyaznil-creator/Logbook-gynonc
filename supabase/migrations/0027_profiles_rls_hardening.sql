-- =====================================================================
-- 0027_profiles_rls_hardening.sql — Pengetatan RLS tabel `profiles`
--
-- Menutup dua celah eskalasi hak (defense-in-depth) yang sebelumnya hanya
-- dibatasi di lapisan aplikasi (server action), padahal RLS adalah batas
-- keamanan sesungguhnya:
--
--   (1) `profil_kelola_staf` lama memakai is_staff() = (kps OR admin) TANPA
--       batas prodi → seorang KPS bisa MENGUBAH/MENGHAPUS profil siapa pun
--       (mis. menaikkan dirinya jadi admin, mengubah residen prodi lain)
--       dengan memanggil Supabase langsung memakai sesinya.
--
--   (2) `profil_ubah_sendiri` lama mengizinkan UPDATE baris milik sendiri
--       tanpa batas kolom → pengguna mana pun bisa mengubah kolom `role`
--       dirinya menjadi 'admin' lewat panggilan Supabase langsung.
--
-- Pendekatan:
--   • Baca (SELECT): super-admin lihat semua; supervisor/penguji tetap lihat
--     profil (untuk pemilih residen); KPS hanya lihat residen di prodinya +
--     penguji/DPJP (lintas-program). KPS TIDAK lagi melihat admin/KPS lain/
--     residen prodi lain.
--   • Tulis (write): super-admin penuh; KPS hanya residen di prodinya dan
--     WAJIB tetap berperan residen & tetap di prodinya (cegah eskalasi/pindah).
--   • Self-update tetap diizinkan untuk data profil biasa (nama, telp, dll),
--     tetapi TRIGGER mencegah perubahan kolom sensitif (role, program_id) oleh
--     siapa pun selain super-admin atau konteks service_role (admin client).
--
-- Idempoten & aman dijalankan ulang. Lihat bagian ROLLBACK di bawah bila perlu
-- mengembalikan ke kebijakan lama.
--
-- ⚠️  Setelah menerapkan, UJI: login tiap peran, buat/hapus user oleh KPS &
--     admin, edit profil sendiri, halaman Verifikasi/Penilaian/Rekap.
-- =====================================================================

begin;

-- 1) Hapus kebijakan lama yang terlalu permisif -----------------------
drop policy if exists "profil_baca_sendiri_atau_staf" on profiles;
drop policy if exists "profil_kelola_staf"            on profiles;
drop policy if exists "profil_ubah_sendiri"           on profiles;
drop policy if exists "profil_baca_supervisor"        on profiles;  -- 0012
drop policy if exists "profil_baca_penguji"           on profiles;  -- 0010

-- 2) SELECT — lingkup baca per peran ---------------------------------
create policy "profil_baca" on profiles for select to authenticated
  using (
    id = auth.uid()
    or is_super_admin()
    -- DPJP & penguji bersifat lintas-program: tetap dapat membaca profil
    -- (dipakai untuk menampilkan nama residen pada antrean & pemilih).
    or current_role_name() in ('supervisor', 'penguji')
    -- KPS: hanya residen di prodi yang dikelolanya, plus penguji & DPJP.
    or (
      current_role_name() = 'kps'
      and (is_kps_of(program_id) or role in ('supervisor', 'penguji'))
    )
  );

-- 3) Self-update — pengguna mengubah profil sendiri (kolom sensitif
--    dijaga trigger di langkah 5) -------------------------------------
create policy "profil_ubah_sendiri" on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4) Write — super-admin penuh; KPS terbatas residen di prodinya ------
drop policy if exists "profil_kelola_superadmin" on profiles;
create policy "profil_kelola_superadmin" on profiles for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- KPS: kelola residen prodinya saja. WITH CHECK memaksa baris hasil tetap
-- residen & tetap di prodi KPS → mencegah eskalasi peran & pindah prodi.
drop policy if exists "profil_kps_residen" on profiles;
create policy "profil_kps_residen" on profiles for all to authenticated
  using (
    current_role_name() = 'kps'
    and role = 'residen'
    and is_kps_of(program_id)
  )
  with check (
    current_role_name() = 'kps'
    and role = 'residen'
    and is_kps_of(program_id)
  );

-- 5) Trigger penjaga kolom sensitif ----------------------------------
-- Mencegah perubahan `role`/`program_id` oleh pengguna biasa (termasuk
-- self-update). Dibiarkan untuk: super-admin, dan konteks service_role
-- (admin client; auth.uid() = null) yang dipakai server action tepercaya.
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
        NEW.role       is distinct from OLD.role
     or NEW.program_id is distinct from OLD.program_id
     )
     and auth.uid() is not null      -- service_role (admin client) → auth.uid() null
     and not is_super_admin()
  then
    raise exception
      'Tidak berwenang mengubah peran atau program studi (role/program_id).';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_profile_cols on profiles;
create trigger trg_guard_profile_cols
  before update on profiles
  for each row execute function guard_profile_privileged_cols();

commit;

-- =====================================================================
-- ROLLBACK (jalankan bila ingin mengembalikan kebijakan lama):
--
--   begin;
--   drop trigger if exists trg_guard_profile_cols on profiles;
--   drop function if exists guard_profile_privileged_cols();
--   drop policy if exists "profil_baca"             on profiles;
--   drop policy if exists "profil_ubah_sendiri"     on profiles;
--   drop policy if exists "profil_kelola_superadmin" on profiles;
--   drop policy if exists "profil_kps_residen"      on profiles;
--   create policy "profil_baca_sendiri_atau_staf" on profiles for select
--     to authenticated using (id = auth.uid() or is_staff()
--       or (current_role_name() = 'supervisor'));
--   create policy "profil_ubah_sendiri" on profiles for update
--     to authenticated using (id = auth.uid()) with check (id = auth.uid());
--   create policy "profil_kelola_staf" on profiles for all
--     to authenticated using (is_staff()) with check (is_staff());
--   commit;
-- =====================================================================
