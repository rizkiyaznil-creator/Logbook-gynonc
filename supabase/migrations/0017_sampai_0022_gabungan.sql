-- =====================================================================
-- 0017_sampai_0022_gabungan.sql
-- Gabungan migrasi 0017–0022 untuk dijalankan sekali di Supabase SQL Editor.
-- Audit log, Template entri, Notifikasi, Karya & Kegiatan Ilmiah,
-- Publikasi & Presentasi, serta Pembimbing-2/Penguji/Co-author.
-- Aman pada database yang BELUM memiliki fitur-fitur ini.
-- (Jika sebagian sudah dijalankan, jalankan file aslinya satu per satu.)
-- =====================================================================


-- #####################################################################
-- ## 0017_audit.sql
-- #####################################################################
-- =====================================================================
-- 0017_audit.sql — Audit log (siapa mengubah/memverifikasi/menghapus apa)
-- =====================================================================

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,                 -- pelaku (auth.uid)
  actor_name text,                 -- nama pelaku saat aksi
  action     text not null,        -- entri_dibuat, entri_diverifikasi, dst
  entity     text not null,        -- 'log_entries' | 'profiles'
  entity_id  uuid,
  summary    text,                 -- ringkasan terbaca manusia
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_action_idx on audit_log (action);

alter table audit_log enable row level security;

-- Hanya kps/admin yang boleh membaca audit. Tidak ada policy INSERT:
-- pencatatan hanya lewat trigger SECURITY DEFINER di bawah.
create policy "audit_baca_staf" on audit_log for select to authenticated
  using (is_staff());

-- Nama pelaku (bypass RLS via definer).
create or replace function actor_name()
returns text language sql stable security definer set search_path = public as $$
  select full_name from profiles where id = auth.uid()
$$;

-- ---- Trigger: aktivitas pada log_entries ----------------------------
create or replace function audit_log_entries()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_summary text;
  v_resident text;
  v_id uuid;
  v_rid uuid;
  v_type text;
begin
  if (TG_OP = 'DELETE') then
    v_rid := OLD.resident_id; v_id := OLD.id; v_type := OLD.entry_type::text;
  else
    v_rid := NEW.resident_id; v_id := NEW.id; v_type := NEW.entry_type::text;
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
      v_action := 'entri_' || NEW.status;   -- entri_diverifikasi / entri_ditolak / dst
      v_summary := 'Status ' || OLD.status || ' → ' || NEW.status ||
        case when coalesce(NEW.verifier_note, '') <> ''
             then ' · catatan: ' || NEW.verifier_note else '' end;
    else
      return NEW;  -- perubahan non-status diabaikan (kurangi noise)
    end if;
  end if;

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary, meta)
  values (
    auth.uid(), actor_name(), v_action, 'log_entries', v_id,
    coalesce(v_resident || ' — ', '') || v_summary,
    jsonb_build_object('resident_id', v_rid, 'entry_type', v_type)
  );

  if (TG_OP = 'DELETE') then return OLD; end if;
  return NEW;
end $$;

create trigger trg_audit_entries
  after insert or update or delete on log_entries
  for each row execute function audit_log_entries();

-- ---- Trigger: perubahan peran / status aktif pada profiles ----------
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

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary)
  values (auth.uid(), actor_name(), v_action, 'profiles', NEW.id, v_summary);
  return NEW;
end $$;

create trigger trg_audit_profiles
  after update on profiles
  for each row execute function audit_profiles();


-- #####################################################################
-- ## 0018_templates.sql
-- #####################################################################
-- =====================================================================
-- 0018_templates.sql — Template entri cepat (milik tiap residen)
-- =====================================================================

create table entry_templates (
  id           uuid primary key default gen_random_uuid(),
  resident_id  uuid not null references profiles(id) on delete cascade,
  nama         text not null,
  entry_type   entry_type not null,

  procedure_id           uuid references procedures(id) on delete set null,
  clinical_competency_id uuid references clinical_competencies(id) on delete set null,
  disease_id             uuid references diseases(id) on delete set null,
  supervisor_id          uuid references profiles(id) on delete set null,

  rumah_sakit       text,
  setting           text,
  surgical_role     surgical_role,
  supervision_level supervision_level,
  dokumentasi_jenis dokumentasi_jenis,
  figo_stage        text,

  created_at timestamptz not null default now()
);
create index entry_templates_owner_idx on entry_templates (resident_id);

alter table entry_templates enable row level security;

-- Residen hanya mengelola template miliknya sendiri.
create policy "template_kelola_sendiri" on entry_templates for all to authenticated
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());


-- #####################################################################
-- ## 0019_notifications.sql
-- #####################################################################
-- =====================================================================
-- 0019_notifications.sql — Pusat notifikasi (alur verifikasi)
-- =====================================================================

create table notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade, -- penerima
  type       text not null,    -- entri_baru, entri_diverifikasi, entri_revisi, entri_ditolak
  title      text not null,
  body       text,
  link       text,
  entry_id   uuid,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

-- Penerima hanya membaca & menandai-baca notifikasinya sendiri.
create policy "notif_baca_sendiri" on notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notif_update_sendiri" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Tidak ada policy INSERT: pembuatan hanya lewat trigger SECURITY DEFINER.

-- Trigger: buat notifikasi saat status entri berubah.
create or replace function notify_entry_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text;
begin
  select full_name into v_resident from profiles where id = NEW.resident_id;

  -- Entri diajukan → beri tahu DPJP penanggung jawab.
  if NEW.status = 'diajukan'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'diajukan')
     and NEW.supervisor_id is not null then
    insert into notifications (user_id, type, title, body, link, entry_id)
    values (
      NEW.supervisor_id, 'entri_baru', 'Entri baru menunggu verifikasi',
      coalesce(v_resident, 'Residen') || ' mengajukan satu entri.',
      '/verifikasi', NEW.id
    );
  end if;

  -- Keputusan verifikasi → beri tahu residen.
  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status
     and NEW.status in ('diverifikasi', 'revisi', 'ditolak') then
    insert into notifications (user_id, type, title, body, link, entry_id)
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
      NEW.id
    );
  end if;

  return NEW;
end $$;

create trigger trg_notify_entry
  after insert or update on log_entries
  for each row execute function notify_entry_status();


-- #####################################################################
-- ## 0020_academic.sql
-- #####################################################################
-- =====================================================================
-- 0020_academic.sql — Karya & kegiatan ilmiah (sari pustaka, telaah jurnal,
-- laporan kasus) + tesis bertahap. Verifikasi oleh pembimbing.
-- =====================================================================

create type academic_jenis as enum (
  'sari_pustaka', 'telaah_jurnal', 'laporan_kasus', 'tesis'
);
create type thesis_tahap as enum (
  'proposal', 'kaji_etik', 'pengumpulan_data', 'seminar_hasil', 'sidang'
);

create table academic_works (
  id            uuid primary key default gen_random_uuid(),
  resident_id   uuid not null references profiles(id) on delete cascade,
  jenis         academic_jenis not null,
  tahap         thesis_tahap,                 -- hanya untuk jenis 'tesis'
  judul         text not null,
  tanggal       date,
  pembimbing_id uuid references profiles(id),
  evidence_url  text,
  catatan       text,

  status        entry_status not null default 'draft',
  submitted_at  timestamptz,
  verified_by   uuid references profiles(id),
  verified_at   timestamptz,
  verifier_note text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index academic_works_owner_idx on academic_works (resident_id);
create index academic_works_pemb_idx on academic_works (pembimbing_id);

alter table academic_works enable row level security;

create policy "karya_baca" on academic_works for select to authenticated
  using (resident_id = auth.uid() or is_staff() or pembimbing_id = auth.uid());
create policy "karya_insert_sendiri" on academic_works for insert to authenticated
  with check (resident_id = auth.uid() and current_role_name() = 'residen');
create policy "karya_update_sendiri" on academic_works for update to authenticated
  using (resident_id = auth.uid() and status in ('draft', 'revisi'))
  with check (resident_id = auth.uid());
create policy "karya_hapus_sendiri" on academic_works for delete to authenticated
  using (resident_id = auth.uid() and status in ('draft', 'revisi'));
create policy "karya_verifikasi_pembimbing" on academic_works for update to authenticated
  using (pembimbing_id = auth.uid()) with check (pembimbing_id = auth.uid());
create policy "karya_staf" on academic_works for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---- Notifikasi ----------------------------------------------------
create or replace function notify_academic_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text;
begin
  select full_name into v_resident from profiles where id = NEW.resident_id;

  if NEW.status = 'diajukan'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'diajukan')
     and NEW.pembimbing_id is not null then
    insert into notifications (user_id, type, title, body, link)
    values (NEW.pembimbing_id, 'karya_baru', 'Karya ilmiah menunggu verifikasi',
            coalesce(v_resident, 'Residen') || ' — ' || NEW.judul, '/verifikasi');
  end if;

  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status
     and NEW.status in ('diverifikasi', 'revisi', 'ditolak') then
    insert into notifications (user_id, type, title, body, link)
    values (NEW.resident_id, 'karya_' || NEW.status,
      case NEW.status
        when 'diverifikasi' then 'Karya ilmiah diverifikasi'
        when 'revisi' then 'Karya ilmiah diminta revisi'
        else 'Karya ilmiah ditolak' end,
      NEW.judul || coalesce(' · ' || nullif(NEW.verifier_note, ''), ''),
      '/karya');
  end if;
  return NEW;
end $$;

create trigger trg_notify_academic
  after insert or update on academic_works
  for each row execute function notify_academic_status();

-- ---- Audit ---------------------------------------------------------
create or replace function audit_academic()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text; v_action text; v_summary text;
        v_id uuid; v_rid uuid; v_judul text; v_jenis text;
begin
  if TG_OP = 'DELETE' then
    v_rid := OLD.resident_id; v_id := OLD.id; v_judul := OLD.judul; v_jenis := OLD.jenis::text;
  else
    v_rid := NEW.resident_id; v_id := NEW.id; v_judul := NEW.judul; v_jenis := NEW.jenis::text;
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

  insert into audit_log (actor_id, actor_name, action, entity, entity_id, summary)
  values (auth.uid(), actor_name(), v_action, 'academic_works', v_id,
    coalesce(v_resident || ' — ', '') || v_jenis || ': ' || coalesce(v_judul, '') || ' — ' || v_summary);

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;

create trigger trg_audit_academic
  after insert or update or delete on academic_works
  for each row execute function audit_academic();


-- #####################################################################
-- ## 0021_academic_publikasi.sql
-- #####################################################################
-- =====================================================================
-- 0021_academic_publikasi.sql — Publikasi & presentasi karya ilmiah
-- (event nasional/internasional). Memperluas academic_works.
-- =====================================================================

-- Jenis baru. (ADD VALUE aman: nilai baru tidak dipakai di DDL berikut.)
alter type academic_jenis add value if not exists 'publikasi';
alter type academic_jenis add value if not exists 'presentasi';

create type academic_tingkat as enum ('nasional', 'internasional');
create type presentasi_bentuk as enum ('oral', 'poster');

alter table academic_works
  add column if not exists tingkat  academic_tingkat,
  add column if not exists penerbit text,              -- nama jurnal/prosiding atau nama event
  add column if not exists bentuk   presentasi_bentuk; -- khusus presentasi: oral/poster


-- #####################################################################
-- ## 0022_academic_authors.sql
-- #####################################################################
-- =====================================================================
-- 0022_academic_authors.sql — Pembimbing kedua & penguji tesis,
-- serta daftar co-author publikasi/presentasi.
-- Pembimbing utama (pembimbing_id) tetap menjadi verifikator.
-- =====================================================================

alter table academic_works
  add column if not exists pembimbing2 text,  -- nama pembimbing kedua (tesis)
  add column if not exists penguji     text,  -- daftar nama penguji 3-5 (tesis), satu per baris
  add column if not exists co_authors  jsonb; -- [{nama, korespondensi}] untuk publikasi/presentasi

