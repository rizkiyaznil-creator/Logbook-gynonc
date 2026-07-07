-- =====================================================================
-- 0025_kps_multiprogram.sql — FASE 6: KPS lintas-beberapa-prodi
-- Acuan: docs/arsitektur-platform.md
--
-- Konteks nyata: KPS subspesialis hanya 1 orang yang membawahi 3 prodi
-- (Fetomaternal, FER, Onkogin), sementara prodi Spesialis Obgin punya KPS
-- sendiri. Model lama (0023) mengikat 1 KPS ke TEPAT 1 program
-- (`profiles.program_id`). Migrasi ini melonggarkannya: seorang KPS bisa
-- mengelola BANYAK program lewat tabel relasi `kps_programs`.
--
-- Catatan keamanan: hanya `is_kps_of()` & policy baca kurikulum yang berubah;
-- seluruh policy lain yang sudah memakai `is_kps_of(program_id)` otomatis
-- mendukung multi-program. `profiles.program_id` tetap dipakai sebagai
-- "program utama" KPS (branding/turunan) — diisi salah satu programnya.
-- Idempoten (aman dijalankan ulang).
-- =====================================================================

begin;

-- =====================================================================
-- 1. TABEL relasi KPS ↔ programs (banyak-ke-banyak)
-- =====================================================================
create table if not exists kps_programs (
  kps_id     uuid not null references profiles(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kps_id, program_id)
);
create index if not exists kps_programs_program_idx on kps_programs (program_id);
alter table kps_programs enable row level security;

-- KPS boleh membaca penugasan programnya sendiri; super-admin kelola semua.
drop policy if exists "kps_prog_baca" on kps_programs;
create policy "kps_prog_baca" on kps_programs for select to authenticated
  using (kps_id = auth.uid() or is_super_admin());

drop policy if exists "kps_prog_kelola_admin" on kps_programs;
create policy "kps_prog_kelola_admin" on kps_programs for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- =====================================================================
-- 2. BACKFILL: KPS lama → 1 penugasan = program_id rumahnya
-- =====================================================================
insert into kps_programs (kps_id, program_id)
select id, program_id from profiles
where role = 'kps' and program_id is not null
on conflict do nothing;

-- =====================================================================
-- 3. REWRITE is_kps_of: cek keanggotaan di kps_programs (bukan 1 kolom)
-- =====================================================================
create or replace function is_kps_of(p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from kps_programs kp
    join profiles pr on pr.id = kp.kps_id
    where kp.kps_id = auth.uid()
      and kp.program_id = p_program
      and pr.role = 'kps'
  );
$$;

-- =====================================================================
-- 4. Policy BACA kurikulum: izinkan KPS lihat SEMUA programnya
--    (sebelumnya hanya `program_id = current_program()` = 1 program).
--    Residen tetap dibatasi ke programnya; DPJP/penguji lintas-program.
-- =====================================================================
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
        or current_role_name() in ('supervisor','penguji')
      );
    $f$, t);
  end loop;
end $$;

-- =====================================================================
-- 5. handle_new_user: KPS baru → catat penugasan program utamanya
--    (recreate; sama seperti 0023 + insert kps_programs untuk KPS)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'residen');
  v_prog uuid := nullif(new.raw_user_meta_data->>'program_id','')::uuid;
begin
  -- Residen & KPS wajib punya home program; default tenant pertama.
  if v_role in ('residen','kps') and v_prog is null then
    select id into v_prog from programs where kode = 'onkogin';
  end if;

  insert into public.profiles (id, full_name, email, role, program_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role::user_role,
    case when v_role in ('residen','kps') then v_prog else null end
  );

  if v_role = 'residen' then
    insert into public.residents (id, program_id) values (new.id, v_prog);
  end if;

  -- KPS: catat penugasan program utama (penugasan tambahan lewat UI/admin).
  if v_role = 'kps' and v_prog is not null then
    insert into kps_programs (kps_id, program_id) values (new.id, v_prog)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

commit;

-- =====================================================================
-- Uji manual yang disarankan setelah migrasi:
--   • KPS subspesialis: tambahkan 3 baris kps_programs (fer, fetomaternal,
--     onkogin) → ybs bisa lihat rekap/verifikasi/audit/kurikulum ketiganya.
--   • KPS obgin: 1 baris (obgin) → hanya obgin.
--   • Isolasi: KPS subspesialis TIDAK melihat data obgin, dan sebaliknya.
-- =====================================================================
