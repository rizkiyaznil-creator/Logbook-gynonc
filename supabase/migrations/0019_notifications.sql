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
