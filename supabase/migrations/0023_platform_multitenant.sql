-- =====================================================================
-- 0023_platform_multitenant.sql — FASE 1: Fondasi multi-tenant
-- Acuan: docs/arsitektur-platform.md
--
-- Mengubah aplikasi single-program (Onkologi Ginekologi) menjadi platform
-- multi-program satu codebase. Fase 1:
--   1. Buat tabel `programs`; isi 1 baris Onkologi Ginekologi (program #1).
--   2. Tambah `program_id` ke profiles + seluruh tabel kurikulum & transaksional;
--      backfill seluruh data lama ke program #1.
--   3. Tulis ulang RLS (KPS dipersempit ke programnya, helper baru, super-admin).
--   4. Buat ulang views agregasi agar program-aware.
--
-- TANPA perubahan tampilan bagi user lama (engine & kolom view tetap sama).
-- Idempoten sebisa mungkin (aman dijalankan ulang).
-- =====================================================================

begin;

-- =====================================================================
-- 1. TABEL programs + tenant pertama (Onkologi Ginekologi)
-- =====================================================================
create table if not exists programs (
  id         uuid primary key default gen_random_uuid(),
  kode       text unique not null,          -- mis. 'onkogin', 'obgin'
  nama       text not null,
  config     jsonb not null default '{}'::jsonb,
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);
alter table programs enable row level security;

-- Program #1 — tenant pertama. Konfigurasi sesuai aplikasi saat ini.
insert into programs (kode, nama, config)
values (
  'onkogin',
  'Subspesialis Onkologi Ginekologi',
  jsonb_build_object(
    'accent', 'teal',
    'label_tabel_prosedur', 'Tabel 24',
    'label_tabel_penatalaksanaan', 'Tabel 18',
    'figo_enabled', true,
    'staging_options', jsonb_build_array('IA','IB','IC','II','IIIA','IIIB','IIIC','IVA','IVB')
  )
)
on conflict (kode) do nothing;

-- =====================================================================
-- 2. KOLOM program_id
-- =====================================================================

-- --- profiles: home program (residen & KPS); null untuk DPJP/penguji/admin
alter table profiles
  add column if not exists program_id uuid references programs(id) on delete restrict;

-- --- Kurikulum (data per program) -----------------------------------
alter table procedures
  add column if not exists program_id uuid references programs(id) on delete cascade;
alter table clinical_competencies
  add column if not exists program_id uuid references programs(id) on delete cascade;
alter table clinical_competency_subtargets
  add column if not exists program_id uuid references programs(id) on delete cascade;
alter table diseases
  add column if not exists program_id uuid references programs(id) on delete cascade;
alter table knowledge_items
  add column if not exists program_id uuid references programs(id) on delete cascade;

-- --- Transaksional (data per program) -------------------------------
alter table residents
  add column if not exists program_id uuid references programs(id) on delete restrict;
alter table log_entries
  add column if not exists program_id uuid references programs(id) on delete restrict;
alter table academic_works
  add column if not exists program_id uuid references programs(id) on delete restrict;
alter table entry_templates
  add column if not exists program_id uuid references programs(id) on delete restrict;
alter table assessments
  add column if not exists program_id uuid references programs(id) on delete restrict;
alter table audit_log
  add column if not exists program_id uuid references programs(id) on delete set null;
alter table notifications
  add column if not exists program_id uuid references programs(id) on delete set null;

-- =====================================================================
-- 3. BACKFILL seluruh data lama -> program #1 (onkogin)
-- =====================================================================
do $$
declare p1 uuid;
begin
  select id into p1 from programs where kode = 'onkogin';

  -- Kurikulum
  update procedures                    set program_id = p1 where program_id is null;
  update clinical_competencies         set program_id = p1 where program_id is null;
  update clinical_competency_subtargets set program_id = p1 where program_id is null;
  update diseases                      set program_id = p1 where program_id is null;
  update knowledge_items               set program_id = p1 where program_id is null;

  -- Transaksional
  update residents      set program_id = p1 where program_id is null;
  update log_entries    set program_id = p1 where program_id is null;
  update academic_works set program_id = p1 where program_id is null;
  update entry_templates set program_id = p1 where program_id is null;
  update assessments    set program_id = p1 where program_id is null;
  update audit_log      set program_id = p1 where program_id is null;
  update notifications  set program_id = p1 where program_id is null;

  -- Home program: residen & KPS lama -> program #1. DPJP/penguji/admin: null.
  update profiles set program_id = p1 where program_id is null and role in ('residen','kps');
end $$;

-- =====================================================================
-- 4. CONSTRAINT: kode/no kurikulum unik PER PROGRAM (bukan global)
--    Memungkinkan program lain memakai kode yang sama (PR-01, PK-01, dst).
-- =====================================================================
alter table diseases               drop constraint if exists diseases_no_key;
alter table clinical_competencies  drop constraint if exists clinical_competencies_kode_key;
alter table clinical_competencies  drop constraint if exists clinical_competencies_no_key;
alter table procedures             drop constraint if exists procedures_kode_key;
alter table procedures             drop constraint if exists procedures_no_key;
alter table knowledge_items        drop constraint if exists knowledge_items_kode_key;

create unique index if not exists diseases_program_no_uidx
  on diseases (program_id, no);
create unique index if not exists clinical_competencies_program_kode_uidx
  on clinical_competencies (program_id, kode);
create unique index if not exists clinical_competencies_program_no_uidx
  on clinical_competencies (program_id, no);
create unique index if not exists procedures_program_kode_uidx
  on procedures (program_id, kode);
create unique index if not exists procedures_program_no_uidx
  on procedures (program_id, no);
create unique index if not exists knowledge_items_program_kode_uidx
  on knowledge_items (program_id, kode);

-- Indeks bantu untuk filter program-aware.
create index if not exists log_entries_program_idx   on log_entries (program_id);
create index if not exists residents_program_idx     on residents (program_id);
create index if not exists academic_works_program_idx on academic_works (program_id);
create index if not exists assessments_program_idx   on assessments (program_id);

-- =====================================================================
-- 5. NOT NULL setelah backfill (kolom yang selalu wajib)
--    profiles, audit_log, notifications tetap NULLABLE (lintas/sistemik).
-- =====================================================================
alter table procedures                    alter column program_id set not null;
alter table clinical_competencies         alter column program_id set not null;
alter table clinical_competency_subtargets alter column program_id set not null;
alter table diseases                      alter column program_id set not null;
alter table knowledge_items               alter column program_id set not null;
alter table residents                     alter column program_id set not null;
alter table log_entries                   alter column program_id set not null;
alter table academic_works                alter column program_id set not null;
alter table entry_templates               alter column program_id set not null;
alter table assessments                   alter column program_id set not null;

-- =====================================================================
-- 6. HELPER (security definer) — konteks program & peran
-- =====================================================================

-- Home program milik pengguna login (null untuk DPJP/penguji/admin).
create or replace function current_program()
returns uuid language sql stable security definer set search_path = public as $$
  select program_id from profiles where id = auth.uid();
$$;

-- Super-admin platform (lintas semua program).
create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- KPS dari program tertentu (lingkup = program_id-nya).
create or replace function is_kps_of(p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'kps' and program_id = p_program
  );
$$;

-- Program rumah seorang pengguna (untuk turunan program_id data).
create or replace function program_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select program_id from profiles where id = p_user;
$$;

-- =====================================================================
-- 7. TURUNKAN program_id DARI KONTEKS RESIDEN (bukan akun pengisi)
--    BEFORE INSERT: program entri = program residen pemiliknya. Mencegah
--    program_id salah saat DPJP/penguji ikut menulis (mis. assessment).
-- =====================================================================
create or replace function set_program_from_resident()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.program_id is null then
    NEW.program_id := (select program_id from profiles where id = NEW.resident_id);
  end if;
  return NEW;
end $$;

drop trigger if exists trg_set_program_entries  on log_entries;
drop trigger if exists trg_set_program_academic on academic_works;
drop trigger if exists trg_set_program_template on entry_templates;
drop trigger if exists trg_set_program_assess   on assessments;

create trigger trg_set_program_entries  before insert on log_entries
  for each row execute function set_program_from_resident();
create trigger trg_set_program_academic before insert on academic_works
  for each row execute function set_program_from_resident();
create trigger trg_set_program_template before insert on entry_templates
  for each row execute function set_program_from_resident();
create trigger trg_set_program_assess   before insert on assessments
  for each row execute function set_program_from_resident();

-- =====================================================================
-- 8. handle_new_user: set home program untuk residen/KPS baru
--    Default ke program #1 bila metadata tidak menyertakan program_id.
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
  return new;
end;
$$;

-- =====================================================================
-- 9. TRIGGER audit & notifikasi — sertakan program_id
--    (recreate fungsi yang ada agar mengisi kolom program baru)
-- =====================================================================

-- ---- audit: log_entries --------------------------------------------
create or replace function audit_log_entries()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text; v_summary text; v_resident text;
  v_id uuid; v_rid uuid; v_type text; v_prog uuid;
begin
  if (TG_OP = 'DELETE') then
    v_rid := OLD.resident_id; v_id := OLD.id; v_type := OLD.entry_type::text; v_prog := OLD.program_id;
  else
    v_rid := NEW.resident_id; v_id := NEW.id; v_type := NEW.entry_type::text; v_prog := NEW.program_id;
  end if;

  select full_name into v_resident from profiles where id = v_rid;

  if (TG_OP = 'INSERT') then
    v_action := 'entri_dibuat';
    v_summary := 'Membuat entri ' || v_type || ' (' || NEW.status || ')';
  elsif (TG_OP = 'DELETE') then
    v_action := 'entri_dihapus';
    v_summary := 'Menghapus entri ' || v_type;
  else
    if NEW.status is distinct from OLD.status then
      v_action := 'entri_' || NEW.status;
      v_summary := 'Status ' || OLD.status || ' → ' || NEW.status ||
        case when coalesce(NEW.verifier_note, '') <> ''
             then ' · catatan: ' || NEW.verifier_note else '' end;
    else
      return NEW;
    end if;
  end if;

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary, meta, program_id)
  values (
    auth.uid(), actor_name(), v_action, 'log_entries', v_id,
    coalesce(v_resident || ' — ', '') || v_summary,
    jsonb_build_object('resident_id', v_rid, 'entry_type', v_type),
    v_prog
  );

  if (TG_OP = 'DELETE') then return OLD; end if;
  return NEW;
end $$;

-- ---- audit: profiles -----------------------------------------------
create or replace function audit_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_action text; v_summary text;
begin
  if NEW.role is distinct from OLD.role then
    v_action := 'peran_diubah';
    v_summary := coalesce(NEW.full_name, '') || ': peran ' || OLD.role || ' → ' || NEW.role;
  elsif NEW.aktif is distinct from OLD.aktif then
    v_action := case when NEW.aktif then 'user_diaktifkan' else 'user_dinonaktifkan' end;
    v_summary := coalesce(NEW.full_name, '') ||
      (case when NEW.aktif then ': diaktifkan' else ': dinonaktifkan' end);
  else
    return NEW;
  end if;

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary, program_id)
  values (auth.uid(), actor_name(), v_action, 'profiles', NEW.id, v_summary, NEW.program_id);
  return NEW;
end $$;

-- ---- audit: academic_works -----------------------------------------
create or replace function audit_academic()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text; v_action text; v_summary text;
        v_id uuid; v_rid uuid; v_judul text; v_jenis text; v_prog uuid;
begin
  if TG_OP = 'DELETE' then
    v_rid := OLD.resident_id; v_id := OLD.id; v_judul := OLD.judul; v_jenis := OLD.jenis::text; v_prog := OLD.program_id;
  else
    v_rid := NEW.resident_id; v_id := NEW.id; v_judul := NEW.judul; v_jenis := NEW.jenis::text; v_prog := NEW.program_id;
  end if;
  select full_name into v_resident from profiles where id = v_rid;

  if TG_OP = 'INSERT' then
    v_action := 'karya_dibuat'; v_summary := 'Membuat ' || v_jenis || ' (' || NEW.status || ')';
  elsif TG_OP = 'DELETE' then
    v_action := 'karya_dihapus'; v_summary := 'Menghapus ' || v_jenis;
  else
    if NEW.status is distinct from OLD.status then
      v_action := 'karya_' || NEW.status;
      v_summary := 'Status ' || OLD.status || ' → ' || NEW.status ||
        coalesce(' · ' || nullif(NEW.verifier_note, ''), '');
    else
      return NEW;
    end if;
  end if;

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary, program_id)
  values (auth.uid(), actor_name(), v_action, 'academic_works', v_id,
    coalesce(v_resident || ' — ', '') || v_jenis || ': ' || coalesce(v_judul, '') || ' — ' || v_summary,
    v_prog);

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;

-- ---- notifikasi: log_entries ---------------------------------------
create or replace function notify_entry_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text;
begin
  select full_name into v_resident from profiles where id = NEW.resident_id;

  if NEW.status = 'diajukan'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'diajukan')
     and NEW.supervisor_id is not null then
    insert into notifications (user_id, type, title, body, link, entry_id, program_id)
    values (
      NEW.supervisor_id, 'entri_baru', 'Entri baru menunggu verifikasi',
      coalesce(v_resident, 'Residen') || ' mengajukan satu entri.',
      '/verifikasi', NEW.id, NEW.program_id
    );
  end if;

  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status
     and NEW.status in ('diverifikasi', 'revisi', 'ditolak') then
    insert into notifications (user_id, type, title, body, link, entry_id, program_id)
    values (
      NEW.resident_id, 'entri_' || NEW.status,
      case NEW.status
        when 'diverifikasi' then 'Entri Anda diverifikasi'
        when 'revisi' then 'Entri Anda diminta revisi'
        else 'Entri Anda ditolak'
      end,
      nullif(coalesce(NEW.verifier_note, ''), ''),
      case when NEW.status = 'revisi' then '/logbook/' || NEW.id || '/edit'
           else '/logbook' end,
      NEW.id, NEW.program_id
    );
  end if;

  return NEW;
end $$;

-- ---- notifikasi: academic_works ------------------------------------
create or replace function notify_academic_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text;
begin
  select full_name into v_resident from profiles where id = NEW.resident_id;

  if NEW.status = 'diajukan'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'diajukan')
     and NEW.pembimbing_id is not null then
    insert into notifications (user_id, type, title, body, link, program_id)
    values (NEW.pembimbing_id, 'karya_baru', 'Karya ilmiah menunggu verifikasi',
            coalesce(v_resident, 'Residen') || ' — ' || NEW.judul, '/verifikasi', NEW.program_id);
  end if;

  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status
     and NEW.status in ('diverifikasi', 'revisi', 'ditolak') then
    insert into notifications (user_id, type, title, body, link, program_id)
    values (NEW.resident_id, 'karya_' || NEW.status,
      case NEW.status
        when 'diverifikasi' then 'Karya ilmiah diverifikasi'
        when 'revisi' then 'Karya ilmiah diminta revisi'
        else 'Karya ilmiah ditolak' end,
      NEW.judul || coalesce(' · ' || nullif(NEW.verifier_note, ''), ''),
      '/karya', NEW.program_id);
  end if;
  return NEW;
end $$;

-- =====================================================================
-- 10. RLS — tulis ulang berbasis peran + program
--     KPS dipersempit ke programnya; super-admin lintas program.
--     DPJP tetap lewat supervisor_id (lintas program otomatis).
--     Penguji tetap program-agnostic (lewat relasi penilaian).
-- =====================================================================

-- --- programs: semua login boleh baca; tulis hanya super-admin ------
drop policy if exists "program_baca" on programs;
create policy "program_baca" on programs for select to authenticated using (true);
drop policy if exists "program_kelola_admin" on programs;
create policy "program_kelola_admin" on programs for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- --- Kurikulum: baca anggota program + lintas-program (DPJP/penguji)
--     + super-admin; tulis hanya super-admin (seed) / KPS programnya. --
do $$
declare t text;
begin
  foreach t in array array[
    'diseases','procedures','clinical_competencies',
    'clinical_competency_subtargets','knowledge_items'
  ] loop
    execute format('drop policy if exists "ref_read" on %I;', t);
    execute format('drop policy if exists "ref_write" on %I;', t);
    -- Baca: residen/KPS dibatasi ke programnya; DPJP/penguji/admin lintas program.
    execute format($f$
      create policy "kurikulum_baca" on %I for select to authenticated
      using (
        program_id = current_program()
        or is_super_admin()
        or current_role_name() in ('supervisor','penguji')
      );
    $f$, t);
    -- Tulis: super-admin (seed) atau KPS dari program tsb.
    execute format($f$
      create policy "kurikulum_tulis" on %I for all to authenticated
      using (is_super_admin() or is_kps_of(program_id))
      with check (is_super_admin() or is_kps_of(program_id));
    $f$, t);
  end loop;
end $$;

-- institutions & procedure_clinical_map tetap referensi shared (tanpa program_id).
-- (Kebijakan ref_read/ref_write lamanya tetap berlaku.)

-- --- residents ------------------------------------------------------
drop policy if exists "residen_baca" on residents;
create policy "residen_baca" on residents for select to authenticated
  using (
    id = auth.uid()
    or is_super_admin()
    or is_kps_of(program_id)
    or is_supervisor_of(id)
  );
drop policy if exists "residen_kelola_staf" on residents;
create policy "residen_kelola_staf" on residents for all to authenticated
  using (is_super_admin() or is_kps_of(program_id))
  with check (is_super_admin() or is_kps_of(program_id));

-- --- log_entries ----------------------------------------------------
drop policy if exists "entri_baca" on log_entries;
create policy "entri_baca" on log_entries for select to authenticated
  using (
    resident_id = auth.uid()
    or supervisor_id = auth.uid()
    or is_kps_of(program_id)
    or is_super_admin()
  );

drop policy if exists "entri_insert_sendiri" on log_entries;
create policy "entri_insert_sendiri" on log_entries for insert to authenticated
  with check (
    resident_id = auth.uid()
    and current_role_name() = 'residen'
    and program_id = current_program()
  );

drop policy if exists "entri_staf" on log_entries;
create policy "entri_staf" on log_entries for all to authenticated
  using (is_super_admin() or is_kps_of(program_id))
  with check (is_super_admin() or is_kps_of(program_id));
-- entri_update_sendiri, entri_hapus_sendiri, entri_verifikasi_supervisor: tetap.

-- --- entry_reviews --------------------------------------------------
drop policy if exists "review_baca" on entry_reviews;
create policy "review_baca" on entry_reviews for select to authenticated
  using (exists (
    select 1 from log_entries e where e.id = entry_id
      and (e.resident_id = auth.uid()
           or e.supervisor_id = auth.uid()
           or is_kps_of(e.program_id)
           or is_super_admin())
  ));

-- --- assessments ----------------------------------------------------
drop policy if exists "nilai_baca" on assessments;
create policy "nilai_baca" on assessments for select to authenticated
  using (
    resident_id = auth.uid()
    or is_supervisor_of(resident_id)
    or current_role_name() = 'penguji'
    or is_kps_of(program_id)
    or is_super_admin()
  );
drop policy if exists "nilai_kelola_penguji" on assessments;
create policy "nilai_kelola_penguji" on assessments for all to authenticated
  using (current_role_name() = 'penguji' or is_kps_of(program_id) or is_super_admin())
  with check (current_role_name() = 'penguji' or is_kps_of(program_id) or is_super_admin());

-- --- audit_log ------------------------------------------------------
drop policy if exists "audit_baca_staf" on audit_log;
create policy "audit_baca_staf" on audit_log for select to authenticated
  using (is_super_admin() or (program_id is not null and is_kps_of(program_id)));

-- --- academic_works -------------------------------------------------
drop policy if exists "karya_baca" on academic_works;
create policy "karya_baca" on academic_works for select to authenticated
  using (
    resident_id = auth.uid()
    or pembimbing_id = auth.uid()
    or is_kps_of(program_id)
    or is_super_admin()
  );
drop policy if exists "karya_insert_sendiri" on academic_works;
create policy "karya_insert_sendiri" on academic_works for insert to authenticated
  with check (
    resident_id = auth.uid()
    and current_role_name() = 'residen'
    and program_id = current_program()
  );
drop policy if exists "karya_staf" on academic_works;
create policy "karya_staf" on academic_works for all to authenticated
  using (is_super_admin() or is_kps_of(program_id))
  with check (is_super_admin() or is_kps_of(program_id));
-- karya_update_sendiri, karya_hapus_sendiri, karya_verifikasi_pembimbing: tetap.

-- =====================================================================
-- 11. VIEWS agregasi — PROGRAM-AWARE
--     Residen dihitung HANYA terhadap kurikulum programnya sendiri
--     (join program_id), bukan cross-join seluruh kurikulum.
-- =====================================================================

-- --- Progress prosedur ----------------------------------------------
create or replace view v_procedure_progress as
with q as (
  select
    r.id as resident_id,
    p.id as procedure_id, p.kode, p.nama, p.target_min, p.peran_dihitung,
    e.status, e.surgical_role, e.id as entry_id
  from residents r
  join procedures p on p.program_id = r.program_id
  left join log_entries e
    on e.resident_id = r.id and e.procedure_id = p.id and e.entry_type = 'prosedur'
)
select
  resident_id, procedure_id, kode, nama, target_min,
  count(entry_id) filter (
    where status = 'diverifikasi'
      and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
  ) as jumlah_terverifikasi,
  count(entry_id) filter (where status = 'diajukan') as jumlah_menunggu,
  least(round(
    count(entry_id) filter (
      where status = 'diverifikasi'
        and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
    )::numeric / nullif(target_min, 0) * 100, 1), 100) as persen,
  (count(entry_id) filter (
      where status = 'diverifikasi'
        and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
   ) >= target_min) as tercapai
from q
group by resident_id, procedure_id, kode, nama, target_min;
alter view v_procedure_progress set (security_invoker = on);

-- --- Progress penatalaksanaan ---------------------------------------
create or replace view v_clinical_progress as
with kontribusi as (
  select e.resident_id, e.clinical_competency_id as competency_id
  from log_entries e
  where e.entry_type = 'penatalaksanaan' and e.status = 'diverifikasi'
  union all
  select e.resident_id, m.clinical_competency_id
  from log_entries e
  join procedure_clinical_map m on m.procedure_id = e.procedure_id
  where e.entry_type = 'prosedur' and e.status = 'diverifikasi'
)
select
  r.id                          as resident_id,
  c.id                          as competency_id,
  c.kode,
  c.komponen,
  c.target_min,
  count(k.*)                    as jumlah_terverifikasi,
  least(round(count(k.*)::numeric / nullif(c.target_min,0) * 100, 1), 100) as persen,
  (count(k.*) >= c.target_min)  as tercapai
from residents r
join clinical_competencies c on c.program_id = r.program_id
left join kontribusi k on k.resident_id = r.id and k.competency_id = c.id
group by r.id, c.id;
alter view v_clinical_progress set (security_invoker = on);

-- --- Progress pengetahuan -------------------------------------------
create or replace view v_knowledge_progress as
select
  r.id                                  as resident_id,
  ki.id                                 as knowledge_item_id,
  ki.kode,
  ki.topik,
  ki.kategori,
  max(a.persen) filter (where a.exam_type = 'osce') as nilai_osce,
  max(a.persen) filter (where a.exam_type = 'mcq')  as nilai_mcq,
  ki.osce_min,
  ki.mcq_min,
  (coalesce(max(a.persen) filter (where a.exam_type='osce'),0) >= ki.osce_min
   and coalesce(max(a.persen) filter (where a.exam_type='mcq'),0) >= ki.mcq_min) as lulus
from residents r
join knowledge_items ki on ki.program_id = r.program_id
left join assessments a on a.resident_id = r.id and a.knowledge_item_id = ki.id
group by r.id, ki.id;
alter view v_knowledge_progress set (security_invoker = on);

-- --- Cakupan spektrum penyakit --------------------------------------
create or replace view v_disease_coverage as
select
  r.id                       as resident_id,
  d.id                       as disease_id,
  d.no,
  d.nama_id,
  count(e.id) filter (where e.status = 'diverifikasi') as jumlah,
  (count(e.id) filter (where e.status = 'diverifikasi') > 0) as pernah_ditangani
from residents r
join diseases d on d.program_id = r.program_id
left join log_entries e on e.resident_id = r.id and e.disease_id = d.id
group by r.id, d.id;
alter view v_disease_coverage set (security_invoker = on);

-- --- Progress sub-target (PK-09: MDT, breaking bad news) -------------
create or replace view v_subtarget_progress as
select
  r.id                          as resident_id,
  st.id                         as subtarget_id,
  c.kode                        as competency_kode,
  st.nama,
  st.kode                       as subtarget_kode,
  st.target_min,
  count(e.id) filter (where e.status = 'diverifikasi') as jumlah_terverifikasi,
  least(round(
    count(e.id) filter (where e.status = 'diverifikasi')::numeric
    / nullif(st.target_min, 0) * 100, 1), 100)         as persen,
  (count(e.id) filter (where e.status = 'diverifikasi') >= st.target_min) as tercapai
from residents r
join clinical_competency_subtargets st on st.program_id = r.program_id
join clinical_competencies c on c.id = st.competency_id
left join log_entries e
  on e.resident_id = r.id
  and e.entry_type = 'penatalaksanaan'
  and e.dokumentasi_jenis::text = st.kode
group by r.id, st.id, c.kode;
alter view v_subtarget_progress set (security_invoker = on);

-- --- Ringkasan kelulusan per residen (total = kurikulum programnya) --
create or replace view v_resident_summary as
select
  r.id as resident_id,
  (select count(*) from v_procedure_progress vp where vp.resident_id = r.id and vp.tercapai)  as prosedur_tercapai,
  (select count(*) from procedures p where p.program_id = r.program_id)                         as prosedur_total,
  (select count(*) from v_clinical_progress vc where vc.resident_id = r.id and vc.tercapai)    as penatalaksanaan_tercapai,
  (select count(*) from clinical_competencies c where c.program_id = r.program_id)              as penatalaksanaan_total,
  (select count(*) from v_knowledge_progress vk where vk.resident_id = r.id and vk.lulus)      as pengetahuan_lulus,
  (select count(*) from knowledge_items ki where ki.program_id = r.program_id)                  as pengetahuan_total,
  (select count(*) from v_disease_coverage vd where vd.resident_id = r.id and vd.pernah_ditangani) as penyakit_tercakup,
  (select count(*) from diseases d where d.program_id = r.program_id)                           as penyakit_total
from residents r;
alter view v_resident_summary set (security_invoker = on);

commit;
