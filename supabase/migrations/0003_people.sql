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
