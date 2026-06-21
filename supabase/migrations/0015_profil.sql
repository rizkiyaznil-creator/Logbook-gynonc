-- =====================================================================
-- 0015_profil.sql — Kolom data lengkap profil + izin & proteksi
-- =====================================================================

-- Kolom tambahan profil (umum & staf).
alter table profiles add column no_telp  text;
alter table profiles add column nip      text;   -- NIP/NIDN (staf)
alter table profiles add column jabatan  text;   -- jabatan/gelar konsultan
alter table profiles add column institusi text;  -- divisi & institusi

-- Residen boleh menyunting baris residents miliknya sendiri.
create policy "residen_ubah_sendiri" on residents for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Proteksi: cegah pengguna mengubah PERAN dirinya sendiri lewat form profil.
-- Hanya kps/admin (sesi login) yang boleh mengubah role.
create or replace function protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_role_name() in ('kps','admin'), false) = false then
    new.role := old.role;  -- abaikan perubahan role
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_role on profiles;
create trigger trg_protect_role before update on profiles
  for each row execute function protect_profile_role();
