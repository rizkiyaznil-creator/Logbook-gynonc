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
