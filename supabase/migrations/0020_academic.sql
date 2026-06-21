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
