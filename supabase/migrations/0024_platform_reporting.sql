-- =====================================================================
-- 0024_platform_reporting.sql — FASE 4: Laporan lintas-program (super-admin)
-- Acuan: docs/arsitektur-platform.md
--
-- Menambah view rollup tingkat-PROGRAM `v_program_overview` agar pemilik
-- platform (super-admin) dapat membandingkan seluruh program dalam satu
-- layar: jumlah residen, capaian agregat per domain, dan beban verifikasi.
--
-- Keamanan: view security_invoker. Bagian sensitif (residents/log_entries)
-- tetap tunduk RLS pemanggil → super-admin melihat semua program; KPS hanya
-- melihat angka programnya (program lain ter-nol-kan). Katalog kurikulum
-- (procedures/diseases/dst.) memang dapat dibaca semua login by design.
-- TANPA perubahan untuk user lama. Idempoten (create or replace).
-- =====================================================================

begin;

create or replace view v_program_overview as
select
  pr.id                                                                    as program_id,
  pr.kode,
  pr.nama,
  pr.config,
  pr.aktif,
  -- Populasi residen aktif terdaftar di program.
  (select count(*) from residents r where r.program_id = pr.id)            as residen_count,
  -- Ukuran kurikulum program (denominator target per residen).
  (select count(*) from procedures p where p.program_id = pr.id)           as prosedur_total,
  (select count(*) from clinical_competencies c where c.program_id = pr.id) as penatalaksanaan_total,
  (select count(*) from knowledge_items ki where ki.program_id = pr.id)    as pengetahuan_total,
  (select count(*) from diseases d where d.program_id = pr.id)             as penyakit_total,
  -- Capaian agregat: jumlah komponen tuntas di SELURUH residen program.
  (select coalesce(sum(s.prosedur_tercapai), 0)
     from v_resident_summary s join residents r on r.id = s.resident_id
     where r.program_id = pr.id)                                          as prosedur_tercapai,
  (select coalesce(sum(s.penatalaksanaan_tercapai), 0)
     from v_resident_summary s join residents r on r.id = s.resident_id
     where r.program_id = pr.id)                                          as penatalaksanaan_tercapai,
  (select coalesce(sum(s.pengetahuan_lulus), 0)
     from v_resident_summary s join residents r on r.id = s.resident_id
     where r.program_id = pr.id)                                          as pengetahuan_lulus,
  (select coalesce(sum(s.penyakit_tercakup), 0)
     from v_resident_summary s join residents r on r.id = s.resident_id
     where r.program_id = pr.id)                                          as penyakit_tercakup,
  -- Beban entri logbook.
  (select count(*) from log_entries e where e.program_id = pr.id)                                as entri_total,
  (select count(*) from log_entries e where e.program_id = pr.id and e.status = 'diajukan')      as entri_menunggu,
  (select count(*) from log_entries e where e.program_id = pr.id and e.status = 'diverifikasi')  as entri_terverifikasi
from programs pr;

alter view v_program_overview set (security_invoker = on);

commit;
