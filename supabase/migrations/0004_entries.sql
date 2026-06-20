-- =====================================================================
-- 0004_entries.sql — Entri logbook, pemetaan auto-agregasi, audit
-- =====================================================================

-- --- Entri logbook (satu aktivitas klinis yang dicatat residen) -----
create table log_entries (
  id            uuid primary key default gen_random_uuid(),
  resident_id   uuid not null references residents(id) on delete cascade,
  entry_type    entry_type not null,
  entry_date    date not null,

  -- Tautan kompetensi (diisi sesuai entry_type):
  procedure_id           uuid references procedures(id),            -- jika 'prosedur'
  clinical_competency_id uuid references clinical_competencies(id), -- jika 'penatalaksanaan'
  disease_id             uuid references diseases(id),              -- cakupan penyakit (semua tipe)

  -- Data pasien (ANONIM/tersamar — tanpa identitas langsung):
  patient_code  text,            -- kode internal/tersamar
  patient_age   int,
  figo_stage    text,
  setting       text,            -- poliklinik | bangsal | OK | IGD | dst

  -- Khusus prosedur:
  surgical_role     surgical_role,
  supervision_level supervision_level,
  complications     text,

  -- Catatan & bukti:
  catatan       text,
  evidence_url  text,            -- tautan berkas bukti tersensor (Supabase Storage)

  -- Alur verifikasi:
  status        entry_status not null default 'draft',
  submitted_at  timestamptz,
  verified_by   uuid references profiles(id),
  verified_at   timestamptz,
  verifier_note text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Integritas: tipe entri harus konsisten dgn tautan kompetensinya
  constraint chk_entry_link check (
    (entry_type = 'prosedur'        and procedure_id is not null) or
    (entry_type = 'penatalaksanaan' and clinical_competency_id is not null) or
    (entry_type = 'kasus')
  )
);
create trigger trg_entries_updated before update on log_entries
  for each row execute function set_updated_at();

create index on log_entries (resident_id, status);
create index on log_entries (procedure_id);
create index on log_entries (clinical_competency_id);
create index on log_entries (disease_id);
create index on log_entries (verified_by);

-- --- Pemetaan auto-agregasi prosedur -> kompetensi penatalaksanaan --
-- Satu prosedur dapat menyumbang ke beberapa kompetensi penatalaksanaan
-- (mis. setiap kasus dikelola juga menambah PK-09 Dokumentasi).
-- Tabel ini DIISI bersama berdasarkan masukan klinis (lihat docs).
create table procedure_clinical_map (
  procedure_id           uuid not null references procedures(id) on delete cascade,
  clinical_competency_id uuid not null references clinical_competencies(id) on delete cascade,
  primary key (procedure_id, clinical_competency_id)
);

-- --- Jejak audit perubahan status (riwayat verifikasi) --------------
create table entry_reviews (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references log_entries(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  status_lama entry_status,
  status_baru entry_status not null,
  catatan     text,
  created_at  timestamptz not null default now()
);
create index on entry_reviews (entry_id);
