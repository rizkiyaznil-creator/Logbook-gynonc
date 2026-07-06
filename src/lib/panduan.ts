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

// Berlaku untuk semua peran — ditambahkan ke akhir setiap panduan.
const ANTIBULLY_SECTION: GuideSection = {
  heading: "Komitmen anti-perundungan",
  body:
    "Sekali setiap hari saat pertama membuka aplikasi, tampil pernyataan Komitmen Anti-Perundungan. Bacalah, lalu tekan “Saya Berkomitmen” untuk melanjutkan. Pengingat ini berlaku untuk semua pengguna sebagai bagian dari budaya pendidikan yang aman dan saling menghormati.",
};

// Bagian panduan bersama untuk staf prodi berwewenang penuh (Ketua Prodi & SPS
// — wewenang identik). Disalin per-peran agar penambahan ANTIBULLY_SECTION tidak
// menggandakan pada array yang sama.
const PRODI_STAFF_SECTIONS: GuideSection[] = [
  { heading: "1. Masuk", steps: [LOGIN_STEP] },
  {
    heading: "2. Manajemen pengguna",
    steps: [
      "Buka menu Manajemen User.",
      "Tambah pengguna: Anda dapat membuat akun Residen (otomatis masuk prodi Anda), Penguji, dan DPJP/Supervisor. Isi nama, peran, email, dan password awal (min. 6 karakter), lalu beritahukan kredensial ke pengguna.",
      "Daftar pengguna menampilkan residen di prodi Anda (dapat dihapus) serta penguji & DPJP (baca-saja).",
    ],
    note: "Batas wewenang: Anda tidak dapat membuat akun Administrator atau staf prodi lain, tidak dapat mengubah peran siapa pun, dan hanya dapat menghapus residen di prodinya. Penguji/DPJP yang sudah ada tidak dapat diubah/dihapus. Semua akun dibuat di sini — tidak ada pendaftaran mandiri.",
  },
  {
    heading: "3. Verifikasi",
    body: "Buka menu Verifikasi untuk memutuskan entri & karya yang menunggu dari residen di prodi yang Anda kelola (Verifikasi / Minta revisi / Tolak).",
  },
  {
    heading: "4. Penilaian",
    body: "Melalui menu Penilaian, Anda juga dapat mencatat/mengelola penilaian pengetahuan residen di prodi Anda (mis. WBA/OSCE/MCQ).",
  },
  {
    heading: "5. Rekap & ekspor",
    steps: [
      "Buka menu Rekap untuk ringkasan capaian residen, beban verifikasi per DPJP, proyeksi kelulusan, dan rekap karya ilmiah — terbatas pada prodi Anda.",
      "Gunakan tombol Ekspor CSV untuk mengunduh data.",
    ],
  },
  {
    heading: "6. Kurikulum",
    body: "Menu Kurikulum menampilkan dan memungkinkan Anda mengelola data kompetensi (prosedur, penatalaksanaan, pengetahuan, spektrum penyakit) untuk prodi yang Anda kelola.",
  },
  {
    heading: "7. Audit Log",
    body: "Menu Audit Log menampilkan jejak aktivitas penting (pembuatan, pengajuan, dan keputusan verifikasi) di prodi Anda — siapa melakukan apa dan kapan.",
  },
];

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
          "Lini masa pendidikan menampilkan perkiraan kelulusan dan target tenggat berdasarkan tanggal mulai serta durasi program Anda.",
          "Periksa tabel kompetensi untuk melihat target yang sudah/ belum tercapai.",
          "Lonceng notifikasi di bilah atas memberi tahu saat ada keputusan verifikasi atas entri/karya Anda.",
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
      "Sebagai DPJP, Anda memverifikasi entri logbook dan karya ilmiah residen yang ditujukan kepada Anda. Keputusan Anda menentukan capaian kompetensi residen. Peran DPJP bersifat lintas-prodi — Anda menangani entri dari residen prodi mana pun yang memilih Anda.",
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
      "Sebagai penguji, Anda mencatat hasil penilaian pengetahuan residen (mis. WBA/OSCE/MCQ). Peran penguji bersifat lintas-prodi.",
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Memberi penilaian",
        steps: [
          "Buka menu Penilaian.",
          "Pilih residen dan butir pengetahuan yang dinilai (mis. WBA/OSCE/MCQ).",
          "Catat hasil dan simpan. Hasil otomatis masuk ke capaian Pengetahuan residen.",
        ],
      },
    ],
  },

  kps: {
    title: "Panduan Ketua Prodi",
    intro:
      "Sebagai Ketua Prodi, Anda mengelola pengguna, memantau capaian residen, memverifikasi, menilai, mengelola kurikulum, dan menelusuri jejak aktivitas. Seluruh wewenang Anda terbatas pada program studi yang Anda kelola; seorang Ketua Prodi dapat membawahi lebih dari satu prodi.",
    showStatus: true,
    sections: [...PRODI_STAFF_SECTIONS],
  },

  sps: {
    title: "Panduan SPS / Sekretaris Prodi",
    intro:
      "Sebagai SPS/Sekretaris Prodi, wewenang Anda identik dengan Ketua Prodi: mengelola pengguna, memverifikasi, menilai, mengelola kurikulum, rekap, dan audit — semuanya terbatas pada program studi yang Anda kelola (boleh lebih dari satu).",
    showStatus: true,
    sections: [...PRODI_STAFF_SECTIONS],
  },

  admin_prodi: {
    title: "Panduan Admin Prodi",
    intro:
      "Sebagai Admin Prodi, akses Anda bersifat READ-ONLY. Anda dapat memantau seluruh data di program studi yang ditugaskan, tetapi tidak dapat mengubah apa pun.",
    showStatus: true,
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Lingkup akses",
        body: "Semua akses Anda baca-saja dan terbatas pada program studi yang ditugaskan. Tombol/formulir untuk mengubah data tidak ditampilkan; percobaan mengubah data juga ditolak sistem.",
      },
      {
        heading: "3. Yang dapat Anda lihat",
        steps: [
          "Dashboard & Rekap capaian residen prodi Anda (termasuk Ekspor CSV).",
          "Antrean Verifikasi & daftar Penilaian — untuk memantau, tanpa memberi keputusan.",
          "Kurikulum prodi — melihat, tanpa menyunting.",
          "Audit Log aktivitas prodi Anda.",
          "Daftar Pengguna prodi Anda — tanpa membuat/mengubah/menghapus.",
        ],
      },
    ],
  },

  admin: {
    title: "Panduan Administrator",
    intro:
      "Sebagai Administrator (super-admin), Anda memiliki akses penuh lintas seluruh program studi: manajemen pengguna, pengaturan program/tenant, verifikasi, penilaian, kurikulum, rekap, audit, dan laporan platform.",
    showStatus: true,
    sections: [
      { heading: "1. Masuk", steps: [LOGIN_STEP] },
      {
        heading: "2. Manajemen pengguna",
        steps: [
          "Buka menu Manajemen User untuk menambah, mengubah peran, atau menghapus pengguna apa pun (semua peran, termasuk KPS dan Administrator).",
          "Saat menambah pengguna, isi nama, peran, email, dan password awal (min. 6 karakter). Untuk residen/KPS, pilih prodi rumahnya.",
          "Atur prodi yang dikelola tiap KPS (satu KPS dapat membawahi beberapa prodi) pada bagian pengelolaan KPS.",
        ],
        note: "Semua akun dibuat di sini; tidak ada pendaftaran mandiri.",
      },
      {
        heading: "3. Program & kurikulum",
        body: "Anda dapat mengelola daftar program studi (tenant) serta data kurikulum/kompetensi untuk semua prodi.",
      },
      {
        heading: "4. Verifikasi, Penilaian, Rekap & Audit",
        steps: [
          "Verifikasi & Penilaian: memutuskan dan menilai entri/karya seluruh prodi.",
          "Rekap: memantau capaian semua program & mengekspor CSV.",
          "Audit Log: menelusuri seluruh aktivitas lintas-prodi.",
        ],
      },
      {
        heading: "5. Laporan Platform",
        body: "Menu Laporan Platform menyajikan ringkasan agregat lintas seluruh program studi — khusus Administrator.",
      },
    ],
  },
};

// Tambahkan pengingat komitmen anti-perundungan ke akhir panduan semua peran.
for (const g of Object.values(GUIDES)) g.sections.push(ANTIBULLY_SECTION);

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
