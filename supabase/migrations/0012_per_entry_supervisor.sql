-- =====================================================================
-- 0012_per_entry_supervisor.sql — DPJP penanggung jawab per ENTRI
-- Tiap entri memilih DPJP-nya sendiri. Konsep penugasan resident<->DPJP
-- (supervisor_assignments) dihapus; relasi DPJP murni per-entri.
-- =====================================================================

-- 1) Kolom DPJP penanggung jawab pada entri.
alter table log_entries
  add column supervisor_id uuid references profiles(id);
create index on log_entries (supervisor_id);

-- 2) Redefinisi is_supervisor_of: DPJP "membimbing" residen bila punya
--    minimal satu entri dengan residen tsb. (SECURITY DEFINER -> bypass RLS,
--    tidak menimbulkan rekursi pada kebijakan log_entries.)
create or replace function is_supervisor_of(p_resident uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from log_entries e
    where e.resident_id = p_resident
      and e.supervisor_id = auth.uid()
  );
$$;

-- 3) Kebijakan akses entri untuk DPJP -> berdasarkan supervisor_id entri.
drop policy if exists "entri_baca" on log_entries;
create policy "entri_baca" on log_entries for select to authenticated
  using (resident_id = auth.uid() or is_staff() or supervisor_id = auth.uid());

drop policy if exists "entri_verifikasi_supervisor" on log_entries;
create policy "entri_verifikasi_supervisor" on log_entries for update to authenticated
  using (supervisor_id = auth.uid()) with check (supervisor_id = auth.uid());

-- 4) Residen perlu membaca daftar nama DPJP (untuk dropdown pemilihan).
create policy "profil_baca_supervisor" on profiles for select to authenticated
  using (role = 'supervisor');

-- 5) Hapus konsep penugasan (tabel + kebijakannya).
drop table if exists supervisor_assignments cascade;
