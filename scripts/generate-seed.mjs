#!/usr/bin/env node
// Generate supabase/seed.sql dari data/*.json (sumber kebenaran tunggal).
// Jalankan: node scripts/generate-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const q = (v) =>
  v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) =>
  a && a.length ? `'{${a.join(',')}}'` : `'{}'`;

const diseases = load('diseases.json');
const clinical = load('clinical-management.json');
const procedures = load('procedures.json');
const knowledge = load('knowledge.json');
const aggregation = load('aggregation-rules.json');

let sql = `-- AUTO-GENERATED oleh scripts/generate-seed.mjs — JANGAN edit manual.
-- Sumber: data/*.json (Kepkonsil HK.01.02/KKI/1318/2026)
-- Idempoten: aman dijalankan ulang.

begin;

`;

// Diseases
sql += '-- Tabel 10: penyakit\n';
for (const d of diseases.items) {
  sql += `insert into diseases (no, nama_id, nama_en, icd10, icd11, kelompok) values (${d.no}, ${q(d.nama_id)}, ${q(d.nama_en)}, ${q(d.icd10)}, ${q(d.icd11)}, ${q(d.kelompok)}) on conflict (no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;\n`;
}

// Clinical competencies
sql += '\n-- Tabel 18: kompetensi penatalaksanaan\n';
for (const c of clinical.items) {
  sql += `insert into clinical_competencies (kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values (${q(c.kode)}, ${c.no}, ${q(c.komponen)}, ${q(c.penjabaran)}, ${q(c.kriteria_kinerja)}, ${c.target_min}, ${q(c.target_satuan)}, ${!!c.perlu_verifikasi}) on conflict (kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;\n`;
  for (const s of c.sub_target || []) {
    sql += `insert into clinical_competency_subtargets (competency_id, nama, target_min) select id, ${q(s.nama)}, ${s.target_min} from clinical_competencies where kode=${q(c.kode)} and not exists (select 1 from clinical_competency_subtargets st join clinical_competencies cc on cc.id=st.competency_id where cc.kode=${q(c.kode)} and st.nama=${q(s.nama)});\n`;
  }
}

// Procedures
sql += '\n-- Tabel 24: prosedur\n';
for (const p of procedures.items) {
  sql += `insert into procedures (kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values (${q(p.kode)}, ${p.no}, ${q(p.nama)}, ${p.target_min}, ${q(p.satuan)}, ${q(p.peran)}, ${q(p.syarat_tambahan)}, ${!!p.perlu_verifikasi}) on conflict (kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;\n`;
}

// Knowledge — penatalaksanaan
sql += '\n-- Tabel 30: pengetahuan penatalaksanaan\n';
for (const k of knowledge.pengetahuan_penatalaksanaan) {
  sql += `insert into knowledge_items (kode, topik, kategori, osce_min, mcq_min) values (${q(k.kode)}, ${q(k.topik)}, 'penatalaksanaan', ${knowledge.ambang.osce_min}, ${knowledge.ambang.mcq_min}) on conflict (kode) do update set topik=excluded.topik;\n`;
}
// Knowledge — prosedur (1:1 dgn procedures, prefiks K)
sql += '\n-- Tabel 36: pengetahuan prosedur (di-generate dari procedures)\n';
for (const p of procedures.items) {
  const kode = 'K' + p.kode; // KPR-01..
  sql += `insert into knowledge_items (kode, topik, kategori, procedure_id, osce_min, mcq_min) select ${q(kode)}, ${q('Pengetahuan: ' + p.nama)}, 'prosedur', id, ${knowledge.ambang.osce_min}, ${knowledge.ambang.mcq_min} from procedures where kode=${q(p.kode)} on conflict (kode) do update set topik=excluded.topik;\n`;
}

// Aturan auto-agregasi (kebijakan prodi) — dijalankan setelah referensi terisi
sql += '\n-- Auto-agregasi: peran_dihitung override (prosedur non-bedah = {} hitung semua)\n';
for (const kode of aggregation.peran_dihitung_override.kosong_hitung_semua) {
  sql += `update procedures set peran_dihitung = '{}' where kode = ${q(kode)};\n`;
}

sql += '\n-- Auto-agregasi: pemetaan prosedur -> kompetensi penatalaksanaan\n';
const map = aggregation.procedure_clinical_map;
for (const pr of Object.keys(map)) {
  if (pr === 'catatan') continue;
  for (const pk of map[pr]) {
    sql += `insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode=${q(pr)} and c.kode=${q(pk)} on conflict do nothing;\n`;
  }
}

sql += '\ncommit;\n';

writeFileSync(join(root, 'supabase', 'seed.sql'), sql);
console.log('supabase/seed.sql ditulis:',
  diseases.items.length, 'penyakit,',
  clinical.items.length, 'penatalaksanaan,',
  procedures.items.length, 'prosedur,',
  knowledge.pengetahuan_penatalaksanaan.length + procedures.items.length, 'butir pengetahuan.');
