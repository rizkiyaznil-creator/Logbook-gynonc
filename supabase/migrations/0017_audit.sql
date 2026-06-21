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
