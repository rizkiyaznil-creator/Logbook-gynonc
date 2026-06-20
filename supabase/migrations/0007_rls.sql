-- =====================================================================
-- 0007_rls.sql — Row Level Security & kebijakan akses per peran
-- =====================================================================

-- --- Fungsi bantu --------------------------------------------------
create or replace function current_role_name()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()   -- kps/admin: akses penuh baca
returns boolean language sql stable as $$
  select current_role_name() in ('kps','admin');
$$;

create or replace function is_supervisor_of(p_resident uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from supervisor_assignments sa
    where sa.resident_id = p_resident
      and sa.supervisor_id = auth.uid()
      and sa.selesai is null
  );
$$;

-- Pastikan view menerapkan RLS milik tabel dasar (PG15+).
alter view v_procedure_progress set (security_invoker = on);
alter view v_clinical_progress  set (security_invoker = on);
alter view v_knowledge_progress set (security_invoker = on);
alter view v_disease_coverage   set (security_invoker = on);
alter view v_resident_summary   set (security_invoker = on);

-- --- Aktifkan RLS --------------------------------------------------
alter table profiles               enable row level security;
alter table residents              enable row level security;
alter table supervisor_assignments enable row level security;
alter table log_entries            enable row level security;
alter table entry_reviews          enable row level security;
alter table assessments            enable row level security;
alter table institutions           enable row level security;
alter table diseases               enable row level security;
alter table procedures             enable row level security;
alter table clinical_competencies  enable row level security;
alter table clinical_competency_subtargets enable row level security;
alter table knowledge_items        enable row level security;
alter table procedure_clinical_map enable row level security;

-- --- Tabel referensi: semua pengguna login boleh baca; tulis = staf -
do $$
declare t text;
begin
  foreach t in array array[
    'institutions','diseases','procedures','clinical_competencies',
    'clinical_competency_subtargets','knowledge_items','procedure_clinical_map'
  ] loop
    execute format('create policy "ref_read" on %I for select to authenticated using (true);', t);
    execute format('create policy "ref_write" on %I for all to authenticated using (is_staff()) with check (is_staff());', t);
  end loop;
end $$;

-- --- profiles ------------------------------------------------------
create policy "profil_baca_sendiri_atau_staf" on profiles for select to authenticated
  using (id = auth.uid() or is_staff()
         or (current_role_name() = 'supervisor'));   -- supervisor lihat nama residen
create policy "profil_ubah_sendiri" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profil_kelola_staf" on profiles for all to authenticated
  using (is_staff()) with check (is_staff());

-- --- residents -----------------------------------------------------
create policy "residen_baca" on residents for select to authenticated
  using (id = auth.uid() or is_staff() or is_supervisor_of(id));
create policy "residen_kelola_staf" on residents for all to authenticated
  using (is_staff()) with check (is_staff());

-- --- supervisor_assignments ---------------------------------------
create policy "penugasan_baca" on supervisor_assignments for select to authenticated
  using (supervisor_id = auth.uid() or resident_id = auth.uid() or is_staff());
create policy "penugasan_kelola_staf" on supervisor_assignments for all to authenticated
  using (is_staff()) with check (is_staff());

-- --- log_entries ---------------------------------------------------
-- Residen: kelola entri MILIK SENDIRI (hanya boleh ubah saat draft/revisi).
create policy "entri_baca" on log_entries for select to authenticated
  using (resident_id = auth.uid() or is_staff() or is_supervisor_of(resident_id));
create policy "entri_insert_sendiri" on log_entries for insert to authenticated
  with check (resident_id = auth.uid() and current_role_name() = 'residen');
create policy "entri_update_sendiri" on log_entries for update to authenticated
  using (resident_id = auth.uid() and status in ('draft','revisi'))
  with check (resident_id = auth.uid());
create policy "entri_hapus_sendiri" on log_entries for delete to authenticated
  using (resident_id = auth.uid() and status in ('draft','revisi'));
-- Supervisor: verifikasi (update status) entri residen bimbingannya.
create policy "entri_verifikasi_supervisor" on log_entries for update to authenticated
  using (is_supervisor_of(resident_id)) with check (is_supervisor_of(resident_id));
create policy "entri_staf" on log_entries for all to authenticated
  using (is_staff()) with check (is_staff());

-- --- entry_reviews (jejak audit) ----------------------------------
create policy "review_baca" on entry_reviews for select to authenticated
  using (exists (select 1 from log_entries e where e.id = entry_id
         and (e.resident_id = auth.uid() or is_staff() or is_supervisor_of(e.resident_id))));
create policy "review_tulis_verifikator" on entry_reviews for insert to authenticated
  with check (reviewer_id = auth.uid());

-- --- assessments ---------------------------------------------------
create policy "nilai_baca" on assessments for select to authenticated
  using (resident_id = auth.uid() or is_staff() or is_supervisor_of(resident_id));
create policy "nilai_kelola_penguji" on assessments for all to authenticated
  using (current_role_name() in ('penguji','kps','admin'))
  with check (current_role_name() in ('penguji','kps','admin'));
