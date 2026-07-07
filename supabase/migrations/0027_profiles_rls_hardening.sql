-- =====================================================================
-- 0027_profiles_rls_hardening.sql — Pengetatan RLS tabel `profiles`
--
-- Menutup celah pada batas keamanan SESUNGGUHNYA (RLS), yang sebelumnya hanya
-- dibatasi di lapisan aplikasi (server action):
--
--   (1) WRITE — `profil_kelola_staf` lama memakai is_staff() = (kps OR admin)
--       TANPA batas prodi → seorang KPS bisa MENGUBAH/MENGHAPUS profil siapa pun
--       (mis. menaikkan dirinya jadi admin, mengubah residen/KPS prodi lain)
--       dengan memanggil Supabase langsung memakai sesinya.
--
--   (2) READ — `profil_baca_sendiri_atau_staf` lama memakai is_staff() →
--       KPS bisa membaca PII (email/telp) seluruh residen lintas-prodi.
--
--   (3) program_id — trigger `protect_profile_role` (0015) mencegah pengguna
--       mengubah PERAN dirinya, tetapi TIDAK menjaga `program_id`, sehingga
--       residen masih bisa "pindah prodi" sendiri lewat update profil.
--
-- Yang TIDAK diubah (sesuai desain):
--   • Nama verifikator (supervisor/kps/admin) & penguji tetap dapat dibaca semua
--     peran agar tampil di riwayat & pemilih residen.
--   • Perubahan peran oleh super-admin (changeRole) & operasi service_role
--     (admin client: buat/hapus user, atur prodi KPS) tetap berjalan.
--
-- Idempoten & aman dijalankan ulang. Lihat ROLLBACK di bawah bila perlu.
--
-- ⚠️  Setelah menerapkan, UJI: login tiap peran; KPS buat & hapus residen;
--     admin ubah peran & atur prodi KPS; residen edit profil sendiri;
--     halaman Verifikasi/Penilaian/Rekap menampilkan nama dengan benar.
-- =====================================================================

begin;

-- 1) Hapus kebijakan SELECT/WRITE lama yang terlalu permisif ----------
--    (dikonsolidasikan ke kebijakan baru di bawah)
drop policy if exists "profil_baca_sendiri_atau_staf" on profiles;  -- 0007
drop policy if exists "profil_baca_supervisor"        on profiles;  -- 0012
drop policy if exists "profil_baca_penguji"           on profiles;  -- 0010
drop policy if exists "profil_baca_verifikator"       on profiles;  -- 0014
drop policy if exists "profil_kelola_staf"            on profiles;  -- 0007 (write)

-- 2) SELECT terpadu — lingkup baca per peran -------------------------
drop policy if exists "profil_baca" on profiles;
create policy "profil_baca" on profiles for select to authenticated
  using (
    id = auth.uid()                                       -- diri sendiri
    or is_super_admin()                                   -- admin: semua
    -- DPJP & penguji lintas-program: baca daftar residen (untuk antrean/pemilih)
    or current_role_name() in ('supervisor', 'penguji')
    -- Nama verifikator & penguji tampil untuk semua peran (gabungan 0014)
    or role in ('supervisor', 'kps', 'admin', 'penguji')
    -- KPS: residen HANYA di prodi yang dikelolanya (isolasi PII antar-prodi)
    or (current_role_name() = 'kps' and is_kps_of(program_id))
  );

-- 3) WRITE — super-admin penuh; KPS terbatas residen di prodinya ------
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

-- (Kebijakan `profil_ubah_sendiri` dari 0007 tetap dipakai untuk menyunting
--  data profil sendiri; kolom sensitif dijaga trigger langkah 4.)

-- 4) Perketat trigger penjaga kolom sensitif (gantikan versi 0015) -----
--    Kolom `role` & `program_id` HANYA boleh diubah oleh super-admin atau
--    konteks service_role tepercaya (admin client; auth.uid() null). Semua
--    peran lain — termasuk KPS yang mengubah dirinya sendiri lewat kebijakan
--    "profil_ubah_sendiri" — perubahannya diurungkan diam-diam. Ini menutup
--    eskalasi mandiri (mis. residen/KPS menaikkan diri jadi admin) dan
--    perpindahan prodi sepihak. (Versi 0015 keliru mengizinkan kps/admin.)
create or replace function protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.program_id is distinct from old.program_id)
     and auth.uid() is not null                  -- service_role → auth.uid() null
     and coalesce(is_super_admin(), false) = false
  then
    new.role := old.role;
    new.program_id := old.program_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_role on profiles;
create trigger trg_protect_role before update on profiles
  for each row execute function protect_profile_role();

commit;

-- =====================================================================
-- ROLLBACK (kembalikan kebijakan lama bila diperlukan):
--
--   begin;
--   drop policy if exists "profil_baca"              on profiles;
--   drop policy if exists "profil_kelola_superadmin" on profiles;
--   drop policy if exists "profil_kps_residen"       on profiles;
--   create policy "profil_baca_sendiri_atau_staf" on profiles for select
--     to authenticated using (id = auth.uid() or is_staff()
--       or (current_role_name() = 'supervisor'));
--   create policy "profil_baca_supervisor" on profiles for select
--     to authenticated using (role = 'supervisor');
--   create policy "profil_baca_penguji" on profiles for select
--     to authenticated using (current_role_name() = 'penguji');
--   create policy "profil_baca_verifikator" on profiles for select
--     to authenticated using (role in ('supervisor','kps','admin'));
--   create policy "profil_kelola_staf" on profiles for all
--     to authenticated using (is_staff()) with check (is_staff());
--   -- (opsional) kembalikan protect_profile_role ke versi 0015 tanpa blok program_id
--   commit;
-- =====================================================================
