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
