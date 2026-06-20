-- =====================================================================
-- 0002_reference.sql — Tabel referensi (seed dari Kepkonsil 2026)
-- Sumber data: data/*.json
-- =====================================================================

-- --- Tabel 10: Spektrum penyakit ------------------------------------
create table diseases (
  id          uuid primary key default gen_random_uuid(),
  no          int unique not null,
  nama_id     text not null,
  nama_en     text,
  icd10       text,
  icd11       text,
  kelompok    text,                  -- kanker | sarkoma | pra-kanker | dst
  aktif       boolean not null default true
);

-- --- Tabel 18: Kompetensi penatalaksanaan klinis --------------------
create table clinical_competencies (
  id              uuid primary key default gen_random_uuid(),
  kode            text unique not null,     -- PK-01 .. PK-09
  no              int unique not null,
  komponen        text not null,
  penjabaran      text,
  kriteria_kinerja text,
  target_min      int not null,
  satuan          text,
  perlu_verifikasi boolean not null default false
);

-- Sub-target (mis. PK-09: >=20 MDT, >=10 breaking bad news)
create table clinical_competency_subtargets (
  id            uuid primary key default gen_random_uuid(),
  competency_id uuid not null references clinical_competencies(id) on delete cascade,
  nama          text not null,
  target_min    int not null
);

-- --- Tabel 24: Kompetensi prosedur klinis --------------------------
create table procedures (
  id               uuid primary key default gen_random_uuid(),
  kode             text unique not null,    -- PR-01 .. PR-57
  no               int unique not null,
  nama             text not null,
  target_min       int not null,
  satuan           text,
  peran_disyaratkan text,                    -- teks asli dari standar
  -- peran yang DIHITUNG ke target (untuk auto-agregasi). Default: operator & ko-op.
  peran_dihitung   surgical_role[] not null default '{operator_utama,ko_operator}',
  syarat_tambahan  text,                     -- mis. ">=2 melibatkan para-aorta"
  perlu_verifikasi boolean not null default false
);

-- --- Tabel 30 & 36: Penguasaan pengetahuan -------------------------
create table knowledge_items (
  id            uuid primary key default gen_random_uuid(),
  kode          text unique not null,        -- KP-01.. (penatalaksanaan), KPR-01.. (prosedur)
  topik         text not null,
  kategori      knowledge_category not null,
  -- tautan opsional ke prosedur terkait (untuk butir pengetahuan prosedur)
  procedure_id  uuid references procedures(id) on delete set null,
  osce_min      int not null default 70,
  mcq_min       int not null default 70
);

create index on knowledge_items (kategori);
create index on diseases (kelompok);
