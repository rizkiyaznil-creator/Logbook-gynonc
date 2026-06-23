#!/usr/bin/env node
// Generate supabase/seed.sql dari data/programs/<kode>/*.json (sumber kebenaran).
// Platform multi-program: tiap folder di data/programs/ = satu program.
// Jalankan: node scripts/generate-seed.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const programsDir = join(root, 'data', 'programs');
const loadJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const q = (v) =>
  v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

// Daftar program (urut berdasar field "urutan", lalu kode).
const programs = readdirSync(programsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => existsSync(join(programsDir, d.name, 'program.json')))
  .map((d) => {
    const dir = join(programsDir, d.name);
    return { kode: d.name, dir, meta: loadJSON(join(dir, 'program.json')) };
  })
  .sort((a, b) => (a.meta.urutan ?? 99) - (b.meta.urutan ?? 99) || a.kode.localeCompare(b.kode));

let sql = `-- AUTO-GENERATED oleh scripts/generate-seed.mjs — JANGAN edit manual.
-- Sumber: data/programs/<kode>/*.json (Kepkonsil HK.01.02/KKI/1318/2026)
-- Platform multi-program. Idempoten: aman dijalankan ulang.
-- Prasyarat: migrasi 0023 (tabel programs + kolom program_id) sudah dijalankan.

begin;
`;

const stats = [];

for (const prog of programs) {
  const { kode, dir, meta } = prog;
  const PROG = `(select id from programs where kode=${q(kode)})`;
  const load = (f) => (existsSync(join(dir, f)) ? loadJSON(join(dir, f)) : null);

  const diseases = load('diseases.json');
  const clinical = load('clinical-management.json');
  const procedures = load('procedures.json');
  const knowledge = load('knowledge.json');
  const aggregation = load('aggregation-rules.json');

  const osce = knowledge?.ambang?.osce_min ?? 70;
  const mcq = knowledge?.ambang?.mcq_min ?? 70;

  sql += `\n\n-- #####################################################################`;
  sql += `\n-- ## PROGRAM: ${meta.nama} (${kode})`;
  sql += `\n-- #####################################################################\n`;

  // Program + config
  sql += `insert into programs (kode, nama, config) values (${q(kode)}, ${q(meta.nama)}, ${q(JSON.stringify(meta.config ?? {}))}::jsonb) on conflict (kode) do update set nama=excluded.nama, config=excluded.config;\n`;

  // Diseases
  if (diseases?.items?.length) {
    sql += `\n-- Spektrum penyakit\n`;
    for (const d of diseases.items) {
      sql += `insert into diseases (program_id, no, nama_id, nama_en, icd10, icd11, kelompok) values (${PROG}, ${d.no}, ${q(d.nama_id)}, ${q(d.nama_en)}, ${q(d.icd10)}, ${q(d.icd11)}, ${q(d.kelompok)}) on conflict (program_id, no) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, icd10=excluded.icd10, icd11=excluded.icd11, kelompok=excluded.kelompok;\n`;
    }
  }

  // Clinical competencies (+ sub-target)
  if (clinical?.items?.length) {
    sql += `\n-- Kompetensi penatalaksanaan\n`;
    for (const c of clinical.items) {
      sql += `insert into clinical_competencies (program_id, kode, no, komponen, penjabaran, kriteria_kinerja, target_min, satuan, perlu_verifikasi) values (${PROG}, ${q(c.kode)}, ${c.no}, ${q(c.komponen)}, ${q(c.penjabaran)}, ${q(c.kriteria_kinerja)}, ${c.target_min}, ${q(c.target_satuan)}, ${!!c.perlu_verifikasi}) on conflict (program_id, kode) do update set komponen=excluded.komponen, penjabaran=excluded.penjabaran, kriteria_kinerja=excluded.kriteria_kinerja, target_min=excluded.target_min, satuan=excluded.satuan, perlu_verifikasi=excluded.perlu_verifikasi;\n`;
      for (const s of c.sub_target || []) {
        sql += `insert into clinical_competency_subtargets (program_id, competency_id, nama, kode, target_min) select ${PROG}, id, ${q(s.nama)}, ${q(s.kode)}, ${s.target_min} from clinical_competencies where kode=${q(c.kode)} and program_id=${PROG} and not exists (select 1 from clinical_competency_subtargets st join clinical_competencies cc on cc.id=st.competency_id where cc.kode=${q(c.kode)} and cc.program_id=${PROG} and st.nama=${q(s.nama)});\n`;
      }
    }
  }

  // Procedures
  if (procedures?.items?.length) {
    sql += `\n-- Prosedur\n`;
    for (const p of procedures.items) {
      sql += `insert into procedures (program_id, kode, no, nama, target_min, satuan, peran_disyaratkan, syarat_tambahan, perlu_verifikasi) values (${PROG}, ${q(p.kode)}, ${p.no}, ${q(p.nama)}, ${p.target_min}, ${q(p.satuan)}, ${q(p.peran)}, ${q(p.syarat_tambahan)}, ${!!p.perlu_verifikasi}) on conflict (program_id, kode) do update set nama=excluded.nama, target_min=excluded.target_min, satuan=excluded.satuan, peran_disyaratkan=excluded.peran_disyaratkan, syarat_tambahan=excluded.syarat_tambahan, perlu_verifikasi=excluded.perlu_verifikasi;\n`;
    }
    // peran_dihitung: program "count_all_roles" → semua peran dihitung ('{}').
    if (meta.count_all_roles) {
      sql += `update procedures set peran_dihitung = '{}' where program_id = ${PROG};\n`;
    }
  }

  // Knowledge — penatalaksanaan (eksplisit) + prosedur (auto 1:1 dari procedures)
  if (knowledge?.pengetahuan_penatalaksanaan?.length) {
    sql += `\n-- Pengetahuan penatalaksanaan\n`;
    for (const k of knowledge.pengetahuan_penatalaksanaan) {
      sql += `insert into knowledge_items (program_id, kode, topik, kategori, osce_min, mcq_min) values (${PROG}, ${q(k.kode)}, ${q(k.topik)}, 'penatalaksanaan', ${osce}, ${mcq}) on conflict (program_id, kode) do update set topik=excluded.topik;\n`;
    }
  }
  if (procedures?.items?.length) {
    sql += `\n-- Pengetahuan prosedur (di-generate 1:1 dari procedures)\n`;
    for (const p of procedures.items) {
      const kk = 'K' + p.kode; // KPR-01..
      sql += `insert into knowledge_items (program_id, kode, topik, kategori, procedure_id, osce_min, mcq_min) select ${PROG}, ${q(kk)}, ${q('Pengetahuan: ' + p.nama)}, 'prosedur', id, ${osce}, ${mcq} from procedures where kode=${q(p.kode)} and program_id=${PROG} on conflict (program_id, kode) do update set topik=excluded.topik;\n`;
    }
  }

  // Auto-agregasi (opsional, khas program)
  if (aggregation) {
    const ov = aggregation.peran_dihitung_override || {};
    if ((ov.kosong_hitung_semua || []).length || (ov.operator_utama_saja || []).length) {
      sql += `\n-- Auto-agregasi: peran_dihitung override\n`;
      for (const kk of ov.kosong_hitung_semua || []) {
        sql += `update procedures set peran_dihitung = '{}' where kode = ${q(kk)} and program_id = ${PROG};\n`;
      }
      for (const kk of ov.operator_utama_saja || []) {
        sql += `update procedures set peran_dihitung = '{operator_utama}' where kode = ${q(kk)} and program_id = ${PROG};\n`;
      }
    }
    const map = aggregation.procedure_clinical_map || {};
    const keys = Object.keys(map).filter((k) => k !== 'catatan');
    if (keys.length) {
      sql += `\n-- Auto-agregasi: pemetaan prosedur -> kompetensi penatalaksanaan\n`;
      for (const pr of keys) {
        for (const pk of map[pr]) {
          sql += `insert into procedure_clinical_map (procedure_id, clinical_competency_id) select p.id, c.id from procedures p, clinical_competencies c where p.kode=${q(pr)} and p.program_id=${PROG} and c.kode=${q(pk)} and c.program_id=${PROG} on conflict do nothing;\n`;
        }
      }
    }
  }

  stats.push({
    kode,
    penyakit: diseases?.items?.length ?? 0,
    penatalaksanaan: clinical?.items?.length ?? 0,
    prosedur: procedures?.items?.length ?? 0,
    pengetahuan:
      (knowledge?.pengetahuan_penatalaksanaan?.length ?? 0) +
      (procedures?.items?.length ?? 0),
  });
}

sql += '\ncommit;\n';

writeFileSync(join(root, 'supabase', 'seed.sql'), sql);
console.log('supabase/seed.sql ditulis untuk', programs.length, 'program:');
for (const s of stats) {
  console.log(`  - ${s.kode}: ${s.penyakit} penyakit, ${s.penatalaksanaan} penatalaksanaan, ${s.prosedur} prosedur, ${s.pengetahuan} butir pengetahuan.`);
}
