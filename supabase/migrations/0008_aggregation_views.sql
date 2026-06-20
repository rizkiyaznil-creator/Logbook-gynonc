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
