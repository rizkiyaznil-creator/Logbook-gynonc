# Seed Data Kompetensi — Subspesialis Onkologi Ginekologi

Data fondasi untuk Logbook Interaktif PPDS Subspesialis Onkologi Ginekologi.
Diekstrak dari **Kepkonsil HK.01.02/KKI/1318/2026** (ditetapkan 7 Mei 2026).

## Berkas

| Berkas | Sumber | Isi | Jumlah |
|---|---|---|---|
| `diseases.json` | Tabel 10 | Spektrum penyakit + ICD-10/11 (katalog diagnosis) | 27 |
| `clinical-management.json` | Tabel 18 | Kompetensi penatalaksanaan klinis + target minimal | 9 |
| `procedures.json` | Tabel 24 | Kompetensi prosedur klinis + target minimal + syarat peran | 57 |
| `knowledge.json` | Tabel 30 & 36 | Penguasaan pengetahuan (ambang OSCE ≥70%, MCQ ≥70%) | 8 + 57 |

## ⚠️ Butir yang WAJIB diverifikasi ke PDF asli

Ekstraksi tabel dari PDF rawan salah pada angka. Cek minimal hal berikut:

1. **`procedures.json` → PR-02 (USG ginekologi onkologi):** target tertera `≥3`,
   kemungkinan besar salah ekstraksi (mungkin `≥30`). Ditandai `perlu_verifikasi: true`.
2. **Seluruh `target_min`** pada Tabel 18 & 24 — bandingkan satu per satu dengan PDF.
3. **Kode ICD-10/11** pada Tabel 10.

Setelah Anda verifikasi, cukup ubah angka di JSON; mesin progress akan otomatis menyesuaikan.

## Skema penghitungan (auto-agregasi)

- Tiap entri logbook dapat berkontribusi ke **beberapa** kompetensi sekaligus.
- Progress = (jumlah entri **terverifikasi** yang memenuhi syarat) / `target_min`.
- Untuk prosedur, entri hanya dihitung bila **peran** residen memenuhi `peran` yang disyaratkan.
- Status kelulusan komponen: tercapai bila progress ≥ 100% **dan** (untuk pengetahuan) OSCE & MCQ ≥ ambang.
