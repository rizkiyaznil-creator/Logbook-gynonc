-- =====================================================================
-- 0030_remove_penguji_role.sql — Hapus peran "penguji"
--
-- Perubahan:
--   1. Penilaian (assessments) hanya boleh diberikan oleh Ketua Prodi (kps),
--      SPS (sps), dan super-admin. is_kps_of() sudah mencakup kps+sps (0029),
--      jadi kebijakan tulis cukup: is_kps_of(program_id) OR is_super_admin().
--   2. Peran penguji dihapus dari seluruh kebijakan RLS.
--   3. Akun berperan penguji DIHAPUS PERMANEN (auth.users → cascade ke profiles).
--      Referensi NO ACTION (assessments.examiner_id dll.) di-null-kan lebih dulu.
--
-- Catatan:
--   • Nilai berulang → nilai TERTINGGI otomatis tampil: v_knowledge_progress
--     sudah memakai max(persen) per butir & jenis (OSCE/MCQ). Tidak diubah.
--   • Field academic_works.penguji (nama penguji sidang tesis) BEDA hal —
--     tetap dipertahankan.
--   • Nilai enum 'penguji' pada tipe user_role dibiarkan (non-aktif/tak dipakai);
--     menghapus nilai enum memerlukan pembuatan ulang tipe — tidak dilakukan.
--
-- Idempoten. Uji perilaku disarankan (hanya kps/sps/admin yang bisa menilai).
-- =====================================================================

begin;

-- 1) PENILAIAN — hanya kps/sps (is_kps_of) & super-admin -------------
drop policy if exists "nilai_kelola_penguji" on assessments;
drop policy if exists "nilai_kelola_staf"    on assessments;
create policy "nilai_kelola_staf" on assessments for all to authenticated
  using (is_kps_of(program_id) or is_super_admin())
  with check (is_kps_of(program_id) or is_super_admin());

-- Baca nilai: residen (miliknya), DPJP pembimbingnya, staf prodi (via
-- is_kps_of / kebijakan admin_prodi 0029), super-admin. Klausa penguji dihapus.
drop policy if exists "nilai_baca" on assessments;
create policy "nilai_baca" on assessments for select to authenticated
  using (
    resident_id = auth.uid()
    or is_supervisor_of(resident_id)
    or is_kps_of(program_id)
    or is_super_admin()
  );

-- 2) Hapus kebijakan khusus penguji (akses baca luas) ----------------
drop policy if exists "profil_baca_penguji"  on profiles;   -- 0010
drop policy if exists "residen_baca_penguji" on residents;  -- 0010

-- 3) profiles: buang penguji dari kebijakan baca (recreate 0029) ------
drop policy if exists "profil_baca" on profiles;
create policy "profil_baca" on profiles for select to authenticated
  using (
    id = auth.uid()
    or is_super_admin()
    or current_role_name() = 'supervisor'
    or role in ('supervisor', 'kps', 'sps', 'admin', 'admin_prodi')
    or (current_role_name() in ('kps', 'sps') and is_kps_of(program_id))
    or (current_role_name() = 'admin_prodi' and is_admin_prodi_of(program_id))
  );

-- 4) kurikulum: buang penguji dari kebijakan baca (recreate 0025) -----
do $$
declare t text;
begin
  foreach t in array array[
    'diseases','procedures','clinical_competencies',
    'clinical_competency_subtargets','knowledge_items'
  ] loop
    execute format('drop policy if exists "kurikulum_baca" on %I;', t);
    execute format($f$
      create policy "kurikulum_baca" on %I for select to authenticated
      using (
        program_id = current_program()
        or is_kps_of(program_id)
        or is_super_admin()
        or current_role_name() = 'supervisor'
      );
    $f$, t);
  end loop;
end $$;

-- 5) HAPUS PERMANEN akun penguji -------------------------------------
-- Null-kan referensi NO ACTION agar penghapusan tidak melanggar FK.
update assessments    set examiner_id   = null
  where examiner_id   in (select id from profiles where role = 'penguji');
update log_entries    set verified_by   = null
  where verified_by   in (select id from profiles where role = 'penguji');
update log_entries    set supervisor_id = null
  where supervisor_id in (select id from profiles where role = 'penguji');
update entry_reviews  set reviewer_id   = null
  where reviewer_id   in (select id from profiles where role = 'penguji');
update academic_works set pembimbing_id = null
  where pembimbing_id in (select id from profiles where role = 'penguji');
update academic_works set verified_by   = null
  where verified_by   in (select id from profiles where role = 'penguji');

-- Hapus akun auth (cascade: profiles → residents/notifications/kps_programs …).
delete from auth.users
  where id in (select id from profiles where role = 'penguji');

commit;
