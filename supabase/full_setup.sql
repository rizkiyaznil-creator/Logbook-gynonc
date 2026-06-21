-- full_setup.sql (auto-generated)

-- >>>>>>>>>> 0001_init.sql <<<<<<<<<<
-- =====================================================================
-- 0001_init.sql — Ekstensi, tipe enum, dan fungsi bantu
-- Logbook Interaktif PPDS Subspesialis Onkologi Ginekologi
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- email case-insensitive

-- --- Peran pengguna -------------------------------------------------
create type user_role as enum (
  'residen',      -- PPDS subspesialis (peserta didik)
  'supervisor',   -- Konsulen / DPJP pembimbing & verifikator
  'kps',          -- Ketua Program Studi / admin prodi
  'penguji',      -- Penguji OSCE / MCQ
  'admin'         -- Administrator sistem
);

-- --- Jenis entri logbook --------------------------------------------
create type entry_type as enum (
  'prosedur',            -- tindakan/operasi (Tabel 24)
  'penatalaksanaan',     -- aktivitas penatalaksanaan klinis (Tabel 18)
  'kasus'                -- pencatatan kasus/encounter (cakupan penyakit Tabel 10)
);

-- --- Peran residen pada tindakan ------------------------------------
create type surgical_role as enum (
  'operator_utama',
  'ko_operator',         -- ko-operator senior
  'asisten',
  'observer'
);

-- --- Status alur verifikasi -----------------------------------------
create type entry_status as enum (
  'draft',               -- belum diajukan
  'diajukan',            -- menunggu verifikasi supervisor
  'diverifikasi',        -- disetujui, dihitung ke progress
  'revisi',              -- dikembalikan untuk perbaikan
  'ditolak'
);

-- --- Tingkat supervisi / kemandirian (EPA-style) --------------------
-- Opsional, untuk menilai kemandirian selain jumlah kasus.
create type supervision_level as enum (
  'observasi',           -- hanya mengamati
  'dibantu_penuh',       -- dikerjakan dengan bimbingan langsung
  'dibantu_sebagian',    -- mandiri dengan supervisi tidak langsung
  'mandiri'              -- mandiri penuh
);

-- --- Jenis & kategori ujian pengetahuan -----------------------------
create type exam_type as enum ('osce', 'mcq');
create type knowledge_category as enum ('penatalaksanaan', 'prosedur');

-- --- Fungsi bantu: updated_at otomatis ------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- >>>>>>>>>> 0002_reference.sql <<<<<<<<<<
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

-- >>>>>>>>>> 0003_people.sql <<<<<<<<<<
-- =====================================================================
-- 0003_people.sql — Institusi, profil pengguna, residen, pembimbingan
-- =====================================================================

create table institutions (
  id        uuid primary key default gen_random_uuid(),
  nama      text not null,
  kota      text,
  aktif     boolean not null default true
);

-- Profil 1:1 dengan auth.users (Supabase Auth). Dibuat saat user mendaftar.
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null,
  email          citext unique,
  role           user_role not null default 'residen',
  institution_id uuid references institutions(id) on delete set null,
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Data khusus residen (subset profiles dgn role='residen').
create table residents (
  id                  uuid primary key references profiles(id) on delete cascade,
  no_peserta          text unique,            -- NIM/no. peserta PPDS
  angkatan            text,                   -- mis. "2024-1"
  tanggal_mulai       date,
  tanggal_target_lulus date,                  -- untuk proyeksi on-track
  semester_berjalan   int,
  status_studi        text default 'aktif',   -- aktif | cuti | lulus | mengundurkan diri
  created_at          timestamptz not null default now()
);

-- Penugasan pembimbing (residen bisa punya >1 supervisor; salah satu utama).
create table supervisor_assignments (
  id            uuid primary key default gen_random_uuid(),
  resident_id   uuid not null references residents(id) on delete cascade,
  supervisor_id uuid not null references profiles(id) on delete cascade,
  utama         boolean not null default false,
  mulai         date not null default current_date,
  selesai       date,
  unique (resident_id, supervisor_id)
);
create index on supervisor_assignments (supervisor_id);
create index on supervisor_assignments (resident_id);

-- >>>>>>>>>> 0004_entries.sql <<<<<<<<<<
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

-- >>>>>>>>>> 0005_assessments.sql <<<<<<<<<<
-- =====================================================================
-- 0005_assessments.sql — Nilai ujian pengetahuan (OSCE/MCQ)
-- =====================================================================

create table assessments (
  id                uuid primary key default gen_random_uuid(),
  resident_id       uuid not null references residents(id) on delete cascade,
  knowledge_item_id uuid references knowledge_items(id),  -- null = ujian gabungan/umum
  exam_type         exam_type not null,
  score             numeric(5,2) not null,                -- nilai mentah / persen
  max_score         numeric(5,2) default 100,
  -- persentase otomatis; lulus dihitung di view terhadap ambang knowledge_items
  persen            numeric(5,2) generated always as
                      (case when max_score > 0 then round(score / max_score * 100, 2) else null end) stored,
  exam_date         date not null,
  examiner_id       uuid references profiles(id),
  catatan           text,
  created_at        timestamptz not null default now()
);
create index on assessments (resident_id, exam_type);
create index on assessments (knowledge_item_id);

-- >>>>>>>>>> 0006_views.sql <<<<<<<<<<
-- =====================================================================
-- 0006_views.sql — View progress (mesin auto-agregasi)
-- Hanya entri berstatus 'diverifikasi' yang dihitung ke pencapaian.
-- =====================================================================

-- --- Progress prosedur (per residen x prosedur) ---------------------
-- Dihitung hanya bila peran residen termasuk peran_dihitung prosedur.
create view v_procedure_progress as
select
  r.id                                   as resident_id,
  p.id                                   as procedure_id,
  p.kode,
  p.nama,
  p.target_min,
  count(e.id) filter (
    where e.status = 'diverifikasi'
      and e.surgical_role = any (p.peran_dihitung)
  )                                      as jumlah_terverifikasi,
  count(e.id) filter (where e.status = 'diajukan')  as jumlah_menunggu,
  least(
    round(
      count(e.id) filter (
        where e.status = 'diverifikasi'
          and e.surgical_role = any (p.peran_dihitung)
      )::numeric / nullif(p.target_min, 0) * 100, 1
    ), 100
  )                                      as persen,
  (count(e.id) filter (
      where e.status = 'diverifikasi'
        and e.surgical_role = any (p.peran_dihitung)
   ) >= p.target_min)                    as tercapai
from residents r
cross join procedures p
left join log_entries e
  on e.resident_id = r.id and e.procedure_id = p.id and e.entry_type = 'prosedur'
group by r.id, p.id;

-- --- Progress penatalaksanaan (per residen x kompetensi) -----------
-- Sumber ganda: entri 'penatalaksanaan' langsung + prosedur yang dipetakan.
create view v_clinical_progress as
with kontribusi as (
  -- entri langsung
  select e.resident_id, e.clinical_competency_id as competency_id
  from log_entries e
  where e.entry_type = 'penatalaksanaan' and e.status = 'diverifikasi'
  union all
  -- kontribusi tak langsung dari prosedur yang dipetakan
  select e.resident_id, m.clinical_competency_id
  from log_entries e
  join procedure_clinical_map m on m.procedure_id = e.procedure_id
  where e.entry_type = 'prosedur' and e.status = 'diverifikasi'
)
select
  r.id                          as resident_id,
  c.id                          as competency_id,
  c.kode,
  c.komponen,
  c.target_min,
  count(k.*)                    as jumlah_terverifikasi,
  least(round(count(k.*)::numeric / nullif(c.target_min,0) * 100, 1), 100) as persen,
  (count(k.*) >= c.target_min)  as tercapai
from residents r
cross join clinical_competencies c
left join kontribusi k on k.resident_id = r.id and k.competency_id = c.id
group by r.id, c.id;

-- --- Progress pengetahuan (per residen x butir) --------------------
-- Memakai nilai TERBAIK per jenis ujian; lulus bila OSCE & MCQ >= ambang.
create view v_knowledge_progress as
select
  r.id                                  as resident_id,
  ki.id                                 as knowledge_item_id,
  ki.kode,
  ki.topik,
  ki.kategori,
  max(a.persen) filter (where a.exam_type = 'osce') as nilai_osce,
  max(a.persen) filter (where a.exam_type = 'mcq')  as nilai_mcq,
  ki.osce_min,
  ki.mcq_min,
  (coalesce(max(a.persen) filter (where a.exam_type='osce'),0) >= ki.osce_min
   and coalesce(max(a.persen) filter (where a.exam_type='mcq'),0) >= ki.mcq_min) as lulus
from residents r
cross join knowledge_items ki
left join assessments a on a.resident_id = r.id and a.knowledge_item_id = ki.id
group by r.id, ki.id;

-- --- Cakupan spektrum penyakit (per residen x penyakit) -----------
create view v_disease_coverage as
select
  r.id                       as resident_id,
  d.id                       as disease_id,
  d.no,
  d.nama_id,
  count(e.id) filter (where e.status = 'diverifikasi') as jumlah,
  (count(e.id) filter (where e.status = 'diverifikasi') > 0) as pernah_ditangani
from residents r
cross join diseases d
left join log_entries e on e.resident_id = r.id and e.disease_id = d.id
group by r.id, d.id;

-- --- Ringkasan kelulusan per residen ------------------------------
create view v_resident_summary as
select
  r.id as resident_id,
  (select count(*) from v_procedure_progress vp where vp.resident_id = r.id and vp.tercapai) as prosedur_tercapai,
  (select count(*) from procedures)                                                          as prosedur_total,
  (select count(*) from v_clinical_progress vc where vc.resident_id = r.id and vc.tercapai)  as penatalaksanaan_tercapai,
  (select count(*) from clinical_competencies)                                               as penatalaksanaan_total,
  (select count(*) from v_knowledge_progress vk where vk.resident_id = r.id and vk.lulus)    as pengetahuan_lulus,
  (select count(*) from knowledge_items)                                                     as pengetahuan_total,
  (select count(*) from v_disease_coverage vd where vd.resident_id = r.id and vd.pernah_ditangani) as penyakit_tercakup,
  (select count(*) from diseases)                                                            as penyakit_total
from residents r;

-- >>>>>>>>>> 0007_rls.sql <<<<<<<<<<
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

-- >>>>>>>>>> 0008_aggregation_views.sql <<<<<<<<<<
-- =====================================================================
-- 0008_aggregation_views.sql — Penyempurnaan view untuk aturan agregasi
-- peran_dihitung kosong ('{}') = prosedur non-bedah, dihitung tanpa
-- syarat peran. (Data peran_dihitung & pemetaan diisi di seed.sql.)
-- =====================================================================

create or replace view v_procedure_progress as
with q as (
  select
    r.id as resident_id,
    p.id as procedure_id, p.kode, p.nama, p.target_min, p.peran_dihitung,
    e.status, e.surgical_role, e.id as entry_id
  from residents r
  cross join procedures p
  left join log_entries e
    on e.resident_id = r.id and e.procedure_id = p.id and e.entry_type = 'prosedur'
)
select
  resident_id, procedure_id, kode, nama, target_min,
  count(entry_id) filter (
    where status = 'diverifikasi'
      and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
  ) as jumlah_terverifikasi,
  count(entry_id) filter (where status = 'diajukan') as jumlah_menunggu,
  least(round(
    count(entry_id) filter (
      where status = 'diverifikasi'
        and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
    )::numeric / nullif(target_min, 0) * 100, 1), 100) as persen,
  (count(entry_id) filter (
      where status = 'diverifikasi'
        and (cardinality(peran_dihitung) = 0 or surgical_role = any (peran_dihitung))
   ) >= target_min) as tercapai
from q
group by resident_id, procedure_id, kode, nama, target_min;

alter view v_procedure_progress set (security_invoker = on);

-- >>>>>>>>>> 0009_auth_trigger.sql <<<<<<<<<<
-- =====================================================================
-- 0009_auth_trigger.sql — Buat profil otomatis saat pengguna mendaftar
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'residen')
  );
  -- Bila peran residen, buat baris residents sekalian.
  if coalesce((new.raw_user_meta_data->>'role'), 'residen') = 'residen' then
    insert into public.residents (id) values (new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- >>>>>>>>>> 0010_penguji_access.sql <<<<<<<<<<
-- =====================================================================
-- 0010_penguji_access.sql — Penguji boleh membaca daftar residen & profil
-- (untuk memilih residen yang akan dinilai). Policy tambahan bersifat
-- permisif (digabung OR dengan policy lain).
-- =====================================================================

create policy "residen_baca_penguji" on residents for select to authenticated
  using (current_role_name() = 'penguji');

create policy "profil_baca_penguji" on profiles for select to authenticated
  using (current_role_name() = 'penguji');

-- >>>>>>>>>> 0011_subtargets.sql <<<<<<<<<<
-- =====================================================================
-- 0011_subtargets.sql — Penanda jenis dokumentasi & progress sub-target
-- Untuk PK-09: Presentasi MDT (>=20) & Breaking bad news (>=10).
-- =====================================================================

-- Jenis dokumentasi khusus pada entri penatalaksanaan PK-09.
create type dokumentasi_jenis as enum ('mdt', 'breaking_bad_news', 'handover', 'lainnya');

alter table log_entries
  add column dokumentasi_jenis dokumentasi_jenis;

-- Kode penghubung sub-target -> nilai enum entri.
alter table clinical_competency_subtargets
  add column kode text;

-- Backfill kode untuk sub-target yang sudah ada (cocokkan dari nama).
update clinical_competency_subtargets set kode = 'mdt'
  where lower(nama) like '%mdt%';
update clinical_competency_subtargets set kode = 'breaking_bad_news'
  where lower(nama) like '%breaking%';

-- View progress sub-target (per residen x sub-target), hanya entri diverifikasi.
create view v_subtarget_progress as
select
  r.id                          as resident_id,
  st.id                         as subtarget_id,
  c.kode                        as competency_kode,
  st.nama,
  st.kode                       as subtarget_kode,
  st.target_min,
  count(e.id) filter (where e.status = 'diverifikasi') as jumlah_terverifikasi,
  least(round(
    count(e.id) filter (where e.status = 'diverifikasi')::numeric
    / nullif(st.target_min, 0) * 100, 1), 100)         as persen,
  (count(e.id) filter (where e.status = 'diverifikasi') >= st.target_min) as tercapai
from residents r
cross join clinical_competency_subtargets st
join clinical_competencies c on c.id = st.competency_id
left join log_entries e
  on e.resident_id = r.id
  and e.entry_type = 'penatalaksanaan'
  and e.dokumentasi_jenis::text = st.kode
group by r.id, st.id, c.kode;

alter view v_subtarget_progress set (security_invoker = on);

-- >>>>>>>>>> 0012_per_entry_supervisor.sql <<<<<<<<<<
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

-- >>>>>>>>>> 0013_rumah_sakit.sql <<<<<<<<<<
-- =====================================================================
-- 0013_rumah_sakit.sql — Kolom Rumah Sakit (teks bebas) pada entri
-- Dua RS baku ditawarkan sebagai saran di UI; nama lain bebas diketik.
-- =====================================================================

alter table log_entries add column rumah_sakit text;

-- >>>>>>>>>> 0014_baca_verifikator.sql <<<<<<<<<<
-- =====================================================================
-- 0014_baca_verifikator.sql — Nama verifikator (supervisor/KPS/admin)
-- boleh dibaca semua pengguna login, agar tampil di riwayat verifikasi.
-- =====================================================================

create policy "profil_baca_verifikator" on profiles for select to authenticated
  using (role in ('supervisor', 'kps', 'admin'));

-- >>>>>>>>>> seed.sql <<<<<<<<<<
-- AUTO-GENERATED oleh scripts/generate-seed.mjs — JANGAN edit manual.
-- Sumber: data/*.json (Kepkonsil HK.01.02/KKI/1318/2026)
-- Idempoten: aman dijalankan ulang.

begin;

-- Tabel 10: penyakit
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (1, 'Kanker vulva', 'Malignant neoplasm of vulva', 'C51.*', '2C70.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (2, 'Kanker vagina', 'Malignant neoplasm of vagina', 'C52', '2C71.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (3, 'Kanker serviks uteri', 'Malignant neoplasm of cervix uteri', 'C53.*', '2C77.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (4, 'Kanker endometrium', 'Malignant neoplasm of endometrium', 'C54.1', '2C76.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (5, 'Leiomiosarkoma uteri', 'Uterine leiomyosarcoma', 'C54.2 ; C54.9', '2B58.1', 'sarkoma') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (6, 'Sarkoma stroma endometrium', 'Endometrial stromal sarcoma', 'C54.1', '2B5C', 'sarkoma') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (7, 'Rabdomiosarkoma (organ genital perempuan)', 'Rhabdomyosarcoma (female genital organs)', 'C55', '2B55.*', 'sarkoma') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (8, 'Adenosarkoma korpus uteri', 'Adenosarcoma of corpus uteri', 'C54.9', '2B5D.1', 'sarkoma') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (9, 'Karsinosarkoma uteri', 'Carcinosarcoma of uterus', 'C54.9', '2C76.43', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (10, 'Kanker tuba falopi', 'Malignant neoplasm of Fallopian tube', 'C57.0', '2C74.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (11, 'Kanker ovarium', 'Malignant neoplasm of ovary', 'C56', '2C73.*', 'kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (12, 'Penyakit trofoblastik maligna', 'Gestational trophoblastic neoplasia', 'C58', '2C75.0', 'trofoblastik') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (13, 'Koriokarsinoma', 'Choriocarcinoma', 'C58', '2C75.0', 'trofoblastik') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (14, 'Mola hidatidosa dengan komplikasi', 'Hydatidiform mole with complication', 'O01.* ; D39.2', 'JA02.*', 'trofoblastik') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (15, 'Lesi intraepitel skuamosa derajat rendah vulva (VIN I)', 'LSIL of vulva (VIN I)', 'N90.0', 'GA13.1', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (16, 'Karsinoma in situ vulva (HSIL / VIN II-III)', 'Carcinoma in situ of vulva (HSIL; VIN III)', 'D07.1', '2E67.1', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (17, 'Lesi intraepitel skuamosa derajat rendah vagina (VaIN I)', 'LSIL of vagina (VaIN I)', 'N89.0', 'GA14.6', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (18, 'Karsinoma in situ vagina (HSIL / VaIN II-III)', 'Carcinoma in situ of vagina (HSIL; VaIN III)', 'D07.2', '2E67.22', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (19, 'Lesi intraepitel skuamosa derajat rendah serviks (CIN I)', 'LSIL of cervix (CIN I)', 'N87.0', 'GA15.7', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (20, 'Lesi intraepitel skuamosa derajat tinggi serviks (HSIL / CIN II-III)', 'HSIL of cervix (CIS; CIN II-III)', 'D06.*', '2E66.2', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (21, 'Hiperplasia endometrium atipik', 'Endometrial hyperplasia, atypical', 'N85.1', 'GA16.0', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (22, 'Karsinoma in situ endometrium', 'Carcinoma in situ of endometrium', 'D07.0', '2E67.0', 'pra-kanker') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (23, 'Plasenta previa dengan kecurigaan akreta', 'Placenta praevia with suspected placenta accreta', 'O43.2 ; O44.* ; O72.*', 'JA8A.2', 'obstetri-onkologi') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (24, 'Skrining kanker payudara', 'Screening for malignant neoplasm of breast', 'Z12.3', 'QA09.3', 'skrining') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (25, 'Tumor epitel borderline ovarium', 'Borderline epithelial tumour of ovary', 'D39.1', '2F76', 'borderline') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (26, 'Ruptur uteri dengan penyulit lainnya', 'Uterine rupture with complication', 'O71.1 ; O72.*', 'JB0A.0 ; JB0A.1', 'obstetri-onkologi') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;
insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (27, 'Leiomioma uteri dengan penyulit lainnya', 'Uterine leiomyoma with complication', 'D25.*', '2E86.0', 'jinak-kompleks') on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;

-- Tabel 18: kompetensi penatalaksanaan
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-01', 1, 'Anamnesis', 'Anamnesis onkologi komprehensif: gejala konstitusional/organ-spesifik, ECOG, riwayat herediter (BRCA/Lynch), toksisitas terapi, isu fertilitas/kontrasepsi, nyeri-nutrisi-psikososial, red flags; informed consent singkat; ringkasan masalah.', 'Kelengkapan data kunci; identifikasi red flags; ECOG terdokumentasi.', 120, 'encounter anamnesis onkologi mandiri', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-02', 2, 'Pemeriksaan Fisik', 'Pemeriksaan umum & onkologi ginekologi (termasuk nodal basin, rektovaginal/EUA bila indikasi) dengan pendamping; aseptik; keselamatan/kenyamanan; dokumentasi.', 'Teknik benar & aman; temuan kunci (nodal/organ infiltration) teridentifikasi; dokumentasi lengkap.', 120, 'pemeriksaan fisik onkologi komprehensif', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-03', 3, 'Penentuan Kebutuhan Pemeriksaan Penunjang', 'Seleksi laboratorium, imaging (USG/CT/MRI/PET-CT), penanda tumor, histopatologi/IHC, biomarker (ER/PR, p16, p53, HER2, MMR/MSI, BRCA/HRD, PD-L1); prioritisasi biaya-manfaat; permintaan terstandar.', 'Ketepatan indikasi/prioritas; pemeriksaan tidak perlu minimal; pemesanan tepat waktu.', 80, 'keputusan paket work-up onkologi', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-04', 4, 'Interpretasi Hasil Pemeriksaan', 'Integrasi radiologi-patologi-biomarker; penetapan FIGO sementara; baseline RECIST; rekomendasi tindak lanjut.', 'Akurasi interpretasi; konsistensi staging klinis; rekomendasi tindak lanjut tepat.', 80, 'interpretasi terintegrasi', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-05', 5, 'Penetapan Diagnosis Kerja dan Banding', 'Problem list; primer vs metastasis/unknown primary/sinkron; pengelompokan risiko; penetapan FIGO; rasionalisasi banding.', 'Akurasi diagnosis kerja; daftar banding relevan; penetapan FIGO konsisten.', 80, 'penetapan diagnosis/staging', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-06', 6, 'Perencanaan Terapi (Farmakologis/Nonfarmakologis)', 'Rencana multimodal berbasis NCCN/ESGO/FIGO: urutan operasi-CT-RT/targeted-imuno/hormonal; fertility-sparing bila layak; pencegahan VTE/antiemetik; informed consent; koordinasi MDT.', 'Adherence guideline; kesalahan dosis/kontraindikasi minimal.', 50, 'rencana terapi individual', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-07', 7, 'Evaluasi Respon dan Penyesuaian Terapi', 'Penilaian respons RECIST; penilaian toksisitas; modifikasi dosis/jadwal; supportive care.', 'Klasifikasi RECIST tepat; penanganan toksisitas sesuai protokol; tindak lanjut tepat waktu.', 50, 'evaluasi respons/toksisitas', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-08', 8, 'Penetapan Prognosis', 'Faktor prognostik (stadium, grade, LVSI, nodal, biomarker/genetik); kelompok risiko; survivorship plan; indikasi paliatif.', 'Estimasi risiko konsisten dengan bukti; komunikasi prognosis jelas; rencana kontrol terdokumentasi.', 20, 'diskusi prognosis & rencana kontrol', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values ('PK-09', 9, 'Dokumentasi Medis dan Komunikasi Hasil', 'Rekam medis onkologi terstruktur (SOAP, staging, biomarker); ringkasan klinis; MDT tumor board; rujukan genetic counseling; breaking bad news; handover (SBAR).', 'Kelengkapan dokumentasi; presentasi MDT efektif; komunikasi hasil tepat waktu.', 150, 'entri/handover terverifikasi', false) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into clinical_competency_subtargets (competency_id, nama, kode, target_min) select id, 'Presentasi MDT', 'mdt', 20 from clinical_competencies where kode='PK-09' and not exists (select 1 from clinical_competency_subtargets st join clinical_competencies cc on cc.id=st.competency_id where cc.kode='PK-09' and st.nama='Presentasi MDT');
insert into clinical_competency_subtargets (competency_id, nama, kode, target_min) select id, 'Breaking bad news', 'breaking_bad_news', 10 from clinical_competencies where kode='PK-09' and not exists (select 1 from clinical_competency_subtargets st join clinical_competencies cc on cc.id=st.competency_id where cc.kode='PK-09' and st.nama='Breaking bad news');

-- Tabel 24: prosedur
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-01', 1, 'Diagnosis dan manajemen kanker ginekologi', 100, 'kasus baru', 'penanggung jawab utama', 'dengan verifikasi MDT', false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-02', 2, 'Ultrasonografi ginekologi onkologi (TA/TV, IOTA/ADNEX, Doppler)', 30, 'pemeriksaan + laporan', 'mandiri', 'Diverifikasi terhadap PDF asli: target ≥30.', false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-03', 3, 'Seksio sesarea pada kecurigaan plasenta akreta (PAS) dengan penyulit', 3, 'kasus PAS (SC ± histerektomi)', 'operator utama / ko-operator senior', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-04', 4, 'Ligasi arteri uterina asendens dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-05', 5, 'Ligasi arteri hipogastrika (iliaka interna) dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-06', 6, 'Histerektomi abdominal dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-07', 7, 'Salpingo-ooforektomi dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-08', 8, 'Kistektomi dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-09', 9, 'Miomektomi dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-10', 10, 'Reseksi adenomiosis dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-11', 11, 'Adesiolisis tajam dengan penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-12', 12, 'Destruksi lesi kondiloma di luar vulva pada organ reproduksi', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-13', 13, 'Sistoskopi dan/atau proktoskopi', 3, 'prosedur', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-14', 14, 'Biopsi kelenjar getah bening superfisial', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-15', 15, 'Aspirasi Jarum Halus (FNAB) dan biopsi trucut', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-16', 16, 'Kolposkopi dengan/tanpa biopsi (vulva/vagina/serviks)', 3, 'prosedur', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-17', 17, 'Eksisi/biopsi pada lesi vulva/vagina/serviks', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-18', 18, 'Eksisi tumor pada vulva/vagina (radikal, wide local excision)', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-19', 19, 'Vulvektomi sederhana/radikal', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-20', 20, 'Vaginektomi parsial/total/radikal', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-21', 21, 'Bedah rekonstruksi abdomen bawah dan regio genitalia', 2, 'rekonstruksi kompleks', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-22', 22, 'Diseksi/sampling KGB inguinofemoral (unilateral/bilateral)', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-23', 23, 'Polipektomi serviks', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-24', 24, 'Konisasi (CKC/LEEP/LEETZ/krioterapi)', 3, 'tindakan (bervariasi teknik)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-25', 25, 'Biopsi aspirasi endometrium', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-26', 26, 'Histeroskopi diagnostik/operatif dengan/tanpa penyulit', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-27', 27, 'Histerektomi sederhana/tipe I (laparotomi/laparoskopi)', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-28', 28, 'Salpingektomi dan/atau ooforektomi (uni/bilateral; laparotomi/laparoskopi)', 3, 'prosedur (bervariasi akses & sisi)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-29', 29, 'Kistektomi (uni/bilateral; laparotomi/laparoskopi)', 3, 'kistektomi kompleks', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-30', 30, 'Diseksi/sampling KGB pelvis dan/atau para-aorta (laparotomi/laparoskopi)', 3, 'prosedur', 'operator', '≥2 melibatkan para-aorta', false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-31', 31, 'Omentektomi infrakolik/suprakolik (laparotomi/laparoskopi)', 3, 'tindakan (bervariasi akses & tingkat)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-32', 32, 'Biopsi peritoneum/eksisi lesi peritoneum', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-33', 33, 'Appendektomi (dalam konteks onkologi)', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-34', 34, 'Surgical staging kanker ginekologi (ovarium/tuba/endometrium/serviks/vagina/vulva)', 3, 'staging kanker ovarium', 'operator', 'termasuk ≥2 fertility-sparing bila tersedia', false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-35', 35, 'Biopsi/debulking massa tumor ginekologi (laparotomi/laparoskopi)', 3, 'prosedur (beragam akses)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-36', 36, 'Operasi ultra-radikal (peritonektomi, stripping diafragma, reseksi usus, reseksi hati parsial, splenektomi, HIPEC)', 2, 'operasi multiperan', 'operator/ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-37', 37, 'Reseksi usus & anastomosis dalam onkologi', 2, 'tindakan', 'operator/ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-38', 38, 'Ureterolisis/rekonstruksi ureter dalam onkologi', 2, 'rekonstruksi kompleks', 'operator/ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-39', 39, 'Repair vaskular dalam onkologi', 2, 'tindakan', 'operator/ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-40', 40, 'Penjahitan laserasi usus atau kandung kemih', 3, 'repair', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-41', 41, 'Histerektomi radikal (tipe II/III/IV; laparotomi/laparoskopi)', 3, 'tindakan (bervariasi tipe & akses)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-42', 42, 'Histerektomi radikal (nerve-preserving)', 3, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-43', 43, 'Trakelektomi sederhana/radikal (laparotomi/laparoskopi/vaginal)', 2, 'tindakan (bervariasi pendekatan)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-44', 44, 'Oophoropexy (ovarian transposition)', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-45', 45, 'Parametrektomi (laparotomi/laparoskopi ultraradikal)', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-46', 46, 'Temporary Infrarenal Aortic Clamping (klem sementara aorta abdominalis)', 2, 'tindakan', 'operator/ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-47', 47, 'Prosedur LEER (Laterally Extended Endopelvic Resection)', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-48', 48, 'Eksenterasi pelvis (anterior/posterior/total)', 2, 'tindakan', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-49', 49, 'Operasi ginekologi dengan Robotic Surgery (MIS robotik)', 2, 'kasus robotik', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-50', 50, 'Sentinel Lymph Node (SLN) mapping & biopsi pada kanker ginekologi', 2, 'prosedur', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-51', 51, 'Histerektomi vaginal (sederhana/radikal, ±SO, ±kolporafi)', 2, 'tindakan (variasi kompleksitas)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-52', 52, 'Panikulektomi', 2, 'tindakan', 'operator atau ko-operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-53', 53, 'Kemoterapi, imunoterapi, terapi hormonal, terapi target', 3, 'siklus terapi sistemik (beragam modalitas)', 'penanggung jawab', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-54', 54, 'Penggunaan chemoport & pemberian kemoterapi', 2, 'sesi infus via port (akses/perawatan/pemberian)', 'operator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-55', 55, 'Koordinasi radioterapi pada kanker ginekologi', 3, 'paket RT (EBRT/brachy/konkomitan) hingga selesai', 'koordinator', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-56', 56, 'Terapi paliatif nyeri pada keganasan ginekologi dengan penyulit', 3, 'episode manajemen nyeri kompleks', 'penanggung jawab', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;
insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values ('PR-57', 57, 'Terapi paliatif nutrisi pada keganasan ginekologi dengan penyulit', 3, 'rencana nutrisi paliatif kompleks', 'penanggung jawab', null, false) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;

-- Tabel 30: pengetahuan penatalaksanaan
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-01', 'Anamnesis ginekologi-onkologi terstruktur', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-02', 'Pemeriksaan fisik ginekologi-onkologi', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-03', 'Pemilihan pemeriksaan penunjang (IHC/biomarker, CT/MRI/PET)', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-04', 'Interpretasi hasil pemeriksaan & baseline RECIST', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-05', 'Penetapan diagnosis kerja & banding (FIGO)', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-06', 'Perencanaan terapi (NCCN/ESGO/FIGO)', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-07', 'Evaluasi respon & penyesuaian terapi', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values ('KP-08', 'Penetapan prognosis & survivorship', 'penatalaksanaan', 70, 70) on conflict (kode) do update set topik=excluded.topik;

-- Tabel 36: pengetahuan prosedur (di-generate dari procedures)
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-01', 'Pengetahuan: Diagnosis dan manajemen kanker ginekologi', 'prosedur', id, 70, 70 from procedures where kode='PR-01' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-02', 'Pengetahuan: Ultrasonografi ginekologi onkologi (TA/TV, IOTA/ADNEX, Doppler)', 'prosedur', id, 70, 70 from procedures where kode='PR-02' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-03', 'Pengetahuan: Seksio sesarea pada kecurigaan plasenta akreta (PAS) dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-03' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-04', 'Pengetahuan: Ligasi arteri uterina asendens dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-04' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-05', 'Pengetahuan: Ligasi arteri hipogastrika (iliaka interna) dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-05' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-06', 'Pengetahuan: Histerektomi abdominal dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-06' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-07', 'Pengetahuan: Salpingo-ooforektomi dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-07' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-08', 'Pengetahuan: Kistektomi dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-08' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-09', 'Pengetahuan: Miomektomi dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-09' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-10', 'Pengetahuan: Reseksi adenomiosis dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-10' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-11', 'Pengetahuan: Adesiolisis tajam dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-11' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-12', 'Pengetahuan: Destruksi lesi kondiloma di luar vulva pada organ reproduksi', 'prosedur', id, 70, 70 from procedures where kode='PR-12' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-13', 'Pengetahuan: Sistoskopi dan/atau proktoskopi', 'prosedur', id, 70, 70 from procedures where kode='PR-13' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-14', 'Pengetahuan: Biopsi kelenjar getah bening superfisial', 'prosedur', id, 70, 70 from procedures where kode='PR-14' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-15', 'Pengetahuan: Aspirasi Jarum Halus (FNAB) dan biopsi trucut', 'prosedur', id, 70, 70 from procedures where kode='PR-15' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-16', 'Pengetahuan: Kolposkopi dengan/tanpa biopsi (vulva/vagina/serviks)', 'prosedur', id, 70, 70 from procedures where kode='PR-16' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-17', 'Pengetahuan: Eksisi/biopsi pada lesi vulva/vagina/serviks', 'prosedur', id, 70, 70 from procedures where kode='PR-17' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-18', 'Pengetahuan: Eksisi tumor pada vulva/vagina (radikal, wide local excision)', 'prosedur', id, 70, 70 from procedures where kode='PR-18' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-19', 'Pengetahuan: Vulvektomi sederhana/radikal', 'prosedur', id, 70, 70 from procedures where kode='PR-19' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-20', 'Pengetahuan: Vaginektomi parsial/total/radikal', 'prosedur', id, 70, 70 from procedures where kode='PR-20' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-21', 'Pengetahuan: Bedah rekonstruksi abdomen bawah dan regio genitalia', 'prosedur', id, 70, 70 from procedures where kode='PR-21' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-22', 'Pengetahuan: Diseksi/sampling KGB inguinofemoral (unilateral/bilateral)', 'prosedur', id, 70, 70 from procedures where kode='PR-22' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-23', 'Pengetahuan: Polipektomi serviks', 'prosedur', id, 70, 70 from procedures where kode='PR-23' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-24', 'Pengetahuan: Konisasi (CKC/LEEP/LEETZ/krioterapi)', 'prosedur', id, 70, 70 from procedures where kode='PR-24' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-25', 'Pengetahuan: Biopsi aspirasi endometrium', 'prosedur', id, 70, 70 from procedures where kode='PR-25' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-26', 'Pengetahuan: Histeroskopi diagnostik/operatif dengan/tanpa penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-26' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-27', 'Pengetahuan: Histerektomi sederhana/tipe I (laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-27' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-28', 'Pengetahuan: Salpingektomi dan/atau ooforektomi (uni/bilateral; laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-28' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-29', 'Pengetahuan: Kistektomi (uni/bilateral; laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-29' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-30', 'Pengetahuan: Diseksi/sampling KGB pelvis dan/atau para-aorta (laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-30' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-31', 'Pengetahuan: Omentektomi infrakolik/suprakolik (laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-31' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-32', 'Pengetahuan: Biopsi peritoneum/eksisi lesi peritoneum', 'prosedur', id, 70, 70 from procedures where kode='PR-32' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-33', 'Pengetahuan: Appendektomi (dalam konteks onkologi)', 'prosedur', id, 70, 70 from procedures where kode='PR-33' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-34', 'Pengetahuan: Surgical staging kanker ginekologi (ovarium/tuba/endometrium/serviks/vagina/vulva)', 'prosedur', id, 70, 70 from procedures where kode='PR-34' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-35', 'Pengetahuan: Biopsi/debulking massa tumor ginekologi (laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-35' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-36', 'Pengetahuan: Operasi ultra-radikal (peritonektomi, stripping diafragma, reseksi usus, reseksi hati parsial, splenektomi, HIPEC)', 'prosedur', id, 70, 70 from procedures where kode='PR-36' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-37', 'Pengetahuan: Reseksi usus & anastomosis dalam onkologi', 'prosedur', id, 70, 70 from procedures where kode='PR-37' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-38', 'Pengetahuan: Ureterolisis/rekonstruksi ureter dalam onkologi', 'prosedur', id, 70, 70 from procedures where kode='PR-38' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-39', 'Pengetahuan: Repair vaskular dalam onkologi', 'prosedur', id, 70, 70 from procedures where kode='PR-39' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-40', 'Pengetahuan: Penjahitan laserasi usus atau kandung kemih', 'prosedur', id, 70, 70 from procedures where kode='PR-40' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-41', 'Pengetahuan: Histerektomi radikal (tipe II/III/IV; laparotomi/laparoskopi)', 'prosedur', id, 70, 70 from procedures where kode='PR-41' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-42', 'Pengetahuan: Histerektomi radikal (nerve-preserving)', 'prosedur', id, 70, 70 from procedures where kode='PR-42' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-43', 'Pengetahuan: Trakelektomi sederhana/radikal (laparotomi/laparoskopi/vaginal)', 'prosedur', id, 70, 70 from procedures where kode='PR-43' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-44', 'Pengetahuan: Oophoropexy (ovarian transposition)', 'prosedur', id, 70, 70 from procedures where kode='PR-44' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-45', 'Pengetahuan: Parametrektomi (laparotomi/laparoskopi ultraradikal)', 'prosedur', id, 70, 70 from procedures where kode='PR-45' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-46', 'Pengetahuan: Temporary Infrarenal Aortic Clamping (klem sementara aorta abdominalis)', 'prosedur', id, 70, 70 from procedures where kode='PR-46' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-47', 'Pengetahuan: Prosedur LEER (Laterally Extended Endopelvic Resection)', 'prosedur', id, 70, 70 from procedures where kode='PR-47' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-48', 'Pengetahuan: Eksenterasi pelvis (anterior/posterior/total)', 'prosedur', id, 70, 70 from procedures where kode='PR-48' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-49', 'Pengetahuan: Operasi ginekologi dengan Robotic Surgery (MIS robotik)', 'prosedur', id, 70, 70 from procedures where kode='PR-49' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-50', 'Pengetahuan: Sentinel Lymph Node (SLN) mapping & biopsi pada kanker ginekologi', 'prosedur', id, 70, 70 from procedures where kode='PR-50' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-51', 'Pengetahuan: Histerektomi vaginal (sederhana/radikal, ±SO, ±kolporafi)', 'prosedur', id, 70, 70 from procedures where kode='PR-51' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-52', 'Pengetahuan: Panikulektomi', 'prosedur', id, 70, 70 from procedures where kode='PR-52' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-53', 'Pengetahuan: Kemoterapi, imunoterapi, terapi hormonal, terapi target', 'prosedur', id, 70, 70 from procedures where kode='PR-53' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-54', 'Pengetahuan: Penggunaan chemoport & pemberian kemoterapi', 'prosedur', id, 70, 70 from procedures where kode='PR-54' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-55', 'Pengetahuan: Koordinasi radioterapi pada kanker ginekologi', 'prosedur', id, 70, 70 from procedures where kode='PR-55' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-56', 'Pengetahuan: Terapi paliatif nyeri pada keganasan ginekologi dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-56' on conflict (kode) do update set topik=excluded.topik;
insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select 'KPR-57', 'Pengetahuan: Terapi paliatif nutrisi pada keganasan ginekologi dengan penyulit', 'prosedur', id, 70, 70 from procedures where kode='PR-57' on conflict (kode) do update set topik=excluded.topik;

-- Auto-agregasi: peran_dihitung override (prosedur non-bedah = {} hitung semua)
update procedures set peran_dihitung = '{}' where kode = 'PR-01';
update procedures set peran_dihitung = '{}' where kode = 'PR-02';
update procedures set peran_dihitung = '{}' where kode = 'PR-53';
update procedures set peran_dihitung = '{}' where kode = 'PR-54';
update procedures set peran_dihitung = '{}' where kode = 'PR-55';
update procedures set peran_dihitung = '{}' where kode = 'PR-56';
update procedures set peran_dihitung = '{}' where kode = 'PR-57';
update procedures set peran_dihitung = '{operator_utama}' where kode = 'PR-41';
update procedures set peran_dihitung = '{operator_utama}' where kode = 'PR-42';

-- Auto-agregasi: pemetaan prosedur -> kompetensi penatalaksanaan
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-01' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-02' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-03' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-04' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-05' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-06' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-08' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-01' and c.kode='PK-09' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-02' and c.kode='PK-03' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-02' and c.kode='PK-04' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-53' and c.kode='PK-06' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-53' and c.kode='PK-07' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-55' and c.kode='PK-06' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-55' and c.kode='PK-07' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-56' and c.kode='PK-08' on conflict do nothing;
insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode='PR-57' and c.kode='PK-08' on conflict do nothing;

commit;
