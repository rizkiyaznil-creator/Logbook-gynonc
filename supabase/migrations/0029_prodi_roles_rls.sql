-- =====================================================================
-- 0029_prodi_roles_rls.sql — RLS untuk peran prodi baru (sps, admin_prodi)
--
-- Strategi (minim risiko, aditif):
--   • SPS = KPS: `is_kps_of()` diperluas agar mengenali anggota kps_programs
--     yang berperan 'kps' ATAU 'sps'. Karena hampir semua kebijakan (baca &
--     tulis) sudah menyalurkan wewenang lewat is_kps_of(program_id), SPS
--     otomatis mewarisi SELURUH wewenang KPS tanpa mengubah kebijakan itu.
--   • Admin Prodi = read-only: fungsi baru `is_admin_prodi_of()` + kebijakan
--     SELECT tambahan (OR) pada tabel ber-lingkup-prodi. Tidak ada kebijakan
--     tulis → Admin Prodi tak bisa mengubah apa pun (ditegakkan RLS).
--   • kps_programs kini menampung keanggotaan kps, sps, DAN admin_prodi.
--
-- Idempoten. Uji perilaku disarankan (lihat catatan di bawah).
-- =====================================================================

begin;

-- 1) is_kps_of: kenali kps + sps (SPS mewarisi wewenang KPS) --------
create or replace function is_kps_of(p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from kps_programs kp
    join profiles pr on pr.id = kp.kps_id
    where kp.kps_id = auth.uid()
      and kp.program_id = p_program
      and pr.role in ('kps', 'sps')
  );
$$;

-- 2) is_admin_prodi_of: anggota berperan admin_prodi (read-only) -----
create or replace function is_admin_prodi_of(p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from kps_programs kp
    join profiles pr on pr.id = kp.kps_id
    where kp.kps_id = auth.uid()
      and kp.program_id = p_program
      and pr.role = 'admin_prodi'
  );
$$;

-- 3) Kebijakan SELECT tambahan untuk Admin Prodi (per prodinya) ------
drop policy if exists "residen_baca_adminprodi" on residents;
create policy "residen_baca_adminprodi" on residents for select to authenticated
  using (is_admin_prodi_of(program_id));

drop policy if exists "entri_baca_adminprodi" on log_entries;
create policy "entri_baca_adminprodi" on log_entries for select to authenticated
  using (is_admin_prodi_of(program_id));

drop policy if exists "karya_baca_adminprodi" on academic_works;
create policy "karya_baca_adminprodi" on academic_works for select to authenticated
  using (is_admin_prodi_of(program_id));

drop policy if exists "nilai_baca_adminprodi" on assessments;
create policy "nilai_baca_adminprodi" on assessments for select to authenticated
  using (is_admin_prodi_of(program_id));

drop policy if exists "audit_baca_adminprodi" on audit_log;
create policy "audit_baca_adminprodi" on audit_log for select to authenticated
  using (program_id is not null and is_admin_prodi_of(program_id));

-- entry_reviews tak punya program_id → gabung ke log_entries induknya.
drop policy if exists "review_baca_adminprodi" on entry_reviews;
create policy "review_baca_adminprodi" on entry_reviews for select to authenticated
  using (exists (
    select 1 from log_entries e
    where e.id = entry_id and is_admin_prodi_of(e.program_id)
  ));

-- Kurikulum (data kompetensi ber-program_id): baca untuk Admin Prodi.
do $$
declare t text;
begin
  foreach t in array array[
    'diseases','procedures','clinical_competencies',
    'clinical_competency_subtargets','knowledge_items'
  ] loop
    execute format('drop policy if exists "kurikulum_baca_adminprodi" on %I;', t);
    execute format($f$
      create policy "kurikulum_baca_adminprodi" on %I for select to authenticated
      using (is_admin_prodi_of(program_id));
    $f$, t);
  end loop;
end $$;

-- 4) profiles: SPS setara KPS; Admin Prodi baca residen prodinya -----
--    (Menggantikan profil_baca & profil_kps_residen dari 0027.)
drop policy if exists "profil_baca" on profiles;
create policy "profil_baca" on profiles for select to authenticated
  using (
    id = auth.uid()
    or is_super_admin()
    or current_role_name() in ('supervisor', 'penguji')
    -- Nama staf/verifikator tampil untuk semua peran
    or role in ('supervisor', 'kps', 'sps', 'admin', 'penguji', 'admin_prodi')
    -- KPS/SPS: residen di prodinya
    or (current_role_name() in ('kps', 'sps') and is_kps_of(program_id))
    -- Admin Prodi (read-only): residen di prodinya
    or (current_role_name() = 'admin_prodi' and is_admin_prodi_of(program_id))
  );

-- KPS & SPS boleh kelola residen di prodinya (Admin Prodi TIDAK).
drop policy if exists "profil_kps_residen" on profiles;
create policy "profil_kps_residen" on profiles for all to authenticated
  using (
    current_role_name() in ('kps', 'sps')
    and role = 'residen'
    and is_kps_of(program_id)
  )
  with check (
    current_role_name() in ('kps', 'sps')
    and role = 'residen'
    and is_kps_of(program_id)
  );

-- 5) handle_new_user: home program & keanggotaan untuk peran prodi ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'residen');
  v_prog uuid := nullif(new.raw_user_meta_data->>'program_id','')::uuid;
begin
  -- Residen & staf prodi (kps/sps/admin_prodi) wajib punya home program.
  if v_role in ('residen','kps','sps','admin_prodi') and v_prog is null then
    select id into v_prog from programs where kode = 'onkogin';
  end if;

  insert into public.profiles (id, full_name, email, role, program_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role::user_role,
    case when v_role in ('residen','kps','sps','admin_prodi') then v_prog else null end
  );

  if v_role = 'residen' then
    insert into public.residents (id, program_id) values (new.id, v_prog);
  end if;

  -- Staf prodi: catat keanggotaan program utama (tambahan lewat UI/admin).
  if v_role in ('kps','sps','admin_prodi') and v_prog is not null then
    insert into kps_programs (kps_id, program_id) values (new.id, v_prog)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

commit;

-- =====================================================================
-- Uji manual disarankan:
--   • SPS di prodi X → dapat verifikasi/penilaian/rekap/kurikulum/kelola
--     residen prodi X, TIDAK melihat prodi lain (sama seperti KPS).
--   • Admin Prodi di prodi X → dapat MEMBACA residen/entri/karya/nilai/
--     audit/kurikulum prodi X, tetapi SEMUA percobaan tulis GAGAL.
-- =====================================================================
