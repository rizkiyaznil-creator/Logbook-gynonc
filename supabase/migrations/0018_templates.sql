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
