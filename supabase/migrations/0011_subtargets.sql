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
