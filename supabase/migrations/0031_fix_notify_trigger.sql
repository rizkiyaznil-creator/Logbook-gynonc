-- =====================================================================
-- 0031_fix_notify_trigger.sql — Pastikan notifikasi in-app terbuat
--
-- Insiden: di DB produksi, fungsi `notify_entry_status` sempat berada pada
-- versi lama yang TIDAK melakukan INSERT ke `notifications`, sehingga saat
-- residen mengajukan entri, DPJP tidak menerima notifikasi lonceng (badge 0,
-- tabel notifications kosong) meski trigger `trg_notify_entry` terpasang & aktif.
--
-- Migrasi ini memasang ULANG fungsi versi benar (identik 0023) + trigger-nya,
-- agar konsisten dengan kode aplikasi dan tahan terhadap drift. Idempoten.
-- =====================================================================

create or replace function notify_entry_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_resident text;
begin
  select full_name into v_resident from profiles where id = NEW.resident_id;

  -- Entri diajukan → beri tahu DPJP penanggung jawab.
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

  -- Keputusan verifikasi → beri tahu residen.
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

drop trigger if exists trg_notify_entry on log_entries;
create trigger trg_notify_entry
  after insert or update on log_entries
  for each row execute function notify_entry_status();
