import type { UserRole } from "@/lib/types";

export type GuideSection = {
  heading: string;
  body?: string;
  steps?: string[];
  note?: string;
};

export type Guide = {
  title: string;
  intro: string;
  sections: GuideSection[];
  showStatus?: boolean;
};

const LOGIN_STEP =
  "Masuk memakai email & kata sandi yang dibuatkan KPS/Admin. Lupa sandi? Gunakan tautan “Lupa kata sandi” di halaman masuk.";

const STATUS_NOTE =
  "Hanya laporan berstatus Terverifikasi yang dihitung sebagai capaian kompetensi.";

const GUIDES: Record<UserRole, Guide> = {
  residen: {
    title: "Panduan Residen",
    intro:
      "Sebagai residen, Anda mencatat kompetensi klinis (logbook) dan karya ilmiah, lalu mengajukannya ke DPJP/pembimbing untuk diverifikasi. Capaian dihitung otomatis dari entri yang terverifikasi.",
    showStatus: true,
    sections: [
      {
        heading: "1. Masuk & lengkapi profil",
        steps: [
          LOGIN_STEP,
          "Buka menu Profil, unggah foto, dan isi No. peserta, Angkatan, serta Tanggal mulai. Data ini muncul pada kop rekap/PDF.",
          "Bila perlu, atur ukuran teks di Profil → Tampilan (A− / A+); memperkecil membantu menampilkan lebih banyak kolom tabel di layar HP.",
        ],
      },
      {
        heading: "2. Menambah entri logbook",
        steps: [
          "Buka Entri Baru, pilih Jenis Entri: Prosedur (Tabel 24), Penatalaksanaan (Tabel 18), atau Kasus.",
          "Isi data umum: Tanggal, Setting, Rumah sakit, dan Pembimbing/DPJP (wajib saat diajukan).",
          "Lengkapi data sesuai jenis: prosedur (peran, tingkat kemandirian, komplikasi); penatalaksanaan (komponen + jenis dokumentasi); kasus (diagnosis & stadium FIGO).",
          "Isi kode pasien tersamar & usia, tambahkan catatan dan tautan bukti bila ada.",
          "Klik Simpan draft (masih bisa diubah) atau Ajukan untuk verifikasi (dikirim ke DPJP, status menjadi Menunggu).",
        ],
        note: "Entri yang sering berulang bisa disimpan sebagai template agar pengisian berikutnya lebih cepat.",
      },
      {
        heading: "3. Mengisi karya ilmiah",
        steps: [
          "Buka menu Karya Ilmiah dan pilih jenis: sari pustaka, telaah jurnal, laporan kasus, tesis, publikasi, atau presentasi.",
          "Tesis diisi per tahap: Proposal → Kaji etik → Pengumpulan data → Seminar hasil → Sidang.",
          "Publikasi & presentasi mencatat tingkat (nasional/internasional), nama jurnal/event, DOI/tautan, dan bentuk (oral/poster).",
          "Simpan draft atau Ajukan untuk verifikasi ke pembimbing.",
        ],
      },
      {
        heading: "4. Memantau capaian",
        steps: [
          "Dashboard menampilkan kartu capaian (prosedur, penatalaksanaan, pengetahuan, spektrum penyakit) dan ringkasan karya ilmiah.",
          "Periksa tabel kompetensi untuk melihat target yang sudah/ belum tercapai.",
        ],
        note: STATUS_NOTE,
      },
      {
        heading: "5. Menanggapi permintaan revisi",
        steps: [
          "Bila DPJP meminta revisi, statusnya menjadi Perlu revisi dan muncul catatan verifikator.",
          "Perbaiki entri/karya tersebut, lalu ajukan ulang.",
        ],
      },
      {
        heading: "6. Mencetak rekap (PDF)",
        steps: [
          "Buka Dashboard, gulir ke bagian bawah dokumen rekap.",
          "Klik Cetak / Simpan PDF, lalu pilih printer atau Save as PDF.",
        ],
      },
    ],
  },

  supervisor: {
    title: "Panduan Supervisor / DPJP",
    intro:
      "Sebagai DPJP, Anda memverifikasi entri logbook dan karya ilmiah residen yang ditujukan kepada Anda. Keputusan Anda menentukan capaian kompetensi residen.",
    showStatus: true,
    sections: [
      {
        heading: "1. Masuk",
        steps: [LOGIN_STEP],
      },
      {
        heading: "2. Memverifikasi entri & karya",
        steps: [
          "Buka menu Verifikasi. Tersedia dua bagian: Entri logbook menunggu dan Karya ilmiah menunggu (hanya item yang ditujukan kepada Anda).",
          "Periksa rincian dan bukti yang dilampirkan.",
          "Pilih keputusan dan tambahkan catatan bila perlu: Verifikasi (disetujui), Minta revisi (dikembalikan ke residen), atau Tolak.",
        ],
        note: "Badge angka pada menu Verifikasi menunjukkan jumlah item yang menunggu.",
      },
      {
        heading: "3. Notifikasi",
        body: "Anda menerima notifikasi saat residen mengajukan entri/karya, dan residen menerima notifikasi saat Anda memberi keputusan.",
      },
      {
        heading: "4. Melihat progres residen",
        steps: [
          "Buka Dashboard untuk melihat daftar residen, lalu pilih Lihat progress.",
          "Halaman detail residen dapat dicetak/disimpan sebagai PDF.",
        ],
      },
    ],
  },

  penguji: {
    title: "Panduan Penguji",
    intro:
      "Sebagai penguji, Anda mencatat hasil penilaian pengetahuan (OSCE/MCQ) residen.",
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Memberi penilaian",
        steps: [
          "Buka menu Penilaian.",
          "Pilih residen dan butir pengetahuan (OSCE/MCQ) yang dinilai.",
          "Catat hasil dan simpan. Hasil otomatis masuk ke capaian Pengetahuan residen.",
        ],
      },
    ],
  },

  kps: {
    title: "Panduan KPS / Admin Prodi",
    intro:
      "Sebagai KPS/Admin Prodi, Anda mengelola pengguna, memantau capaian seluruh residen, melakukan verifikasi, dan menelusuri jejak aktivitas.",
    showStatus: true,
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Manajemen pengguna",
        steps: [
          "Buka menu Manajemen User.",
          "Tambah pengguna: isi nama, peran (residen/supervisor/penguji/KPS/admin), email, dan password awal (min. 6 karakter). Beritahukan kredensial ke pengguna.",
          "Peran dapat diubah dan pengguna dapat dihapus dari halaman yang sama.",
        ],
        note: "Aplikasi tidak menyediakan pendaftaran mandiri — semua akun dibuat di sini.",
      },
      {
        heading: "3. Verifikasi",
        body: "Anda dapat membuka menu Verifikasi untuk melihat dan memutuskan seluruh entri & karya yang menunggu (tidak terbatas pada residen tertentu).",
      },
      {
        heading: "4. Rekap & ekspor",
        steps: [
          "Buka menu Rekap untuk ringkasan capaian seluruh residen, beban verifikasi per DPJP, proyeksi kelulusan, dan rekap karya ilmiah.",
          "Gunakan tombol Ekspor CSV untuk mengunduh data.",
        ],
      },
      {
        heading: "5. Audit Log",
        body: "Menu Audit Log menampilkan jejak seluruh aktivitas penting (pembuatan, pengajuan, dan keputusan verifikasi) — siapa melakukan apa dan kapan.",
      },
    ],
  },

  admin: {
    title: "Panduan Administrator",
    intro:
      "Sebagai Administrator, Anda memiliki akses penuh: manajemen pengguna, verifikasi, rekap, dan audit.",
    showStatus: true,
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Manajemen pengguna",
        steps: [
          "Buka menu Manajemen User untuk menambah, mengubah peran, atau menghapus pengguna.",
          "Saat menambah pengguna, isi nama, peran, email, dan password awal (min. 6 karakter).",
        ],
        note: "Semua akun dibuat di sini; tidak ada pendaftaran mandiri.",
      },
      {
        heading: "3. Verifikasi, Rekap & Audit",
        steps: [
          "Verifikasi: memutuskan seluruh entri & karya yang menunggu.",
          "Rekap: memantau capaian program & mengekspor CSV.",
          "Audit Log: menelusuri seluruh aktivitas.",
        ],
      },
    ],
  },
};

export function getGuide(role: UserRole): Guide {
  return GUIDES[role] ?? GUIDES.residen;
}

export const STATUS_LEGEND: { label: string; arti: string }[] = [
  { label: "Draft", arti: "Tersimpan, belum diajukan. Masih bisa diubah/dihapus." },
  { label: "Menunggu", arti: "Sudah diajukan, menunggu keputusan DPJP." },
  { label: "Terverifikasi", arti: "Disetujui DPJP; dihitung sebagai capaian." },
  { label: "Perlu revisi", arti: "Dikembalikan untuk diperbaiki; lihat catatan." },
  { label: "Ditolak", arti: "Tidak disetujui." },
];
